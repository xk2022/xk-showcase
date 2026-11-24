import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSha } from './release.mjs';
import { sourceEnvironment, validateReleaseEvidence } from './release-gate.mjs';
import { hubRepository, transportGate, transportRepository } from './transport-sync.mjs';
import { origin } from './static-export.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function validateTransportPlan(plan, manifest) {
  if (!Array.isArray(plan) || !Array.isArray(manifest)) throw new Error('Missing resolved source plan or Hub manifest');
  const matches = plan.filter(site => site.slug === 'truck-transport');
  const source = matches[0];
  if (matches.length !== 1 || source.repository !== transportRepository || !isSha(source.sha) || source.releaseGate?.workflow !== transportGate.workflow || source.releaseGate?.job !== transportGate.job) throw new Error('Transport tests require the exact trusted, release-gated source');
  validateReleaseEvidence(source, source.sha, source.release);
  const rows = manifest.filter(site => site.slug === source.slug);
  if (rows.length !== 1 || rows[0].repository !== source.repository || rows[0].sha !== source.sha) throw new Error('Hub dist transport does not match the resolved source SHA');
  return source;
}

export function transportTestEnvironment(environment, baseURL, cache) {
  return sourceEnvironment(environment, {
    CI: 'true', BASE_URL: baseURL, CANONICAL_BASE_URL: `${origin}/truck-transport/`,
    npm_config_cache: cache,
    ...(environment.PLAYWRIGHT_BROWSERS_PATH ? { PLAYWRIGHT_BROWSERS_PATH: environment.PLAYWRIGHT_BROWSERS_PATH } : {}),
  });
}

// Serve the full generated Hub root; no SPA fallback can conceal a broken deep route.
export async function createPreviewServer(directory) {
  const root = resolve(directory);
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const url = new URL(request.url, 'http://localhost');
      let file = resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      if (file !== root && !file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
      if ((await stat(file)).isDirectory()) {
        if (!url.pathname.endsWith('/')) { response.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end(); return; }
        file = join(file, 'index.html');
      }
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())) };
}

const run = (command, args, cwd, env) => new Promise((accept, reject) => {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? accept() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));
});

export async function testTransport({ planPath, dist = 'dist', installBrowsers = false }) {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) throw new Error('Run transport source tests without API credentials');
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const manifest = JSON.parse(await readFile(join(dist, 'manifest.json'), 'utf8'));
  const source = validateTransportPlan(plan, manifest);
  const work = await mkdtemp(join(tmpdir(), 'xk-transport-test-'));
  const checkout = join(work, 'source');
  let preview;
  try {
    await mkdir(checkout);
    preview = await createPreviewServer(dist);
    const environment = transportTestEnvironment(process.env, `${preview.url}/truck-transport/`, join(work, 'npm-cache'));
    await run('git', ['init', '--quiet'], checkout, environment);
    await run('git', ['remote', 'add', 'origin', `https://github.com/${source.repository}.git`], checkout, environment);
    await run('git', ['fetch', '--quiet', '--depth', '1', 'origin', source.sha], checkout, environment);
    await run('git', ['checkout', '--quiet', '--detach', 'FETCH_HEAD'], checkout, environment);
    // git show/checkout must use the resolved immutable object, never source main.
    const head = (await readFile(join(checkout, '.git/HEAD'), 'utf8')).trim();
    if (head !== source.sha) throw new Error('Transport test checkout SHA mismatch');
    await run('npm', ['ci'], checkout, environment);
    if (installBrowsers) await run('npx', ['playwright', 'install', '--with-deps', 'chromium', 'firefox', 'webkit'], checkout, environment);
    console.log(`Testing ${hubRepository} dist with ${source.repository}@${source.sha}`);
    await run('npm', ['test'], checkout, environment);
  } finally {
    if (preview) await preview.close();
    for (const [folder, output] of [['playwright-report', '.release/transport-report'], ['test-results', '.release/transport-test-results']]) {
      try { await cp(join(checkout, folder), output, { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/test-transport.mjs <resolved-sites.json> [--install-browsers]');
  await testTransport({ planPath: process.argv[2], installBrowsers: process.argv.includes('--install-browsers') });
}

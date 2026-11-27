import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSha } from './release.mjs';
import { sourceEnvironment, validateReleaseConfiguration, validateReleaseEvidence } from './release-gate.mjs';
import { hubRepository, transportGate, transportRepository } from './transport-sync.mjs';
import { origin, transportRoutes, validateExport } from './static-export.mjs';
import { materializeStaticArtifact } from './static-artifact.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export const preservedTransport = Object.freeze({
  sourceSha: '3506dbd7b66233168523e40d6ca387f8a961f237',
  baselineRun: '45564113822',
  sha256: '2869602b507f62a4ce7c5da56d8162282d4d48cebff6fc2b1c8ca3dffd829411',
  artifactUrl: 'https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/truck-transport-static.zip',
});
// A separately reviewed replacement, not a redefinition of the preserved run.
// Every field is fixed: source, public Release URL and ZIP digest must agree.
export const kaleidoscopeTransport = Object.freeze({
  sourceSha: '90a33add7d4ab6e71a28c47eb8183fe8c12cf907',
  artifactUrl: 'https://github.com/xk2022/xk-website-showcase/releases/download/truck-transport-90a33ad-v1/truck-transport-static.zip',
  sha256: '94971f455523bf85c10d5d0768f09471c69392688a73eb271ea0f2316f3eca1d',
  brand: '萬花筒運輸',
});

export function reviewedTransportIdentity(source) {
  if (source.sha === preservedTransport.sourceSha && source.staticArtifact?.url === preservedTransport.artifactUrl && source.staticArtifact.sha256 === preservedTransport.sha256) return preservedTransport;
  if (source.sha === kaleidoscopeTransport.sourceSha && source.staticArtifact?.url === kaleidoscopeTransport.artifactUrl && source.staticArtifact.sha256 === kaleidoscopeTransport.sha256) return kaleidoscopeTransport;
  throw new Error('Transport artifact must match an exact reviewed source, Release URL and digest');
}

const sameArtifact = (a, b) => a && b && ['url', 'sha256', 'sourceSha'].every(key => a[key] === b[key]) && Object.keys(a).length === 3 && Object.keys(b).length === 3;

export function validateTransportPlan(plan, manifest) {
  if (!Array.isArray(plan) || !Array.isArray(manifest)) throw new Error('Missing resolved source plan or Hub manifest');
  const matches = plan.filter(site => site.slug === 'truck-transport');
  const source = matches[0];
  if (matches.length !== 1 || source.repository !== transportRepository || !isSha(source.sha)) throw new Error('Transport tests require the exact trusted, release-gated source or preserved baseline artifact');
  const rows = manifest.filter(site => site.slug === source.slug);
  if (rows.length !== 1 || rows[0].repository !== source.repository || rows[0].sha !== source.sha) throw new Error('Hub dist transport does not match the resolved source SHA');
  if (source.staticArtifact) {
    validateReleaseConfiguration(source);
    reviewedTransportIdentity(source);
    if (source.ref !== source.sha || source.staticArtifact.sourceSha !== source.sha || source.release !== undefined || rows[0].release !== undefined || !sameArtifact(source.staticArtifact, rows[0].staticArtifact)) throw new Error('Transport artifact must match the exact reviewed snapshot and Hub manifest');
  } else {
    if (source.releaseGate?.workflow !== transportGate.workflow || source.releaseGate?.job !== transportGate.job || rows[0].staticArtifact !== undefined) throw new Error('Transport tests require the exact trusted, release-gated source');
    validateReleaseEvidence(source, source.sha, source.release);
  }
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

// The Hub may regenerate this one gallery image. Every runtime file, route,
// metadata file and original asset must otherwise match the reviewed archive.
export async function comparePreservedTransport(expected, actual) {
  async function files(root, relative = '') {
    const result = [];
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (name === '_showcase-preview.jpg' && entry.isFile()) continue;
      if (entry.isDirectory()) result.push(...await files(root, name));
      else if (entry.isFile()) result.push(name);
      else throw new Error('Transport output contains a symlink or unsupported entry');
    }
    return result.sort();
  }
  const expectedFiles = await files(expected);
  const actualFiles = await files(actual);
  if (JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) throw new Error('Transport output file inventory differs from preserved baseline');
  for (const name of expectedFiles) {
    if (!(await readFile(join(expected, name))).equals(await readFile(join(actual, name)))) throw new Error(`Transport runtime bytes differ from preserved baseline: ${name}`);
  }
  return { comparedFiles: expectedFiles.length, excludedGeneratedFile: '_showcase-preview.jpg', result: 'identical' };
}

// This validation is separate from byte identity: both must pass. Metadata is
// read from the served Hub output, without importing or fetching private source.
export function assertKaleidoscopeMetadata(metadata, route) {
  const canonical = `${origin}/truck-transport/${route}`;
  const social = `${origin}/truck-transport/images/social-card.jpg`;
  const oldBrand = /序程運輸|XUCHENG TRANSPORT/i;
  if (!metadata.title?.includes(kaleidoscopeTransport.brand) || oldBrand.test(metadata.title) || !metadata.description?.trim() || oldBrand.test(metadata.description)) throw new Error('Kaleidoscope page title/description has the wrong brand');
  const expected = { canonical, ogUrl: canonical, ogTitle: metadata.title, twitterTitle: metadata.title, ogDescription: metadata.description, twitterDescription: metadata.description, siteName: kaleidoscopeTransport.brand, ogImage: social, twitterImage: social, imageWidth: '1200', imageHeight: '630', twitterCard: 'summary_large_image' };
  for (const [key, value] of Object.entries(expected)) if (metadata[key] !== value) throw new Error(`Kaleidoscope metadata differs: ${key}`);
  const robots = (metadata.robots || '').toLowerCase().split(/[\s,]+/);
  if (!robots.includes('noindex') || !robots.includes('nofollow') || robots.includes('index') || robots.includes('follow')) throw new Error('Kaleidoscope noindex,nofollow is missing');
  if (!metadata.icon || metadata.icon.startsWith('//') || new URL(metadata.icon, canonical).href !== `${origin}/truck-transport/favicon.svg`) throw new Error('Kaleidoscope icon differs');
  if (!metadata.visibleText?.includes(kaleidoscopeTransport.brand) || oldBrand.test(metadata.visibleText)) throw new Error('Kaleidoscope visible brand is missing or contains the old name');
}

export function assertInquiryPrivacy({ requests, localStorage, sessionStorage, cookies, drafts }, localOrigin) {
  if (localStorage !== 0 || sessionStorage !== 0 || cookies.length) throw new Error('Transport inquiry wrote browser persistence');
  for (const request of requests) {
    const url = new URL(request.url);
    if (url.origin !== localOrigin || request.method !== 'GET' || request.postData !== null) throw new Error('Transport inquiry made an external or write request');
    const decoded = decodeURIComponent(request.url);
    if (drafts.some(draft => draft.trim() && decoded.includes(draft.trim()))) throw new Error('Transport inquiry draft appeared in a request URL');
  }
}

async function exerciseKaleidoscopeInquiry(page, context, base, width, reportDirectory) {
  const requests = [];
  const collect = request => requests.push({ url: request.url(), method: request.method(), postData: request.postData() });
  await page.goto(`${base}/truck-transport/inquiry/`, { waitUntil: 'load' });
  const field = page.getByRole('textbox', { name: '說明我的出貨需求 必填' });
  await field.waitFor({ state: 'visible' });
  if (await page.getByRole('textbox').count() !== 1 || await page.locator('input,select').count() !== 0 || !await field.evaluate(element => element.required)) throw new Error('Transport inquiry has additional required fields or no required description');
  page.on('request', collect);
  const examples = [
    ['固定配送示例', '我們每週有三天從工廠送到客戶倉庫，想找長期配合的車隊。'],
    ['單次出貨示例', '我有兩板貨要從 A 地送到 B 地，收貨現場沒有堆高機。'],
  ];
  const drafts = examples.map(([, text]) => text);
  drafts.push('兩板貨', '  兩板貨\n驗收代號：XK-KALEIDOSCOPE-LOCAL-ONLY  ');
  const preview = async text => {
    await page.getByRole('button', { name: '預覽詢價摘要', exact: true }).click();
    await page.getByRole('heading', { name: '模擬詢價摘要，僅供預覽', exact: true }).waitFor({ state: 'visible' });
    if (await page.getByTestId('inquiry-original').textContent() !== text) throw new Error('Transport inquiry preview altered the original text');
    if (!await page.getByRole('heading', { name: '後續可確認事項', exact: true }).isVisible()) throw new Error('Transport inquiry omitted separate follow-up questions');
    await page.getByRole('button', { name: '返回修改', exact: true }).click();
    await field.waitFor({ state: 'visible' });
    if (await field.inputValue() !== text) throw new Error('Transport inquiry return lost the draft');
  };
  try {
    for (const [label, text] of examples) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(expected => document.querySelector('#shipping-description')?.value === expected, text);
      await preview(text);
    }
    for (const text of drafts.slice(2)) { await field.fill(text); await preview(text); }
    await field.fill(' \n\t　');
    await page.getByRole('button', { name: '預覽詢價摘要', exact: true }).click();
    await page.locator('#description-error').waitFor({ state: 'visible' });
    if (!(await page.locator('#description-error').textContent()).includes('不能只輸入空白') || !await field.evaluate(element => element === document.activeElement)) throw new Error('Transport blank validation or focus failed');
    await field.fill(drafts.at(-1));
    await page.getByRole('button', { name: '預覽詢價摘要', exact: true }).click();
    await page.getByTestId('inquiry-original').waitFor({ state: 'visible' });
    await page.screenshot({ path: join(reportDirectory, `kaleidoscope-inquiry-${width}.png`), fullPage: true });
    await page.reload({ waitUntil: 'load' });
    await field.waitFor({ state: 'visible' });
    if (await field.inputValue() !== '' || await page.getByTestId('inquiry-original').count() !== 0) throw new Error('Transport inquiry refresh retained a draft');
    const storage = await page.evaluate(() => ({ localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
    const privacy = { ...storage, requests, cookies: await context.cookies(), drafts };
    assertInquiryPrivacy(privacy, base);
    return { width, status: 'PASS', scenarios: ['fixed sample', 'single sample', 'two pallets only', 'verbatim whitespace/newline', 'blank error/focus', 'return preserves draft', 'refresh clears', 'no persistence or draft transmission'], requestCount: requests.length, requests, localStorage: storage.localStorage, sessionStorage: storage.sessionStorage, cookies: privacy.cookies.length };
  } finally { page.off('request', collect); }
}

// These are fresh Hub-owned compiled-output checks, not the private source suite.
export async function smokePreservedTransport({ directory, reportDirectory, snapshot = preservedTransport }) {
  const { chromium } = await import('playwright');
  const preview = await createPreviewServer(directory);
  const kaleidoscope = snapshot === kaleidoscopeTransport;
  let browser;
  const errors = [];
  const checked = [];
  const interactions = [];
  try {
    await mkdir(reportDirectory, { recursive: true });
    browser = await chromium.launch({ headless: true, env: sourceEnvironment(process.env), ...(process.env.SHOWCASE_CHROMIUM_PATH ? { executablePath: process.env.SHOWCASE_CHROMIUM_PATH } : {}) });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`JavaScript: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`Console: ${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    page.on('requestfailed', request => errors.push(`Request failed: ${request.url()} (${request.failure()?.errorText})`));
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of transportRoutes) {
        const response = await page.goto(`${preview.url}/truck-transport/${route}`, { waitUntil: 'load' });
        if (response?.status() !== 200) throw new Error(`Transport route did not return 200: ${route}`);
        await page.locator('h1').waitFor({ state: 'visible' });
        if (await page.locator('h1').count() !== 1) throw new Error(`Transport route has no single visible H1: ${route}`);
        for (const image of await page.locator('img').all()) {
          if (!await image.isVisible()) continue;
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(async element => { if (!element.complete) await Promise.race([element.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), 10000))]); });
          if (!await image.evaluate(element => element.naturalWidth > 0)) throw new Error(`Transport image is broken: ${await image.getAttribute('src')}`);
        }
        const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        if (layout.document > layout.viewport + 1) throw new Error(`Transport horizontal overflow: ${route} at ${width}`);
        if (await page.locator('link[rel="canonical"]').getAttribute('href') !== `${origin}/truck-transport/${route}`) throw new Error(`Transport browser canonical differs: ${route}`);
        if (kaleidoscope) {
          const metadata = await page.evaluate(() => {
            const meta = key => document.querySelector(`meta[name="${key}"],meta[property="${key}"]`)?.getAttribute('content');
            return { title: document.title, description: meta('description'), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'), robots: meta('robots'), siteName: meta('og:site_name'), ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogUrl: meta('og:url'), ogImage: meta('og:image'), imageWidth: meta('og:image:width'), imageHeight: meta('og:image:height'), twitterTitle: meta('twitter:title'), twitterDescription: meta('twitter:description'), twitterCard: meta('twitter:card'), twitterImage: meta('twitter:image'), icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'), visibleText: document.body.innerText };
          });
          assertKaleidoscopeMetadata(metadata, route);
          if (!route) await page.screenshot({ path: join(reportDirectory, `kaleidoscope-home-${width}.png`), fullPage: true });
        }
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
        for (const href of links) {
          if (!href || /^(?:mailto:|tel:|https?:|#)/i.test(href)) continue;
          const target = new URL(href, page.url());
          if (target.origin !== preview.url || !(target.pathname === '/truck-transport' || target.pathname.startsWith('/truck-transport/'))) throw new Error(`Transport internal link escapes its case: ${href}`);
          const linked = await context.request.get(target.href);
          if (linked.status() !== 200) throw new Error(`Transport internal link is broken: ${href}`);
        }
        checked.push({ route: `/truck-transport/${route}`, width, status: 'PASS', ...(kaleidoscope ? { brand: kaleidoscopeTransport.brand, metadata: 'PASS' } : {}) });
      }
      if (kaleidoscope) interactions.push(await exerciseKaleidoscopeInquiry(page, context, preview.url, width, reportDirectory));
    }
    if (errors.length) throw new Error(`Transport compiled-output smoke errors: ${errors.join('; ')}`);
    return { kind: 'fresh Hub-owned compiled-output smoke', status: 'PASS', testedAt: new Date().toISOString(), browser: `Chromium ${browser.version()}`, checks: checked, ...(kaleidoscope ? { interactions } : {}), errors, limitations: 'The private source Playwright suite was not fetched or rerun. This is fresh Hub-owned compiled-output Chromium smoke at two widths, separate from preparation-time source-suite evidence.' };
  } catch (error) {
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(join(reportDirectory, 'static-smoke-failure.json'), JSON.stringify({ status: 'FAIL', error: error.message, checks: checked, interactions, errors }, null, 2) + '\n');
    throw error;
  } finally {
    if (browser) await browser.close();
    await preview.close();
  }
}

export function staticTransportReport(source, comparison, smoke) {
  const snapshot = reviewedTransportIdentity(source);
  const common = { sourceRepository: source.repository, sourceSha: source.sha, staticArtifact: source.staticArtifact, comparison, freshCompiledOutputSmoke: smoke };
  if (snapshot === preservedTransport) return {
    mode: 'preserved-static-artifact', ...common,
    historicalSourceSuite: { status: 'REUSED_NOT_RERUN', sourceSha: preservedTransport.sourceSha, runUrl: `https://github.com/${hubRepository}/actions/runs/${preservedTransport.baselineRun}`, basis: 'The exact previously public runtime bytes match the preserved baseline; only the Hub-generated gallery screenshot is excluded.' },
  };
  return {
    mode: 'reviewed-kaleidoscope-static-artifact', ...common,
    sourcePreparation: { status: 'RECORDED_SEPARATELY_NOT_QUERIED_OR_RERUN', sourceSha: snapshot.sourceSha, basis: 'Private source CI and the source-to-export relationship are preparation-review evidence recorded separately. The Hub verifies the exact reviewed public ZIP and assembled runtime bytes plus fresh compiled-output smoke; it does not reuse the old preserved source suite as approval for this replacement.' },
  };
}

export async function testTransport({ planPath, dist = 'dist', installBrowsers = false, fetchImpl = fetch, compiledSmoke = smokePreservedTransport, reportDirectory = '.release/transport-report', materializeArtifact = materializeStaticArtifact }) {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) throw new Error('Run transport source tests without API credentials');
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const manifest = JSON.parse(await readFile(join(dist, 'manifest.json'), 'utf8'));
  const source = validateTransportPlan(plan, manifest);
  const work = await mkdtemp(join(tmpdir(), 'xk-transport-test-'));
  const checkout = join(work, 'source');
  let preview;
  try {
    if (source.staticArtifact) {
      const baseline = join(work, 'reviewed-static-baseline');
      await materializeArtifact(source, baseline, { fetchImpl });
      await validateExport(baseline, source);
      await validateExport(join(dist, 'truck-transport'), source);
      const comparison = await comparePreservedTransport(baseline, join(dist, 'truck-transport'));
      const snapshot = reviewedTransportIdentity(source);
      const smoke = await compiledSmoke({ directory: dist, reportDirectory, snapshot });
      if (smoke?.status !== 'PASS') throw new Error('Transport compiled-output smoke did not pass');
      const report = staticTransportReport(source, comparison, smoke);
      await mkdir(reportDirectory, { recursive: true });
      await writeFile(join(reportDirectory, 'static-artifact.json'), JSON.stringify(report, null, 2) + '\n');
      console.log(snapshot === preservedTransport
        ? `Verified preserved transport ${source.sha}: exact runtime bytes and fresh Hub smoke; source suite reused from ${preservedTransport.baselineRun}, NOT rerun.`
        : `Verified reviewed Kaleidoscope transport ${source.sha}: exact approved ZIP/runtime bytes and fresh Hub brand/metadata/inquiry smoke; private source suite recorded separately, NOT rerun.`);
      return report;
    }
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

import { access, cp, mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const sites = JSON.parse(await readFile(new URL('../config/showcases.json', import.meta.url), 'utf8'));
const origin = 'https://showcase.xplorekaleidoscope.com';
const output = resolve('dist');
const seen = new Set();
for (const s of sites) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) || seen.has(s.slug) || !/^xk2022\/[a-zA-Z0-9_-]+$/.test(s.repository)) throw new Error('Invalid or duplicate showcase: ' + s.slug);
  seen.add(s.slug);
}
const work = await mkdtemp(join(tmpdir(), 'xk-showcase-'));
const staging = join(work, 'site');
const manifest = [];
const run = (cmd, args, cwd, env = process.env) => execFileSync(cmd, args, { cwd, env, stdio: 'inherit' });
const escape = (value) => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
try {
  await mkdir(staging);
  for (const s of sites) {
    const dir = join(work, s.slug);
    run('git', ['clone', '--depth', '1', '--branch', s.ref, `https://github.com/${s.repository}.git`, dir], work);
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    run('npm', ['ci'], dir);
    run('npm', ['run', 'build'], dir, { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...s.env });
    const html = await readFile(join(dir, 'out/index.html'), 'utf8');
    if (!html.includes(`/${s.slug}/_next/static/`) || !html.includes(`${origin}/${s.slug}/`)) throw new Error(`Invalid base path or canonical URL: ${s.slug}`);
    const resources = new Set([...html.matchAll(/(?:src|href)="(\/[^"#? ]+)(?:\?[^" ]*)?"/g)].map(m => m[1]));
    for (const resource of resources) {
      if (!resource.startsWith(`/${s.slug}/`)) throw new Error(`Asset escapes case path: ${resource}`);
      await access(join(dir, 'out', resource.slice(s.slug.length + 2)));
    }
    await access(join(dir, 'out/sitemap.xml'));
    await cp(join(dir, 'out'), join(staging, s.slug), { recursive: true });
    manifest.push({ slug: s.slug, repository: s.repository, sha });
  }
  const template = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const cards = sites.map(s => `<a class="card" href="./${s.slug}/"><small>${escape(s.category)}</small><h2>${escape(s.name)}</h2><span>瀏覽展示案例 →</span></a>`).join('\n');
  await writeFile(join(staging, 'index.html'), template.replace('<!-- SHOWCASES -->', cards));
  await writeFile(join(staging, 'robots.txt'), `User-agent: *\nAllow: /\n${sites.map(s => `Sitemap: ${origin}/${s.slug}/sitemap.xml`).join('\n')}\n`);
  await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(staging, '.nojekyll'), '');
  await rm(output, { recursive: true, force: true });
  await cp(staging, output, { recursive: true });
} finally {
  await rm(work, { recursive: true, force: true });
}

import { cp, mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSites, validateExport, buildRobots, renderCards, renderNotFound } from './static-export.mjs';

const sites = JSON.parse(await readFile(new URL('../config/showcases.json', import.meta.url), 'utf8'));
const output = resolve('dist');
validateSites(sites);
const work = await mkdtemp(join(tmpdir(), 'xk-showcase-'));
const staging = join(work, 'site');
const manifest = [];
const run = (cmd, args, cwd, env = process.env) => execFileSync(cmd, args, { cwd, env, stdio: 'inherit' });
try {
  await mkdir(staging);
  for (const s of sites) {
    const dir = join(work, s.slug);
    run('git', ['clone', '--depth', '1', '--branch', s.ref, `https://github.com/${s.repository}.git`, dir], work);
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    run('npm', ['ci'], dir);
    run('npm', ['run', 'build'], dir, { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...s.env });
    await validateExport(join(dir, 'out'), s);
    await cp(join(dir, 'out'), join(staging, s.slug), { recursive: true });
    manifest.push({ slug: s.slug, repository: s.repository, sha });
  }
  const template = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const cards = renderCards(sites);
  await writeFile(join(staging, 'index.html'), template.replace('<!-- SHOWCASES -->', cards));
  await writeFile(join(staging, 'robots.txt'), buildRobots(sites));
  await writeFile(join(staging, '404.html'), renderNotFound(sites));
  await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(staging, '.nojekyll'), '');
  await rm(output, { recursive: true, force: true });
  await cp(staging, output, { recursive: true });
} finally {
  await rm(work, { recursive: true, force: true });
}

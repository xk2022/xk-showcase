import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import { origin, validateSites, validateExport, validateLocalReferences, buildRobots, renderCards, renderNotFound } from '../scripts/static-export.mjs';

const proposal = { slug: 'yuan-guang-pcb', name: '元廣科技｜概念提案', category: '提案', repository: 'xk2022/xk-brand-yuan-guang-pcb', ref: 'main', framework: 'vite', indexable: false, listed: false };
const legacy = { slug: 'existing', name: 'Existing', category: 'Brand', repository: 'xk2022/existing', ref: 'main' };

function html(slug = proposal.slug, robots = 'noindex,nofollow', framework = 'vite') {
  const asset = framework === 'vite' ? 'assets' : '_next/static';
  return `<html><head><meta name="robots" content="${robots}"><link rel="canonical" href="${origin}/${slug}/"><link rel="stylesheet" href="/${slug}/${asset}/app.css"></head><body><script type="module" src="/${slug}/${asset}/app.js"></script><a href="/${slug}/about/?lang=en">About</a></body></html>`;
}

async function fixture(site = proposal) {
  const directory = await mkdtemp(join(tmpdir(), 'showcase-static-'));
  const asset = site.framework === 'vite' ? 'assets' : '_next/static';
  await mkdir(join(directory, asset), { recursive: true });
  await mkdir(join(directory, 'about'));
  await Promise.all([
    writeFile(join(directory, 'index.html'), html(site.slug, 'noindex,nofollow', site.framework || 'next')),
    writeFile(join(directory, 'about/index.html'), html(site.slug, 'noindex,nofollow', site.framework || 'next')),
    writeFile(join(directory, '404.html'), html(site.slug, 'noindex,nofollow', site.framework || 'next')),
    writeFile(join(directory, asset, 'app.js'), '/* app */'),
    writeFile(join(directory, asset, 'app.css'), '/* styles */'),
    ...(site.indexable !== false ? [writeFile(join(directory, 'sitemap.xml'), '<urlset/>')] : []),
  ]);
  return directory;
}

async function usingFixture(callback, site = proposal) {
  const directory = await fixture(site);
  try { await callback(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('registration accepts explicit Vite proposals and preserves Next defaults', () => {
  assert.doesNotThrow(() => validateSites([legacy, proposal]));
  for (const invalid of [{ ...proposal, slug: '../outside' }, { ...proposal, repository: 'outsider/project' }, { ...proposal, framework: 'unknown' }, { ...proposal, listed: 'false' }]) {
    assert.throws(() => validateSites([invalid]));
  }
  assert.throws(() => validateSites([proposal, proposal]), /duplicate/);
});

test('Vite proposal validates actual JS, CSS, directory routes and every HTML file', async () => {
  await usingFixture(async directory => {
    await validateExport(directory, proposal);
    await validateLocalReferences('<a href="#details">Details</a><img src="assets/app.js?version=1">', directory, proposal.slug);
  });
});

test('legacy Next export still requires _next/static assets and a sitemap', async () => {
  await usingFixture(async directory => {
    await validateExport(directory, legacy);
    await rm(join(directory, 'sitemap.xml'));
    await assert.rejects(validateExport(directory, legacy), /ENOENT/);
  }, legacy);
});

test('proposal rejects missing or contradictory robots on a nested page', async () => {
  await usingFixture(async directory => {
    await writeFile(join(directory, 'about/index.html'), html(proposal.slug, 'index,follow'));
    await assert.rejects(validateExport(directory, proposal), /Missing noindex,nofollow.*about/);
    await writeFile(join(directory, 'about/index.html'), html(proposal.slug).replace(/<meta[^>]+>/, ''));
    await assert.rejects(validateExport(directory, proposal), /Missing noindex,nofollow/);
  });
});

test('proposal rejects sitemap publication and missing actual Vite assets', async () => {
  await usingFixture(async directory => {
    await writeFile(join(directory, 'sitemap.xml'), '<urlset/>');
    await assert.rejects(validateExport(directory, proposal), /must not export sitemap/);
    await rm(join(directory, 'sitemap.xml'));
    await rm(join(directory, 'assets/app.css'));
    await assert.rejects(validateExport(directory, proposal), /ENOENT/);
  });
});

test('local references reject cross-site, protocol-relative and encoded traversal paths', async () => {
  await usingFixture(async directory => {
    for (const path of ['/other/app.js', '//evil.example/app.js', '/yuan-guang-pcb/%2e%2e/private.js', '/yuan-guang-pcb/%2f../private.js', '../private.js', '/yuan-guang-pcb/%5cprivate.js']) {
      await assert.rejects(validateLocalReferences(`<script src="${path}"></script>`, directory, proposal.slug));
    }
    await writeFile(join(directory, 'about/index.html'), html(proposal.slug) + '<img src="/other/missing.png">');
    await assert.rejects(validateExport(directory, proposal), /Asset escapes case path/);
  });
});

test('non-indexable unlisted proposals stay out of cards and sitemap references', () => {
  const sites = [legacy, proposal];
  assert.match(buildRobots(sites), /Disallow: \/yuan-guang-pcb\//);
  assert.match(buildRobots(sites), /Sitemap: .*\/existing\/sitemap.xml/);
  assert.doesNotMatch(buildRobots(sites), /yuan-guang-pcb\/sitemap/);
  assert.match(renderCards(sites), /Existing/);
  assert.doesNotMatch(renderCards(sites), /yuan-guang-pcb/);
});

test('root 404 uses a literal whitelisted subsite fallback and preserves only English selection', () => {
  const page = renderNotFound([legacy, proposal]);
  assert.match(page, /noindex,nofollow/);
  const code = page.match(/<script>([\s\S]*?)<\/script>/)[1];
  const route = (pathname, search) => {
    let result;
    runInNewContext(code, { location: { pathname, search, replace: value => { result = value; } }, URLSearchParams });
    return result;
  };
  assert.equal(route('/yuan-guang-pcb/missing/deep/', '?lang=en&next=https://evil.example'), '/yuan-guang-pcb/404.html?lang=en');
  assert.equal(route('/yuan-guang-pcb/missing/', '?lang=zh&data=secret'), '/yuan-guang-pcb/404.html');
  assert.equal(route('/existing/missing/', ''), undefined);
  assert.equal(route('//evil.example/yuan-guang-pcb/', '?lang=en'), undefined);
  assert.equal(route('/yuan-guang-pcb-evil/missing/', '?lang=en'), undefined);
});

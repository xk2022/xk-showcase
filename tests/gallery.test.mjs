import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderCards, renderGallery, validateSites, validateExport, origin } from '../scripts/static-export.mjs';

const app = { slug: 'app-preview', name: 'APP preview', category: 'APP', repository: 'xk2022/xk-app-preview', ref: 'main', framework: 'screen', indexable: false };

test('gallery shows screenshots and labels offline APP previews, while retaining hidden proposals', () => {
  const cards = renderCards([app, { ...app, slug: 'hidden', listed: false }]);
  assert.match(cards, /app-preview\/_showcase-preview\.jpg/);
  assert.match(cards, /查看畫面預覽/);
  assert.doesNotMatch(cards, /hidden/);
  assert.throws(() => validateSites([{ ...app, indexable: true }]), /non-indexable/);
  assert.throws(() => validateSites([{ ...app, repository: 'xk2022/xk-lp-preview' }]), /APP entries/);
});

test('gallery groups by type or shared brand, lists purposes, and hides unlisted sites in both views', () => {
  const lp = { slug: 'lp-demo', name: '導購', brand: '同品牌', purpose: '引導詢價', category: '導購', repository: 'xk2022/xk-lp-demo' };
  const brand = { ...lp, slug: 'brand-demo', name: '品牌官網', purpose: '建立信任', repository: 'xk2022/xk-brand-demo' };
  const html = renderGallery([lp, brand, { ...brand, slug: 'hidden', listed: false }, app]);
  assert.match(html, /id="view-type" checked/);
  assert.match(html, /依品牌/);
  assert.match(html, /LP｜一頁式網站/);
  assert.match(html, /同品牌 <small class="count">2 件/);
  assert.match(html, /引導詢價/);
  assert.match(html, /建立信任/);
  assert.equal((html.match(/href="\.\/lp-demo\/"/g) || []).length, 2);
  assert.equal((html.match(/href="\.\/app-preview\/"/g) || []).length, 1);
  assert.doesNotMatch(html, /hidden/);
});

test('brand view requires at least two listed works and does not count hidden works', () => {
  const first = { ...app, brand: '單件品牌' };
  const hidden = { ...first, slug: 'hidden', listed: false };
  const one = renderGallery([first, hidden]);
  assert.match(one, /目前尚無符合條件的品牌/);
  assert.equal((one.match(/href="\.\/app-preview\/"/g) || []).length, 1);
  const two = renderGallery([first, { ...first, slug: 'second' }, hidden]);
  assert.match(two, /單件品牌 <small class="count">2 件/);
  const three = renderGallery([first, { ...first, slug: 'second' }, { ...first, slug: 'third' }]);
  assert.match(three, /單件品牌 <small class="count">3 件/);
});

test('APP screenshot-only export has no sitemap and requires its local screenshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xk-gallery-test-'));
  try {
    await writeFile(join(dir, 'index.html'), `<html><head><link rel="canonical" href="${origin}/app-preview/"><meta name="robots" content="noindex,nofollow"></head><body><img src="./_showcase-preview.jpg"></body></html>`);
    await assert.rejects(validateExport(dir, app));
    await writeFile(join(dir, '_showcase-preview.jpg'), 'test fixture');
    await validateExport(dir, app);
    await writeFile(join(dir, 'sitemap.xml'), '');
    await assert.rejects(validateExport(dir, app), /must not export sitemap/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('interactive mode is limited to a gated synthetic Rotaract release', () => {
  const demo = { ...app, slug: 'rotaract', repository: 'xk2022/xk-app-rotaract', ref: 'a'.repeat(40), framework: 'interactive', env: { VITE_SHOWCASE_DEMO: 'true' }, releaseGate: { workflow: '.github/workflows/ci.yml', job: 'frontend' } };
  validateSites([demo]);
  assert.match(renderCards([demo]), /操作互動展示/);
  for (const bad of [{ ...demo, ref: 'main' }, { ...demo, env: {} }, { ...demo, slug: 'another-app' }, { ...demo, indexable: true }, { ...demo, releaseGate: undefined }]) assert.throws(() => validateSites([bad]), /Interactive preview/);
});


test('preserved interactive output accepts only the exact already-published Rotaract snapshot', () => {
  const sourceSha = 'fd8374eca0d840d64790552a6562e05c1a8bc76b';
  const site = { slug: 'rotaract', repository: 'xk2022/xk-app-rotaract', framework: 'interactive', indexable: false, ref: sourceSha, env: { VITE_SHOWCASE_DEMO: 'true' }, staticArtifact: { url: 'https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/rotaract-static.zip', sha256: 'a'.repeat(64), sourceSha } };
  assert.doesNotThrow(() => validateSites([site]));
  for (const changed of [
    { env: { VITE_SHOWCASE_DEMO: 'false' } },
    { indexable: true },
    { ref: 'b'.repeat(40), staticArtifact: { ...site.staticArtifact, sourceSha: 'b'.repeat(40) } },
    { staticArtifact: { ...site.staticArtifact, url: site.staticArtifact.url.replace('45564113822', '99999999999') } },
  ]) assert.throws(() => validateSites([{ ...site, ...changed }]));
});

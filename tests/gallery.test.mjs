import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderCards, renderGallery, validateSites, validateExport, buildRobots, origin } from '../scripts/static-export.mjs';

const app = { slug: 'app-preview', name: 'APP preview', category: 'APP', repository: 'xk2022/xk-app-preview', ref: 'main', framework: 'screen', indexable: false };

test('Hub branding uses the exact approved V2 assets and local gallery references', async () => {
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const assets = {
    'xk-logo-primary.svg': 'de812ceb8c4cd82834023e7c6b7c9681755542ba',
    'favicon.ico': 'b9da95d601e24907d6731aa18b20682808a204fd',
    'icon.svg': '759c0370142e6ae4f145a5120a42c93047bffa4d',
    'apple-icon.png': '8211b5332225dbb604559a50059fc9c796bb657b',
  };
  for (const [filename, expected] of Object.entries(assets)) {
    const bytes = await readFile(new URL(`../src/brand/v2/${filename}`, import.meta.url));
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(blob, expected, filename);
    assert.ok(html.includes(`"./_brand/v2/${filename}"`), filename);
  }
  assert.match(html, /<img class="brand-mark"[^>]+alt="Xplore Kaleidoscope">/);
});

test('listed concept proposals have a distinct notice and action while remaining excluded from indexing', () => {
  const proposal = { slug: 'yuan-guang-pcb', name: '元廣科技｜概念提案', category: '企業形象概念提案', repository: 'xk2022/xk-brand-yuan-guang-pcb', ref: 'a'.repeat(40), framework: 'vite', status: 'proposal', listed: true, indexable: false };
  validateSites([proposal]);
  const html = renderGallery([proposal]);
  assert.match(html, /href="\.\/yuan-guang-pcb\/"/);
  assert.match(html, /yuan-guang-pcb\/_showcase-preview\.jpg/);
  assert.match(html, /概念提案・非官方網站，未代表正式客戶委託。/);
  assert.match(html, /查看概念提案/);
  assert.doesNotMatch(html, /瀏覽展示案例/);
  assert.match(buildRobots([proposal]), /Disallow: \/yuan-guang-pcb\//);
  assert.doesNotMatch(buildRobots([proposal]), /Sitemap:/);
  assert.throws(() => validateSites([{ ...proposal, indexable: true }]), /must remain non-indexable/);
  assert.throws(() => validateSites([{ ...proposal, indexable: undefined }]), /must remain non-indexable/);
  assert.throws(() => validateSites([{ ...proposal, status: 'official-client' }]), /Unsupported showcase status/);
});

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

test('reviewed Rotaract static updates retain fixed identity, full provenance and demo controls', () => {
  const ref = 'b'.repeat(40);
  const site = { slug: 'rotaract', repository: 'xk2022/xk-app-rotaract', framework: 'interactive', indexable: false, ref, env: { VITE_SHOWCASE_DEMO: 'true' }, staticArtifact: { url: 'https://github.com/xk2022/xk-website-showcase/releases/download/rotaract-bbbbbbb-v1/rotaract-static.zip', sha256: 'a'.repeat(64), sourceSha: ref } };
  assert.doesNotThrow(() => validateSites([site]));
  for (const changed of [
    { repository: 'xk2022/xk-app-other' }, { slug: 'other' }, { indexable: true },
    { env: {} }, { env: { VITE_SHOWCASE_DEMO: 'false' } }, { ref: 'main' },
    { staticArtifact: undefined }, { staticArtifact: { ...site.staticArtifact, sourceSha: 'c'.repeat(40) } },
    { staticArtifact: { ...site.staticArtifact, sha256: 'invalid' } },
    { staticArtifact: { ...site.staticArtifact, url: site.staticArtifact.url.replace('bbbbbbb', 'ccccccc') } },
    { staticArtifact: { ...site.staticArtifact, url: site.staticArtifact.url.replace('rotaract-static', 'other-static') } },
    { staticArtifact: { ...site.staticArtifact, url: site.staticArtifact.url.replace('xk-website-showcase', 'other-hub') } },
    { releaseGate: { workflow: '.github/workflows/ci.yml', job: 'frontend' } },
  ]) assert.throws(() => validateSites([{ ...site, ...changed }]));
});

test('legacy apparel repository is a non-indexable APP screenshot, not a separate type', () => {
  const apparel = { ...app, slug: 'apparel-store', repository: 'xk2022/codex-xk-apparel-store' };
  validateSites([apparel]);
  const html = renderGallery([app, apparel]);
  assert.match(html, /APP｜應用系統 <small class="count">2 件/);
  assert.doesNotMatch(html, /XK｜其他網站/);
  assert.match(buildRobots([apparel]), /Disallow: \/apparel-store\//);
  assert.throws(() => validateSites([{ ...apparel, indexable: true }]), /non-indexable/);
});

test('Little Me owner demo accepts its reviewed static release only', () => {
  const ref='a'.repeat(40);
  const site={slug:'little-me-owner-demo',repository:'xk2022/xk-app-little-me-inventory',
    ref,framework:'interactive',indexable:false,staticArtifact:{sourceSha:ref,sha256:'b'.repeat(64),
      url:'https://github.com/xk2022/xk-website-showcase/releases/download/little-me-owner-demo-aaaaaaa-v1/little-me-owner-demo-static.zip'}};
  assert.doesNotThrow(()=>validateSites([site]));
  for(const change of [{indexable:true},{ref:'main'},{staticArtifact:undefined},{repository:'xk2022/xk-app-other'},
    {staticArtifact:{...site.staticArtifact,url:site.staticArtifact.url.replace('aaaaaaa','bbbbbbb')}}]){
    assert.throws(()=>validateSites([{...site,...change}]));
  }
});

const logisticsDemo = {
  slug: 'logistics', name: 'XK Logistics｜合成互動展示', category: 'APP',
  repository: 'xk2022/xk-app-logistics', ref: 'a'.repeat(40),
  framework: 'interactive', indexable: false,
  env: { VITE_SHOWCASE_DEMO: 'true' },
  releaseGate: { workflow: '.github/workflows/ci.yml', job: 'Frontend quality' },
};

test('Logistics Git-built demo is interactive in the APP gallery and remains excluded from indexing', () => {
  assert.doesNotThrow(() => validateSites([app, logisticsDemo]));
  assert.doesNotThrow(() => validateSites([{ ...logisticsDemo, ref: '0123456789abcdef0123456789abcdef01234567' }]));
  const cards = renderCards([logisticsDemo]);
  assert.match(cards, /href="\.\/logistics\/"/);
  assert.match(cards, /logistics\/_showcase-preview\.jpg/);
  assert.match(cards, /操作互動展示/);
  assert.doesNotMatch(cards, /查看畫面預覽/);
  assert.match(renderGallery([logisticsDemo]), /APP｜應用系統/);
  const robots = buildRobots([logisticsDemo]);
  assert.match(robots, /Disallow: \/logistics\//);
  assert.doesNotMatch(robots, /Sitemap:/);
});

test('Logistics interactive approval cannot be transferred to a different identity, mutable ref or indexed export', async t => {
  const changes = [
    ['another APP repository', { repository: 'xk2022/xk-app-other' }],
    ['another repository owner', { repository: 'other/xk-app-logistics' }],
    ['repository case variation', { repository: 'xk2022/XK-app-logistics' }],
    ['another slug', { slug: 'logistics-copy' }],
    ['Rotaract identity substitution', { slug: 'rotaract' }],
    ['mutable branch', { ref: 'main' }],
    ['abbreviated commit', { ref: 'a'.repeat(39) }],
    ['overlong commit', { ref: 'a'.repeat(41) }],
    ['uppercase commit', { ref: 'A'.repeat(40) }],
    ['non-hex commit', { ref: 'g'.repeat(40) }],
    ['indexing enabled', { indexable: true }],
    ['indexing approval omitted', { indexable: undefined }],
    ['demo environment omitted', { env: undefined }],
    ['demo flag omitted', { env: {} }],
    ['demo flag disabled', { env: { VITE_SHOWCASE_DEMO: 'false' } }],
    ['boolean flag instead of exact build environment', { env: { VITE_SHOWCASE_DEMO: true } }],
  ];
  for (const [name, change] of changes) {
    await t.test(name, () => assert.throws(() => validateSites([{ ...logisticsDemo, ...change }])));
  }
});

test('Logistics requires its exact frontend release gate and cannot use an interactive static archive', async t => {
  const changes = [
    ['release gate omitted', { releaseGate: undefined }],
    ['different workflow', { releaseGate: { workflow: '.github/workflows/release.yml', job: 'Frontend quality' } }],
    ['different frontend job', { releaseGate: { workflow: '.github/workflows/ci.yml', job: 'frontend' } }],
    ['job case variation', { releaseGate: { workflow: '.github/workflows/ci.yml', job: 'frontend quality' } }],
    ['extra gate field', { releaseGate: { ...logisticsDemo.releaseGate, allowFailure: true } }],
    ['alternate gate keys', { releaseGate: { workflowId: '.github/workflows/ci.yml', job: 'Frontend quality' } }],
    ['reviewed archive mechanism', { staticArtifact: {
      sourceSha: logisticsDemo.ref, sha256: 'b'.repeat(64),
      url: 'https://github.com/xk2022/xk-website-showcase/releases/download/logistics-aaaaaaa-v1/logistics-static.zip',
    } }],
    ['explicit null archive', { staticArtifact: null }],
  ];
  for (const [name, change] of changes) {
    await t.test(name, () => assert.throws(() => validateSites([{ ...logisticsDemo, ...change }])));
  }
});

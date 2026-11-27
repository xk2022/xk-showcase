import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createPreviewServer, transportTestEnvironment, validateTransportPlan, testTransport, comparePreservedTransport, preservedTransport, kaleidoscopeTransport, reviewedTransportIdentity, staticTransportReport, assertKaleidoscopeMetadata, assertInquiryPrivacy } from '../scripts/test-transport.mjs';
import { origin, transportRoutes } from '../scripts/static-export.mjs';
import { transportGate, transportRepository } from '../scripts/transport-sync.mjs';

const sha = 'a'.repeat(40);
const source = { slug: 'truck-transport', repository: transportRepository, ref: sha, sha, releaseGate: transportGate, release: { sha, ...transportGate, run_id: 41, run_attempt: 1 } };
const manifest = [{ slug: source.slug, repository: source.repository, sha }];

test('transport runner requires an exact verified checkout matching the actual Hub artifact', () => {
  assert.equal(validateTransportPlan([source], manifest).sha, sha);
  for (const changed of [{ ...source, sha: 'main' }, { ...source, repository: 'outsider/fork' }, { ...source, releaseGate: undefined }, { ...source, release: undefined }]) assert.throws(() => validateTransportPlan([changed], manifest));
  assert.throws(() => validateTransportPlan([source], [{ ...manifest[0], sha: 'b'.repeat(40) }]), /does not match/);
  assert.throws(() => validateTransportPlan([source, source], manifest), /exact trusted/);
});

test('source test processes receive local Hub URLs and public config without job credentials', () => {
  const env = transportTestEnvironment({ PATH: '/usr/bin', HOME: '/tmp/runner', GH_TOKEN: 'private', GITHUB_TOKEN: 'private', ACTIONS_RUNTIME_TOKEN: 'private', PRIVATE_KEY: 'private', PLAYWRIGHT_BROWSERS_PATH: '/tmp/browsers' }, 'http://127.0.0.1:49000/truck-transport/', '/tmp/cache');
  assert.equal(env.CI, 'true');
  assert.equal(env.BASE_URL, 'http://127.0.0.1:49000/truck-transport/');
  assert.equal(env.CANONICAL_BASE_URL, 'https://showcase.xplorekaleidoscope.com/truck-transport/');
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, '/tmp/browsers');
  assert.equal(env.npm_config_cache, '/tmp/cache');
  assert.doesNotMatch(JSON.stringify(env), /private/);
});

test('transport runner fails before file/network access if a source job receives API credentials', async () => {
  const before = process.env.GH_TOKEN;
  process.env.GH_TOKEN = 'synthetic-secret';
  try { await assert.rejects(testTransport({ planPath: '/nonexistent/plan.json' }), /without API credentials/); }
  finally { if (before === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = before; }
});

test('Hub preview serves real project files, exact MIME, HEAD and redirects without a fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xk-hub-server-test-'));
  let preview;
  try {
    await mkdir(join(root, 'truck-transport', 'inquiry'), { recursive: true });
    await writeFile(join(root, 'truck-transport', 'index.html'), '<h1>Transport</h1>');
    await writeFile(join(root, 'truck-transport', 'inquiry', 'index.html'), '<h1>Inquiry</h1>');
    await writeFile(join(root, 'truck-transport', 'favicon.svg'), '<svg/>');
    await writeFile(join(root, 'truck-transport', 'social.jpg'), 'image');
    preview = await createPreviewServer(root);
    const response = await fetch(`${preview.url}/truck-transport/inquiry/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Inquiry/);
    const redirect = await fetch(`${preview.url}/truck-transport/inquiry?lang=en`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/truck-transport/inquiry/?lang=en');
    const icon = await fetch(`${preview.url}/truck-transport/favicon.svg`, { method: 'HEAD' });
    assert.equal(icon.headers.get('content-type'), 'image/svg+xml');
    assert.equal(await icon.text(), '');
    assert.equal((await fetch(`${preview.url}/truck-transport/social.jpg`)).headers.get('content-type'), 'image/jpeg');
    assert.equal((await fetch(`${preview.url}/truck-transport/missing/`)).status, 404);
    assert.equal((await fetch(`${preview.url}/truck-transport/`, { method: 'POST', body: 'do not accept' })).status, 405);
    assert.equal((await fetch(`${preview.url}/%2f..%2foutside`)).status, 404);
  } finally { if (preview) await preview.close(); await rm(root, { recursive: true, force: true }); }
});

function preservedFixture() {
  const entries = {
    '_next/static/app.js': '/* compiled browser code; the runner never executes this file as Node */',
    'images/social-card.jpg': 'static image bytes',
    'favicon.svg': '<svg/>',
    'sitemap.xml': `<urlset>${transportRoutes.map(route => `<url><loc>${origin}/truck-transport/${route}</loc></url>`).join('')}</urlset>`,
    '_showcase-preview.jpg': 'old gallery preview',
  };
  for (const route of transportRoutes) {
    const canonical = `${origin}/truck-transport/${route}`;
    entries[`${route}index.html`] = `<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin}/truck-transport/images/social-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/truck-transport/images/social-card.jpg"><link rel="icon" href="/truck-transport/favicon.svg"></head><body><h1>Transport ${route}</h1><script src="/truck-transport/_next/static/app.js"></script></body></html>`;
  }
  const script = 'import io,json,sys,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED) as z:\n for name,content in json.load(sys.stdin).items(): z.writestr(name,content)\nsys.stdout.buffer.write(b.getvalue())';
  const bytes = execFileSync('python3', ['-c', script], { input: JSON.stringify(entries) });
  const artifact = { url: preservedTransport.artifactUrl, sha256: preservedTransport.sha256, sourceSha: preservedTransport.sourceSha };
  const site = { slug: 'truck-transport', repository: transportRepository, ref: preservedTransport.sourceSha, sha: preservedTransport.sourceSha, staticArtifact: artifact };
  const row = { slug: site.slug, repository: site.repository, sha: site.sha, staticArtifact: { ...artifact } };
  return { entries, bytes, site, row };
}

async function writeEntries(directory, entries) {
  for (const [name, content] of Object.entries(entries)) {
    await mkdir(dirname(join(directory, name)), { recursive: true });
    await writeFile(join(directory, name), content);
  }
}

test('preserved transport accepts only the exact trusted baseline and matching artifact manifest', () => {
  const { site, row } = preservedFixture();
  assert.equal(validateTransportPlan([site], [row]), site);
  for (const changed of [
    { ...site, repository: 'outsider/private' },
    { ...site, ref: 'main' },
    { ...site, sha: 'c'.repeat(40) },
    { ...site, releaseGate: transportGate },
    { ...site, release: source.release },
    { ...site, staticArtifact: { ...site.staticArtifact, sourceSha: 'c'.repeat(40) } },
    { ...site, staticArtifact: { ...site.staticArtifact, sha256: 'f'.repeat(64) } },
    { ...site, staticArtifact: { ...site.staticArtifact, url: site.staticArtifact.url.replace('45564113822', '99999999') } },
  ]) assert.throws(() => validateTransportPlan([changed], [row]));
  assert.throws(() => validateTransportPlan([site], [{ ...row, staticArtifact: undefined }]));
  assert.throws(() => validateTransportPlan([site], [{ ...row, staticArtifact: { ...row.staticArtifact, sha256: 'b'.repeat(64) } }]));
  assert.throws(() => validateTransportPlan([site], [{ ...row, release: source.release }]));
  assert.throws(() => validateTransportPlan([site, site], [row]));
});

test('runtime equality excludes only the top-level generated gallery screenshot', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xk-transport-byte-test-'));
  const a = join(root, 'baseline'), b = join(root, 'actual');
  try {
    await writeEntries(a, { 'index.html': 'same', '_showcase-preview.jpg': 'old', 'nested/image.jpg': 'same asset' });
    await writeEntries(b, { 'index.html': 'same', '_showcase-preview.jpg': 'new', 'nested/image.jpg': 'same asset' });
    assert.deepEqual(await comparePreservedTransport(a, b), { comparedFiles: 2, excludedGeneratedFile: '_showcase-preview.jpg', result: 'identical' });
    await writeFile(join(b, 'index.html'), 'changed runtime');
    await assert.rejects(comparePreservedTransport(a, b), /runtime bytes differ/);
    await writeFile(join(b, 'index.html'), 'same');
    await writeFile(join(b, 'nested/_showcase-preview.jpg'), 'not an allowed exclusion');
    await assert.rejects(comparePreservedTransport(a, b), /inventory differs/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('transport orchestration uses the fixed materialization contract and checks exact runtime without private source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xk-preserved-transport-test-'));
  const { entries, bytes, site, row } = preservedFixture();
  const dist = join(root, 'dist');
  const planPath = join(root, 'plan.json');
  const reportDirectory = join(root, 'report');
  try {
    await writeEntries(join(dist, 'truck-transport'), { ...entries, '_showcase-preview.jpg': 'regenerated gallery' });
    await writeFile(join(dist, 'manifest.json'), JSON.stringify([row]));
    await writeFile(planPath, JSON.stringify([site]));
    const calls = [];
    // The real safe downloader/extractor has its own digest/ZIP tests. This
    // fixture substitutes only that boundary; production has no policy override.
    const materializeFixture = async (registered, target, { fetchImpl }) => {
      assert.deepEqual(registered.staticArtifact, site.staticArtifact);
      await fetchImpl(registered.staticArtifact.url, { headers: {} });
      await writeEntries(target, entries);
    };
    let smokeCalls = 0;
    const report = await testTransport({
      planPath, dist, reportDirectory, materializeArtifact: materializeFixture,
      fetchImpl: async (url, options) => { calls.push(url); assert.equal(options.headers.Authorization, undefined); return new Response(bytes); },
      compiledSmoke: async ({ directory }) => { smokeCalls++; assert.equal(directory, dist); return { status: 'PASS', kind: 'unit-test substitute for fresh browser smoke' }; },
    });
    assert.deepEqual(calls, [preservedTransport.artifactUrl]);
    assert.equal(smokeCalls, 1);
    assert.equal(report.historicalSourceSuite.status, 'REUSED_NOT_RERUN');
    assert.equal(report.historicalSourceSuite.sourceSha, preservedTransport.sourceSha);
    assert.match(report.historicalSourceSuite.runUrl, /45564113822$/);
    assert.equal(report.comparison.result, 'identical');
    assert.equal(JSON.parse(await readFile(join(reportDirectory, 'static-artifact.json'), 'utf8')).freshCompiledOutputSmoke.status, 'PASS');
    await assert.rejects(testTransport({ planPath, dist, reportDirectory, materializeArtifact: materializeFixture, fetchImpl: async () => new Response(bytes), compiledSmoke: async () => ({ status: 'FAIL' }) }), /smoke did not pass/);
    await writeFile(join(dist, 'truck-transport', '_next/static/app.js'), 'unreviewed runtime');
    await assert.rejects(testTransport({ planPath, dist, reportDirectory, materializeArtifact: materializeFixture, fetchImpl: async () => new Response(bytes), compiledSmoke: async () => { throw new Error('Smoke must not run after byte mismatch'); } }), /runtime bytes differ/);
    await assert.rejects(testTransport({ planPath, dist, reportDirectory, fetchImpl: async () => new Response('wrong digest'), compiledSmoke: async () => { throw new Error('Smoke must not run after hash mismatch'); } }), /SHA256 mismatch/);
  } finally { await rm(root, { recursive: true, force: true }); }
});


const kaleidoscopeSite = {
  slug: 'truck-transport', repository: transportRepository, ref: kaleidoscopeTransport.sourceSha,
  sha: kaleidoscopeTransport.sourceSha,
  staticArtifact: { url: kaleidoscopeTransport.artifactUrl, sha256: kaleidoscopeTransport.sha256, sourceSha: kaleidoscopeTransport.sourceSha },
};
const kaleidoscopeRow = { slug: kaleidoscopeSite.slug, repository: transportRepository, sha: kaleidoscopeSite.sha, staticArtifact: { ...kaleidoscopeSite.staticArtifact } };

test('reviewed Kaleidoscope and preserved rollback both require their exact SHA, URL and ZIP digest', () => {
  assert.equal(validateTransportPlan([kaleidoscopeSite], [kaleidoscopeRow]), kaleidoscopeSite);
  assert.equal(reviewedTransportIdentity(kaleidoscopeSite), kaleidoscopeTransport);
  const old = preservedFixture();
  assert.equal(reviewedTransportIdentity(old.site), preservedTransport);
  for (const site of [old.site, kaleidoscopeSite]) {
    for (const update of [{ sha256: 'f'.repeat(64) }, { url: site.staticArtifact.url.replace('-v1/', '-v2/') }, { sourceSha: 'f'.repeat(40) }]) {
      const changed = { ...site, staticArtifact: { ...site.staticArtifact, ...update } };
      const row = { slug: changed.slug, repository: changed.repository, sha: changed.sha, staticArtifact: { ...changed.staticArtifact } };
      assert.throws(() => validateTransportPlan([changed], [row]));
    }
    assert.throws(() => reviewedTransportIdentity({ ...site, sha: 'e'.repeat(40) }));
  }
  assert.throws(() => validateTransportPlan([kaleidoscopeSite], [{ ...kaleidoscopeRow, staticArtifact: { ...kaleidoscopeRow.staticArtifact, sha256: preservedTransport.sha256 } }]));
});

test('replacement report separates source preparation and fresh smoke without reusing the preserved suite', () => {
  const smoke = { status: 'PASS', kind: 'fresh Hub-owned compiled-output smoke' };
  const comparison = { result: 'identical', comparedFiles: 52 };
  const replacement = staticTransportReport(kaleidoscopeSite, comparison, smoke);
  assert.equal(replacement.mode, 'reviewed-kaleidoscope-static-artifact');
  assert.equal(replacement.sourcePreparation.sourceSha, kaleidoscopeTransport.sourceSha);
  assert.equal(replacement.sourcePreparation.status, 'RECORDED_SEPARATELY_NOT_QUERIED_OR_RERUN');
  assert.equal(replacement.historicalSourceSuite, undefined);
  assert.equal(replacement.freshCompiledOutputSmoke, smoke);
  const old = staticTransportReport(preservedFixture().site, comparison, smoke);
  assert.equal(old.mode, 'preserved-static-artifact');
  assert.equal(old.historicalSourceSuite.status, 'REUSED_NOT_RERUN');
  assert.equal(old.sourcePreparation, undefined);
});

function kaleidoscopeMetadata(route = '') {
  const canonical = `${origin}/truck-transport/${route}`;
  const social = `${origin}/truck-transport/images/social-card.jpg`;
  return { title: '運輸服務｜萬花筒運輸', description: '說明每週配送與單次出貨。', canonical, robots: 'noindex, nofollow', siteName: '萬花筒運輸', ogTitle: '運輸服務｜萬花筒運輸', twitterTitle: '運輸服務｜萬花筒運輸', ogDescription: '說明每週配送與單次出貨。', twitterDescription: '說明每週配送與單次出貨。', ogUrl: canonical, ogImage: social, twitterImage: social, imageWidth: '1200', imageHeight: '630', twitterCard: 'summary_large_image', icon: '/truck-transport/favicon.svg', visibleText: '萬花筒運輸 KALEIDOSCOPE TRANSPORT 自主規劃展示作品' };
}

test('fresh replacement metadata catches old branding, incorrect social URLs and indexing changes', () => {
  const metadata = kaleidoscopeMetadata('services/');
  assert.doesNotThrow(() => assertKaleidoscopeMetadata(metadata, 'services/'));
  for (const change of [{ title: '序程運輸' }, { visibleText: '萬花筒運輸 序程運輸' }, { canonical: `${origin}/` }, { ogImage: `${origin}/other/card.jpg` }, { twitterImage: 'http://localhost/card.jpg' }, { robots: 'index,follow' }, { siteName: '序程運輸' }, { imageWidth: '600' }, { icon: '//other/favicon.svg' }]) assert.throws(() => assertKaleidoscopeMetadata({ ...metadata, ...change }, 'services/'));
});

test('inquiry privacy rejects persistence, external calls, write requests and raw draft URLs', () => {
  const localOrigin = 'http://127.0.0.1:4173';
  const clean = { requests: [{ url: `${localOrigin}/truck-transport/inquiry/`, method: 'GET', postData: null }], localStorage: 0, sessionStorage: 0, cookies: [], drafts: ['兩板貨'] };
  assert.doesNotThrow(() => assertInquiryPrivacy(clean, localOrigin));
  for (const change of [{ localStorage: 1 }, { sessionStorage: 1 }, { cookies: [{ name: 'draft' }] }, { requests: [{ url: 'https://external.example/', method: 'GET', postData: null }] }, { requests: [{ url: `${localOrigin}/truck-transport/`, method: 'POST', postData: '兩板貨' }] }, { requests: [{ url: `${localOrigin}/?draft=${encodeURIComponent('兩板貨')}`, method: 'GET', postData: null }] }]) assert.throws(() => assertInquiryPrivacy({ ...clean, ...change }, localOrigin));
});

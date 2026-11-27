import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { publishStaticArtifact } from '../scripts/publish-static-artifact.mjs';
import { origin, shengfengyangRoutes, ruiCafeRoutes } from '../scripts/static-export.mjs';

const repository = 'xk2022/xk-website-showcase';
const sourceSha = 'a'.repeat(40);
const tag = 'shengfengyang-aaaaaaa-v1';
const zipUrl = `https://github.com/${repository}/releases/download/${tag}/shengfengyang-static.zip`;
const carpentryTag = 'carpentry-aaaaaaa-v1';
const carpentryZipUrl = `https://github.com/${repository}/releases/download/${carpentryTag}/carpentry-static.zip`;
// selector 與公開子路徑仍是 carpentry，新 Release 的來源身份則是更名後的模板庫。
const templateSourceRepository = 'xk2022/xk-template-lp';
const ruiTag = 'rui-cafe-aaaaaaa-v1';
const ruiZipUrl = `https://github.com/${repository}/releases/download/${ruiTag}/rui-cafe-static.zip`;
const rotaractTag = 'rotaract-aaaaaaa-v1';
const rotaractZipUrl = `https://github.com/${repository}/releases/download/${rotaractTag}/rotaract-static.zip`;
const chengceTag = 'consulting-chengce-aaaaaaa-v1';
const chengceZipUrl = `https://github.com/${repository}/releases/download/${chengceTag}/consulting-chengce-static.zip`;
const chengceSourceRepository = 'xk2022/xk-lp-consulting-chengce';
const hongjiaTag = 'hongjia-birdnest-aaaaaaa-v1';
const hongjiaZipUrl = `https://github.com/${repository}/releases/download/${hongjiaTag}/hongjia-birdnest-static.zip`;
const esanTag = 'esan-interior-aaaaaaa-v1';
const esanZipUrl = `https://github.com/${repository}/releases/download/${esanTag}/esan-interior-static.zip`;
const esanSourceRepository = 'xk2022/xk-lp-esan-interior';
const pythonZip = String.raw`
import io, json, sys, zipfile
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for name, content in json.load(sys.stdin).items():
        z.writestr(name, content)
sys.stdout.buffer.write(buffer.getvalue())
`;
function archive(overrides = {}) {
  const entries = Object.fromEntries(shengfengyangRoutes.map(route => [`${route}index.html`, `<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${origin}/shengfengyang/${route}"></head><body><h1>Proposal</h1><script src="/shengfengyang/_next/static/app.js"></script></body></html>`]));
  entries['_next/static/app.js'] = '/* static browser asset, never executed by this job */';
  Object.assign(entries, overrides);
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function carpentryArchive(overrides = {}) {
  const entries = {
    'index.html': `<html><head><link rel="canonical" href="${origin}/carpentry/"></head><body><h1>木作職人</h1><script src="/carpentry/_next/static/app.js"></script></body></html>`,
    '_next/static/app.js': '/* static browser asset, never executed by this job */',
    'sitemap.xml': `<urlset><url><loc>${origin}/carpentry/</loc></url></urlset>`,
    ...overrides,
  };
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function ruiArchive(overrides = {}) {
  const entries = Object.fromEntries(ruiCafeRoutes.map(route => [`${route}index.html`, `<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${origin}/rui-cafe/${route}"></head><body><h1>蕋咖啡提案</h1><script src="/rui-cafe/_next/static/app.js"></script></body></html>`]));
  entries['_next/static/app.js'] = '/* browser output only */';
  Object.assign(entries, overrides);
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function rotaractArchive(overrides = {}) {
  const entries = {
    'index.html': `<html><head><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'"><link rel="canonical" href="${origin}/rotaract/"><link rel="stylesheet" href="/rotaract/assets/app.css"></head><body><h1>Synthetic interactive demo</h1><script type="module" src="/rotaract/assets/app.js"></script></body></html>`,
    'assets/app.js': '/* compiled browser output, not executed by upload helper */',
    'assets/app.css': 'body{}',
    ...overrides,
  };
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function chengceArchive(overrides = {}) {
  const entries = {
    'index.html': `<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${origin}/consulting-chengce/"></head><body><h1>澄策企業顧問工作室</h1><script src="/consulting-chengce/_next/static/app.js"></script></body></html>`,
    '_next/static/app.js': '/* reviewed public browser output */',
    'sitemap.xml': `<urlset><url><loc>${origin}/consulting-chengce/</loc></url></urlset>`,
    ...overrides,
  };
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}

function hongjiaArchive(overrides = {}) {
  const entries = {
    'index.html': `<html><head><link rel="canonical" href="${origin}/hongjia-birdnest/"></head><body><h1>宏家燕窩</h1><script src="/hongjia-birdnest/_next/static/app.js"></script></body></html>`,
    '_next/static/app.js': '/* browser output only */',
    'sitemap.xml': `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/hongjia-birdnest/</loc></url></urlset>`,
    ...overrides,
  };
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function esanArchive(overrides = {}) {
  const entries = {
    'index.html': `<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${origin}/esan-interior/"></head><body><h1>一森室內設計</h1><script src="/esan-interior/_next/static/app.js"></script></body></html>`,
    '_next/static/app.js': '/* reviewed public browser output */',
    'sitemap.xml': `<urlset><url><loc>${origin}/esan-interior/</loc></url></urlset>`,
    ...overrides,
  };
  return execFileSync('python3', ['-c', pythonZip], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
function environment(bytes) {
  return {
    INPUT_BLOB_SHA: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    INPUT_SHA256: createHash('sha256').update(bytes).digest('hex'), INPUT_SOURCE_SHA: sourceSha,
    GITHUB_REPOSITORY: repository, GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '123456', GH_TOKEN: 'test-only-token',
  };
}
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
function mock(bytes, { existing, uploadStatus = 201, blobOverride = {}, publicBytes = bytes, project, releasePages, releaseDetail = existing } = {}) {
  const env = environment(bytes);
  if (project !== undefined) env.INPUT_PROJECT = project;
  const expectedTag = project === undefined ? tag : `${project}-aaaaaaa-v1`;
  const expectedZipUrl = project === undefined ? zipUrl : `https://github.com/${repository}/releases/download/${expectedTag}/${project}-static.zip`;
  const calls = [];
  let draft;
  return {
    env, calls,
    fetchImpl: async (value, options = {}) => {
      const url = new URL(value);
      calls.push({ url, options });
      assert.equal(options.redirect, 'manual');
      if (options.headers?.Authorization) {
        assert.ok(['api.github.com', 'uploads.github.com'].includes(url.hostname));
        assert.ok(url.pathname.startsWith(`/repos/${repository}/`));
        assert.equal(options.headers.Authorization, 'Bearer test-only-token');
      }
      if (url.hostname === 'api.github.com') {
        if (url.pathname.includes('/git/blobs/')) return response({ sha: env.INPUT_BLOB_SHA, size: bytes.length, encoding: 'base64', content: bytes.toString('base64'), ...blobOverride });
        if (url.pathname.includes('/releases/tags/')) return existing && !(project === 'rotaract' && existing.draft) ? response(existing) : response({ message: 'Not Found' }, 404);
        if (url.pathname === `/repos/${repository}/releases` && options.method === 'GET') return response(releasePages ? releasePages[Number(url.searchParams.get('page')) - 1] : existing ? [existing] : []);
        if (url.pathname === `/repos/${repository}/releases/42` && options.method === 'GET') return response(releaseDetail);
        if (options.method === 'POST') {
          draft = JSON.parse(options.body);
          assert.equal(draft.draft, true);
          assert.equal(draft.target_commitish, env.GITHUB_SHA);
          return response({ id: 42, ...draft }, 201);
        }
        if (options.method === 'PATCH') {
          assert.equal(calls.filter(call => call.url.hostname === 'uploads.github.com').length, existing?.draft ? 2 - existing.assets.length : 2);
          return response({ id: 42, tag_name: expectedTag, draft: false });
        }
      }
      if (url.hostname === 'uploads.github.com') {
        if (uploadStatus !== 201) return response({ message: 'No' }, uploadStatus);
        return response({ name: url.searchParams.get('name'), state: 'uploaded', size: options.body.length }, 201);
      }
      if (value === expectedZipUrl) {
        assert.equal(options.headers?.Authorization, undefined);
        return new Response(publicBytes);
      }
      throw new Error(`Unexpected mock URL ${url.href}`);
    },
  };
}
function release(env, project = 'shengfengyang') {
  const carpentry = project === 'carpentry';
  if (project === 'esan-interior') return { tag_name: esanTag, draft: false, body: JSON.stringify({ sourceRepository: esanSourceRepository, sourceSha, sha256: env.INPUT_SHA256 }), assets: [{ name: 'esan-interior-static.zip' }, { name: 'release-manifest.json' }] };
  if (project === 'consulting-chengce') return { tag_name: chengceTag, draft: false, body: JSON.stringify({ sourceRepository: chengceSourceRepository, sourceSha, sha256: env.INPUT_SHA256 }), assets: [{ name: 'consulting-chengce-static.zip' }, { name: 'release-manifest.json' }] };
  return { tag_name: carpentry ? carpentryTag : tag, draft: false, body: JSON.stringify({ sourceRepository: carpentry ? templateSourceRepository : 'xk2022/xk-brand-shengfengyang', sourceSha, sha256: env.INPUT_SHA256 }), assets: [{ name: carpentry ? 'carpentry-static.zip' : 'shengfengyang-static.zip' }, { name: 'release-manifest.json' }] };
}
function writes(calls) { return calls.filter(call => ['POST', 'PATCH', 'DELETE'].includes(call.options.method)); }

// 發布只讀 Hub blob 與 Release API；更名不應讓工作流程查詢任何私人來源或來源 CI。
function assertNoPrivateTemplateSourceCalls(calls) {
  const sourcePrefixes = [templateSourceRepository, 'xk2022/xk-lp-carpentry'].map(source => `/repos/${source}`);
  assert.equal(calls.some(({ url }) => url.hostname === 'api.github.com' && sourcePrefixes.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix + '/'))), false);
  const authenticated = calls.filter(({ options }) => options.headers?.Authorization);
  assert.ok(authenticated.length > 0);
  assert.ok(authenticated.every(({ url }) => ['api.github.com', 'uploads.github.com'].includes(url.hostname) && url.pathname.startsWith(`/repos/${repository}/`)));
}

test('validates inputs before reading a blob or making any publication request', async () => {
  const env = environment(archive());
  for (const bad of [
    { GITHUB_REPOSITORY: 'outsider/repo' }, { INPUT_BLOB_SHA: '../blob' }, { INPUT_SHA256: 'invalid' },
    { INPUT_SOURCE_SHA: 'f'.repeat(39) }, { GITHUB_SHA: 'not-a-commit' }, { GITHUB_RUN_ID: '123/other' }, { GH_TOKEN: '' },
    ...['unknown', '__proto__', 'xk2022/xk-lp-carpentry', 'xk2022/xk-template-lp', 'template-lp', 'CARPENTRY', '../carpentry', 'chengce', 'CONSULTING-CHENGCE', '../consulting-chengce', chengceSourceRepository, ''].map(INPUT_PROJECT => ({ INPUT_PROJECT })),
  ]) {
    let called = false;
    await assert.rejects(publishStaticArtifact({ env: { ...env, ...bad }, fetchImpl: async () => { called = true; throw new Error('Must not fetch'); } }));
    assert.equal(called, false);
  }
});

test('publishes verified static ZIP and generated manifest as draft assets before exposing the release', async () => {
  const bytes = archive();
  const service = mock(bytes);
  const result = await publishStaticArtifact(service);
  assert.deepEqual(result, { tag, url: zipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  assert.deepEqual(mutations.map(call => `${call.url.hostname}:${call.options.method}`), ['api.github.com:POST', 'uploads.github.com:POST', 'uploads.github.com:POST', 'api.github.com:PATCH']);
  const manifest = JSON.parse(mutations[2].options.body);
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.publication.runId, '123456');
  assert.equal(manifest.publication.workflow, '.github/workflows/deploy.yml');
  assert.match(manifest.verification, /does not query private source CI/);
  assert.equal(service.calls.some(call => call.url.pathname.includes('/xk-brand-shengfengyang/')), false);
});

test('the explicit original selector preserves the Shengfengyang release identity', async () => {
  const service = mock(archive(), { project: 'shengfengyang' });
  const result = await publishStaticArtifact(service);
  assert.equal(result.tag, tag);
  assert.equal(result.url, zipUrl);
  const created = JSON.parse(writes(service.calls)[0].options.body);
  assert.match(created.name, /^昇豐陽食品｜靜態提案 /);
  assert.equal(JSON.parse(created.body).sourceRepository, 'xk2022/xk-brand-shengfengyang');
});

test('Rotaract publishes only its fixed synthetic export with isolated provenance and no Latest change', async () => {
  const bytes = rotaractArchive();
  const service = mock(bytes, { project: 'rotaract' });
  assert.deepEqual(await publishStaticArtifact(service), { tag: rotaractTag, url: rotaractZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, rotaractTag);
  assert.equal(created.make_latest, 'false');
  assert.equal(JSON.parse(mutations.at(-1).options.body).make_latest, 'false');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.equal(manifest.sourceRepository, 'xk2022/xk-app-rotaract');
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.match(manifest.verification, /does not query private source CI/);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['rotaract-static.zip', 'release-manifest.json']);
  assert.equal(service.calls.some(call => call.url.pathname.includes('/xk-app-rotaract/')), false);
});

test('Rotaract rejects missing CSP, external or cross-case assets, indexing and non-export files before Release access', async () => {
  const base = `<html><head><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="connect-src 'none'"><link rel="canonical" href="${origin}/rotaract/"><link rel="stylesheet" href="/rotaract/assets/app.css"></head><body><script type="module" src="/rotaract/assets/app.js"></script></body></html>`;
  for (const overrides of [
    { 'index.html': base.replace("connect-src 'none'", "connect-src 'self'") },
    { 'index.html': base.replace('</body>', '<script src="https://external.invalid/app.js"></script></body>') },
    { 'index.html': base.replace('/rotaract/assets/app.css', '/other/assets/app.css') },
    { 'index.html': base.replace('noindex,nofollow', 'index,follow') },
    { 'sitemap.xml': '<urlset/>' }, { '.env': 'PRIVATE=value' }, { 'src/main.ts': 'source' },
    { 'assets/app.js.map': '{}' },
  ]) {
    const service = mock(rotaractArchive(overrides), { project: 'rotaract' });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

function rotaractDraft(bytes, names = []) {
  const env = environment(bytes);
  const manifest = {
    schemaVersion: 1, sourceRepository: 'xk2022/xk-app-rotaract', sourceSha, sha256: env.INPUT_SHA256, staticOnly: true,
    publication: { repository, commitSha: 'c'.repeat(40), workflow: '.github/workflows/deploy.yml', runId: '123455', runUrl: `https://github.com/${repository}/actions/runs/123455` },
    verification: 'Verified compiled static export only; this publication job does not query private source CI.',
  };
  const body = JSON.stringify(manifest, null, 2);
  const contents = { 'rotaract-static.zip': bytes, 'release-manifest.json': Buffer.from(body + '\n') };
  return { id: 42, tag_name: rotaractTag, draft: true, prerelease: true, target_commitish: manifest.publication.commitSha, body,
    assets: names.map((name, i) => ({ id: 101 + i, name, state: 'uploaded', size: contents[name].length, digest: `sha256:${createHash('sha256').update(contents[name]).digest('hex')}` })) };
}

test('a verified Rotaract partial draft resumes by adding only missing assets and preserving its original manifest', async () => {
  const bytes = rotaractArchive();
  for (const names of [[], ['rotaract-static.zip'], ['release-manifest.json'], ['rotaract-static.zip', 'release-manifest.json']]) {
    const existing = rotaractDraft(bytes, names);
    const service = mock(bytes, { project: 'rotaract', existing });
    const result = await publishStaticArtifact(service);
    assert.equal(result.resumed, true);
    assert.equal(result.reused, false);
    assert.equal(service.calls.filter(call => call.url.pathname === `/repos/${repository}/releases` && call.options.method === 'GET').length, 1);
    assert.equal(service.calls.filter(call => call.url.pathname === `/repos/${repository}/releases/42` && call.options.method === 'GET').length, 1);
    const mutations = writes(service.calls);
    assert.equal(mutations.some(call => call.url.hostname === 'api.github.com' && call.options.method === 'POST'), false);
    const uploaded = mutations.filter(call => call.url.hostname === 'uploads.github.com');
    assert.deepEqual(uploaded.map(call => call.url.searchParams.get('name')), ['rotaract-static.zip', 'release-manifest.json'].filter(name => !names.includes(name)));
    const manifestUpload = uploaded.find(call => call.url.searchParams.get('name') === 'release-manifest.json');
    if (manifestUpload) assert.equal(manifestUpload.options.body.toString(), existing.body + '\n');
    assert.equal(mutations.some(call => call.options.method === 'DELETE'), false);
    assert.equal(JSON.parse(mutations.at(-1).options.body).make_latest, 'false');
  }
});

test('Rotaract draft inventory is bounded, unambiguous and refreshed by fixed release ID before writes', async () => {
  const bytes = rotaractArchive();
  const existing = rotaractDraft(bytes);
  const unrelated = Array.from({ length: 100 }, (_, index) => ({ id: index + 1000, tag_name: `unrelated-${index}` }));
  const paginated = mock(bytes, { project: 'rotaract', existing, releasePages: [unrelated, [existing]] });
  assert.equal((await publishStaticArtifact(paginated)).resumed, true);
  assert.equal(paginated.calls.filter(call => call.url.searchParams.has('page')).length, 2);
  for (const options of [
    { releasePages: [[existing, { ...existing, id: 43 }]] },
    { releasePages: [unrelated, unrelated, unrelated] },
    { releasePages: [{}] },
    { releasePages: [[{ ...existing, id: '../other' }]] },
    { releasePages: [[existing]], releaseDetail: { ...existing, tag_name: 'changed-tag' } },
    { releasePages: [[existing]], releaseDetail: { ...existing, id: 43 } },
  ]) {
    const service = mock(bytes, { project: 'rotaract', existing, ...options });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert(service.calls.filter(call => call.url.searchParams.has('page')).length <= 3);
  }
});

test('Rotaract mismatched or unverified partial drafts fail before writes and never replace assets', async () => {
  const bytes = rotaractArchive();
  for (const change of [
    draft => { draft.assets[0].digest = 'sha256:' + '0'.repeat(64); },
    draft => { delete draft.assets[0].digest; },
    draft => { draft.assets[0].size++; },
    draft => { draft.assets[0].state = 'starter'; },
    draft => { draft.assets.push({ ...draft.assets[0] }); },
    draft => { draft.assets[0].name = 'unexpected.zip'; },
    draft => { draft.target_commitish = 'd'.repeat(40); },
    draft => { draft.body = JSON.stringify({ sourceRepository: 'xk2022/xk-app-rotaract', sourceSha, sha256: environment(bytes).INPUT_SHA256 }); },
    draft => { draft.body = draft.body.replace(sourceSha, 'd'.repeat(40)); },
    draft => { draft.body = draft.body.replace('xk2022/xk-website-showcase', 'outsider/repository'); },
  ]) {
    const existing = rotaractDraft(bytes, ['rotaract-static.zip']);
    change(existing);
    const service = mock(bytes, { project: 'rotaract', existing });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
  }
});

test('a matching public Rotaract release is revalidated without writes or Latest changes', async () => {
  const bytes = rotaractArchive();
  const existing = { ...rotaractDraft(bytes, ['rotaract-static.zip', 'release-manifest.json']), draft: false };
  const service = mock(bytes, { project: 'rotaract', existing });
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, true);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.filter(call => call.url.hostname === 'github.com').length, 1);
});

test('Rui Cafe publishes its fixed seven-route proposal and manifest without private source access', async () => {
  const bytes = ruiArchive();
  const service = mock(bytes, { project: 'rui-cafe' });
  assert.deepEqual(await publishStaticArtifact(service), { tag: ruiTag, url: ruiZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, ruiTag);
  assert.equal(created.name, '蕋咖啡 Rui Café｜非官方品牌網站提案 aaaaaaa');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.equal(manifest.sourceRepository, 'xk2022/xk-brand-rui-cafe');
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['rui-cafe-static.zip', 'release-manifest.json']);
  assert.equal(service.calls.some(call => call.url.pathname.includes('/xk-brand-rui-cafe/')), false);
});

test('Rui Cafe cannot publish an incomplete route or an indexable sitemap', async () => {
  for (const bytes of [ruiArchive({ 'visit/index.html': '<h1>Incomplete</h1>' }), ruiArchive({ 'sitemap.xml': '<urlset/>' })]) {
    const service = mock(bytes, { project: 'rui-cafe' });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('Carpentry publishes the renamed six-industry template source with the same fixed asset and isolated draft flow', async () => {
  const bytes = carpentryArchive();
  const service = mock(bytes, { project: 'carpentry' });
  const result = await publishStaticArtifact(service);
  assert.deepEqual(result, { tag: carpentryTag, url: carpentryZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  assert.deepEqual(mutations.map(call => `${call.url.hostname}:${call.options.method}`), ['api.github.com:POST', 'uploads.github.com:POST', 'uploads.github.com:POST', 'api.github.com:PATCH']);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, carpentryTag);
  assert.equal(created.name, '職人產業 LP Template｜六產業靜態展示 aaaaaaa');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.deepEqual(manifest, JSON.parse(created.body));
  assert.equal(manifest.sourceRepository, templateSourceRepository);
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.equal(manifest.publication.repository, repository);
  assert.equal(manifest.publication.commitSha, service.env.GITHUB_SHA);
  assert.equal(manifest.publication.runId, service.env.GITHUB_RUN_ID);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['carpentry-static.zip', 'release-manifest.json']);
  assert.deepEqual(mutations[1].options.body, bytes);
  assertNoPrivateTemplateSourceCalls(service.calls);
  assert.equal(service.calls.some(call => /shengfengyang/.test(call.url.pathname)), false);
});

test('Hongjia LP publishes and reuses only its fixed, indexable Next.js export', async () => {
  const bytes = hongjiaArchive();
  const service = mock(bytes, { project: 'hongjia-birdnest' });
  const { INPUT_SHA256: sha256 } = service.env;
  const expected = { tag: hongjiaTag, url: hongjiaZipUrl, sourceSha, sha256 };
  assert.deepEqual(await publishStaticArtifact(service), { ...expected, reused: false });

  const mutations = writes(service.calls);
  const created = JSON.parse(mutations[0].options.body);
  const manifest = JSON.parse(created.body);
  assert.equal(manifest.sourceRepository, 'xk2022/xk-lp-hongjia-birdnest');
  assert.deepEqual(JSON.parse(mutations[2].options.body), manifest);
  const assets = mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => ({ name: call.url.searchParams.get('name') }));
  assert.deepEqual(assets.map(asset => asset.name), ['hongjia-birdnest-static.zip', 'release-manifest.json']);
  const existing = { ...created, draft: false, assets };
  const repeated = mock(bytes, { project: 'hongjia-birdnest', existing });
  assert.deepEqual(await publishStaticArtifact(repeated), { ...expected, reused: true });
  assert.equal(writes(repeated.calls).length, 0);

  const draft = mock(bytes, { project: 'hongjia-birdnest', existing: { ...existing, draft: true } });
  await assert.rejects(publishStaticArtifact(draft), /still a draft/);
  assert.equal(writes(draft.calls).length, 0);
});

test('Hongjia LP rejects mismatched case exports and missing sitemaps before release calls', async () => {
  for (const bytes of [carpentryArchive(), hongjiaArchive({ 'sitemap.xml': undefined })]) {
    const service = mock(bytes, { project: 'hongjia-birdnest' });
    await assert.rejects(publishStaticArtifact(service), /Invalid canonical URL|sitemap\.xml/);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('a selected project rejects the other project export before reading or writing releases', async () => {
  for (const [project, bytes] of [['carpentry', archive()], ['shengfengyang', carpentryArchive()], ['rotaract', carpentryArchive()], ['carpentry', rotaractArchive()]]) {
    const service = mock(bytes, { project });
    await assert.rejects(publishStaticArtifact(service), /Invalid canonical URL/);
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('Carpentry requires the indexable export sitemap and rejects assets from another case', async () => {
  const missingSitemap = carpentryArchive({ 'sitemap.xml': undefined });
  const crossCase = carpentryArchive({ 'index.html': `<html><head><link rel="canonical" href="${origin}/carpentry/"></head><body><h1>木作職人</h1><script src="/carpentry/_next/static/app.js"></script><img src="/shengfengyang/image.jpg"></body></html>` });
  for (const bytes of [missingSitemap, crossCase]) {
    const service = mock(bytes, { project: 'carpentry' });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
  }
});

test('a matching Carpentry public release is revalidated and reused without writes', async () => {
  const bytes = carpentryArchive();
  const env = environment(bytes);
  const service = mock(bytes, { project: 'carpentry', existing: release(env, 'carpentry') });
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, true);
  assert.equal(result.url, carpentryZipUrl);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.filter(call => call.url.hostname === 'github.com').length, 1);
  assertNoPrivateTemplateSourceCalls(service.calls);
});

test('Carpentry cannot relabel or silently reuse a legacy-source release even when SHA and ZIP match', async () => {
  const bytes = carpentryArchive();
  const env = environment(bytes);
  const existing = release(env, 'carpentry');
  // 只換回歷史來源，其餘 tag、commit、checksum、asset 均相同，證明來源身份也受比對。
  existing.body = JSON.stringify({ ...JSON.parse(existing.body), sourceRepository: 'xk2022/xk-lp-carpentry' });
  const unchanged = JSON.stringify(existing);
  const service = mock(bytes, { project: 'carpentry', existing });
  await assert.rejects(publishStaticArtifact(service), /Existing static release differs/);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.some(call => call.url.hostname === 'github.com'), false);
  assert.equal(JSON.stringify(existing), unchanged);
  assertNoPrivateTemplateSourceCalls(service.calls);
});

test('Carpentry cannot reuse an existing release whose manifest names an unrelated source', async () => {
  const bytes = carpentryArchive();
  const env = environment(bytes);
  const existing = release(env, 'carpentry');
  existing.body = release(env).body;
  const service = mock(bytes, { project: 'carpentry', existing });
  await assert.rejects(publishStaticArtifact(service), /Existing static release differs/);
  assert.equal(writes(service.calls).length, 0);
});

test('invalid blob metadata, bytes or SHA256 stop before release writes', async () => {
  const bytes = archive();
  for (const blobOverride of [{ sha: 'f'.repeat(40) }, { size: 31 * 1024 * 1024 }, { encoding: 'utf-8' }, { content: '@@notbase64@@' }, { size: bytes.length + 1 }]) {
    const service = mock(bytes, { blobOverride });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
  }
  const service = mock(bytes);
  service.env.INPUT_SHA256 = '0'.repeat(64);
  await assert.rejects(publishStaticArtifact(service), /SHA256 mismatch/);
  assert.equal(writes(service.calls).length, 0);
});

test('unsafe ZIP paths and incomplete static exports cannot create a release', async () => {
  for (const bytes of [archive({ '../escape.txt': 'no' }), archive({ 'story/index.html': '<h1>Missing metadata</h1>' })]) {
    const service = mock(bytes);
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('failed asset upload leaves the release draft and never publishes or overwrites assets', async () => {
  const service = mock(archive(), { uploadStatus: 401 });
  await assert.rejects(publishStaticArtifact(service), /upload failed: HTTP 401/);
  assert.equal(service.calls.some(call => call.options.method === 'PATCH'), false);
  assert.equal(service.calls.some(call => call.options.method === 'DELETE'), false);
});

test('a matching public release is verified and reused without writes', async () => {
  const bytes = archive();
  const env = environment(bytes);
  const service = mock(bytes, { existing: release(env) });
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, true);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.filter(call => call.url.hostname === 'github.com').length, 1);
});

test('different, incomplete, draft or corrupted existing releases fail closed without writes', async () => {
  const bytes = archive();
  const env = environment(bytes);
  for (const existing of [
    { ...release(env), draft: true }, { ...release(env), body: '{}' }, { ...release(env), assets: [] },
    release(env),
  ]) {
    const service = mock(bytes, { existing, publicBytes: Buffer.from('modified asset') });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
  }
});

test('authenticated GitHub API redirects fail without following or forwarding the token', async () => {
  const env = environment(archive());
  const calls = [];
  await assert.rejects(publishStaticArtifact({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 302, headers: { location: 'https://evil.example/steal' } });
  } }), /HTTP 302/);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).hostname, 'api.github.com');
  assert.equal(calls[0].options.redirect, 'manual');
});


test('publishes a valid multi-MiB ZIP through Git blob decoding and full static validation', async () => {
  const bytes = archive({ 'images/large-fixture.bin': randomBytes(2600000).toString('base64') });
  assert.ok(bytes.length > 2500000);
  const service = mock(bytes);
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, false);
  assert.equal(writes(service.calls).length, 4);
});

test('Chengce publishes only its fixed source, subpath and archive with a provenance manifest', async () => {
  const bytes = chengceArchive();
  const service = mock(bytes, { project: 'consulting-chengce' });
  assert.deepEqual(await publishStaticArtifact(service), { tag: chengceTag, url: chengceZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  assert.deepEqual(mutations.map(call => `${call.url.hostname}:${call.options.method}`), ['api.github.com:POST', 'uploads.github.com:POST', 'uploads.github.com:POST', 'api.github.com:PATCH']);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, chengceTag);
  assert.equal(created.name, '澄策企業顧問工作室 aaaaaaa');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.deepEqual(manifest, JSON.parse(created.body));
  assert.equal(manifest.sourceRepository, chengceSourceRepository);
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.match(manifest.verification, /does not query private source CI/);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['consulting-chengce-static.zip', 'release-manifest.json']);
  assert.deepEqual(mutations[1].options.body, bytes);
  assert.equal(service.calls.some(({ url }) => url.pathname.startsWith(`/repos/${chengceSourceRepository}/`)), false);
  assert.ok(service.calls.filter(({ options }) => options.headers?.Authorization).every(({ url }) => ['api.github.com', 'uploads.github.com'].includes(url.hostname) && url.pathname.startsWith(`/repos/${repository}/`)));
});

test('Chengce rejects other-case exports, missing sitemap and escaping assets before release access', async () => {
  for (const bytes of [
    carpentryArchive(),
    chengceArchive({ 'sitemap.xml': undefined }),
    chengceArchive({ 'index.html': `<html><head><link rel="canonical" href="${origin}/consulting-chengce/"></head><body><h1>澄策</h1><script src="/consulting-chengce/_next/static/app.js"></script><img src="/carpentry/image.jpg"></body></html>` }),
  ]) {
    const service = mock(bytes, { project: 'consulting-chengce' });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('a matching Chengce public release is revalidated and reused without writes', async () => {
  const bytes = chengceArchive();
  const service = mock(bytes, { project: 'consulting-chengce', existing: release(environment(bytes), 'consulting-chengce') });
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, true);
  assert.equal(result.url, chengceZipUrl);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.filter(call => call.url.hostname === 'github.com').length, 1);
});

test('Chengce refuses changed source provenance and drafts without borrowing Rotaract recovery', async () => {
  const bytes = chengceArchive();
  const env = environment(bytes);
  const mismatched = release(env, 'consulting-chengce');
  mismatched.body = JSON.stringify({ ...JSON.parse(mismatched.body), sourceRepository: templateSourceRepository });
  for (const existing of [mismatched, { ...release(env, 'consulting-chengce'), draft: true }]) {
    const service = mock(bytes, { project: 'consulting-chengce', existing });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.searchParams.has('page')), false);
    assert.equal(service.calls.some(call => call.url.hostname === 'github.com'), false);
  }
});

test('the workflow exposes the fixed Chengce selector while retaining the original default', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const projectInput = workflow.split('      static_artifact_project:')[1].split('      static_artifact_blob:')[0];
  assert.match(projectInput, /\n          - consulting-chengce\n/);
  assert.match(projectInput, /default: shengfengyang/);
});

test('Esan publishes only its fixed source, subpath and archive with a provenance manifest', async () => {
  const bytes = esanArchive();
  const service = mock(bytes, { project: 'esan-interior' });
  assert.deepEqual(await publishStaticArtifact(service), { tag: esanTag, url: esanZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  assert.deepEqual(mutations.map(call => `${call.url.hostname}:${call.options.method}`), ['api.github.com:POST', 'uploads.github.com:POST', 'uploads.github.com:POST', 'api.github.com:PATCH']);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, esanTag);
  assert.equal(created.name, '一森室內設計 aaaaaaa');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.deepEqual(manifest, JSON.parse(created.body));
  assert.equal(manifest.sourceRepository, esanSourceRepository);
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.match(manifest.verification, /does not query private source CI/);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['esan-interior-static.zip', 'release-manifest.json']);
  assert.deepEqual(mutations[1].options.body, bytes);
  assert.equal(service.calls.some(({ url }) => url.pathname.startsWith(`/repos/${esanSourceRepository}/`)), false);
  assert.ok(service.calls.filter(({ options }) => options.headers?.Authorization).every(({ url }) => ['api.github.com', 'uploads.github.com'].includes(url.hostname) && url.pathname.startsWith(`/repos/${repository}/`)));
});

test('Esan rejects other-case exports, missing sitemap and escaping assets before release access', async () => {
  for (const bytes of [
    chengceArchive(),
    esanArchive({ 'sitemap.xml': undefined }),
    esanArchive({ 'index.html': `<html><head><link rel="canonical" href="${origin}/esan-interior/"></head><body><h1>一森</h1><script src="/esan-interior/_next/static/app.js"></script><img src="/carpentry/image.jpg"></body></html>` }),
  ]) {
    const service = mock(bytes, { project: 'esan-interior' });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.pathname.includes('/releases')), false);
  }
});

test('a matching Esan public release is revalidated and reused without writes', async () => {
  const bytes = esanArchive();
  const service = mock(bytes, { project: 'esan-interior', existing: release(environment(bytes), 'esan-interior') });
  const result = await publishStaticArtifact(service);
  assert.equal(result.reused, true);
  assert.equal(result.url, esanZipUrl);
  assert.equal(writes(service.calls).length, 0);
  assert.equal(service.calls.filter(call => call.url.hostname === 'github.com').length, 1);
});

test('Esan refuses changed source provenance and drafts without borrowing Rotaract recovery', async () => {
  const bytes = esanArchive();
  const env = environment(bytes);
  const mismatched = release(env, 'esan-interior');
  mismatched.body = JSON.stringify({ ...JSON.parse(mismatched.body), sourceRepository: chengceSourceRepository });
  for (const existing of [mismatched, { ...release(env, 'esan-interior'), draft: true }]) {
    const service = mock(bytes, { project: 'esan-interior', existing });
    await assert.rejects(publishStaticArtifact(service));
    assert.equal(writes(service.calls).length, 0);
    assert.equal(service.calls.some(call => call.url.searchParams.has('page')), false);
    assert.equal(service.calls.some(call => call.url.hostname === 'github.com'), false);
  }
});

test('the workflow exposes the fixed Esan selector while retaining the original default', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const projectInput = workflow.split('      static_artifact_project:')[1].split('      static_artifact_blob:')[0];
  assert.match(projectInput, /\n          - esan-interior\n/);
  assert.match(projectInput, /default: shengfengyang/);
});

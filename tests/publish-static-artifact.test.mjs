import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { publishStaticArtifact } from '../scripts/publish-static-artifact.mjs';
import { origin, shengfengyangRoutes } from '../scripts/static-export.mjs';

const repository = 'xk2022/xk-website-showcase';
const sourceSha = 'a'.repeat(40);
const tag = 'shengfengyang-aaaaaaa-v1';
const zipUrl = `https://github.com/${repository}/releases/download/${tag}/shengfengyang-static.zip`;
const carpentryTag = 'carpentry-aaaaaaa-v1';
const carpentryZipUrl = `https://github.com/${repository}/releases/download/${carpentryTag}/carpentry-static.zip`;
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
function environment(bytes) {
  return {
    INPUT_BLOB_SHA: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    INPUT_SHA256: createHash('sha256').update(bytes).digest('hex'), INPUT_SOURCE_SHA: sourceSha,
    GITHUB_REPOSITORY: repository, GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '123456', GH_TOKEN: 'test-only-token',
  };
}
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
function mock(bytes, { existing, uploadStatus = 201, blobOverride = {}, publicBytes = bytes, project } = {}) {
  const env = environment(bytes);
  if (project !== undefined) env.INPUT_PROJECT = project;
  const expectedTag = project === 'carpentry' ? carpentryTag : tag;
  const expectedZipUrl = project === 'carpentry' ? carpentryZipUrl : zipUrl;
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
        if (url.pathname.includes('/releases/tags/')) return existing ? response(existing) : response({ message: 'Not Found' }, 404);
        if (options.method === 'POST') {
          draft = JSON.parse(options.body);
          assert.equal(draft.draft, true);
          assert.equal(draft.target_commitish, env.GITHUB_SHA);
          return response({ id: 42, ...draft }, 201);
        }
        if (options.method === 'PATCH') {
          assert.equal(calls.filter(call => call.url.hostname === 'uploads.github.com').length, 2);
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
  return { tag_name: carpentry ? carpentryTag : tag, draft: false, body: JSON.stringify({ sourceRepository: carpentry ? 'xk2022/xk-lp-carpentry' : 'xk2022/xk-brand-shengfengyang', sourceSha, sha256: env.INPUT_SHA256 }), assets: [{ name: carpentry ? 'carpentry-static.zip' : 'shengfengyang-static.zip' }, { name: 'release-manifest.json' }] };
}
function writes(calls) { return calls.filter(call => ['POST', 'PATCH', 'DELETE'].includes(call.options.method)); }

test('validates inputs before reading a blob or making any publication request', async () => {
  const env = environment(archive());
  for (const bad of [
    { GITHUB_REPOSITORY: 'outsider/repo' }, { INPUT_BLOB_SHA: '../blob' }, { INPUT_SHA256: 'invalid' },
    { INPUT_SOURCE_SHA: 'f'.repeat(39) }, { GITHUB_SHA: 'not-a-commit' }, { GITHUB_RUN_ID: '123/other' }, { GH_TOKEN: '' },
    ...['unknown', '__proto__', 'xk2022/xk-lp-carpentry', 'CARPENTRY', '../carpentry', ''].map(INPUT_PROJECT => ({ INPUT_PROJECT })),
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

test('Carpentry publishes its exact asset, source and manifest using the same isolated draft flow', async () => {
  const bytes = carpentryArchive();
  const service = mock(bytes, { project: 'carpentry' });
  const result = await publishStaticArtifact(service);
  assert.deepEqual(result, { tag: carpentryTag, url: carpentryZipUrl, sourceSha, sha256: service.env.INPUT_SHA256, reused: false });
  const mutations = writes(service.calls);
  assert.deepEqual(mutations.map(call => `${call.url.hostname}:${call.options.method}`), ['api.github.com:POST', 'uploads.github.com:POST', 'uploads.github.com:POST', 'api.github.com:PATCH']);
  const created = JSON.parse(mutations[0].options.body);
  assert.equal(created.tag_name, carpentryTag);
  assert.equal(created.name, '木作職人｜靜態展示 aaaaaaa');
  const manifest = JSON.parse(mutations[2].options.body);
  assert.deepEqual(manifest, JSON.parse(created.body));
  assert.equal(manifest.sourceRepository, 'xk2022/xk-lp-carpentry');
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sha256, service.env.INPUT_SHA256);
  assert.equal(manifest.staticOnly, true);
  assert.equal(manifest.publication.repository, repository);
  assert.equal(manifest.publication.commitSha, service.env.GITHUB_SHA);
  assert.equal(manifest.publication.runId, service.env.GITHUB_RUN_ID);
  assert.deepEqual(mutations.filter(call => call.url.hostname === 'uploads.github.com').map(call => call.url.searchParams.get('name')), ['carpentry-static.zip', 'release-manifest.json']);
  assert.deepEqual(mutations[1].options.body, bytes);
  assert.equal(service.calls.some(call => /xk-lp-carpentry|shengfengyang/.test(call.url.pathname)), false);
});

test('a selected project rejects the other project export before reading or writing releases', async () => {
  for (const [project, bytes] of [['carpentry', archive()], ['shengfengyang', carpentryArchive()]]) {
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
});

test('Carpentry cannot reuse an existing release whose manifest names another source', async () => {
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

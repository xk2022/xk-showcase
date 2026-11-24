import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPreviewServer, transportTestEnvironment, validateTransportPlan, testTransport } from '../scripts/test-transport.mjs';
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, lstat, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { materializeStaticArtifact } from '../scripts/static-artifact.mjs';

const releaseUrl = 'https://github.com/xk2022/xk-website-showcase/releases/download/shengfengyang-test/site.zip';
const fixtureScript = String.raw`
import io, json, stat, sys, warnings, zipfile
warnings.simplefilter("ignore", UserWarning)
entries = json.load(sys.stdin)
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for entry in entries:
        info = zipfile.ZipInfo(entry['name'])
        info.create_system = 3
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = ((stat.S_IFLNK | 0o777) if entry.get('symlink') else (stat.S_IFREG | 0o755)) << 16
        z.writestr(info, entry.get('text', 'static content'))
sys.stdout.buffer.write(buffer.getvalue())
`;
function zip(entries = [{ name: 'index.html', text: '<h1>Proposal</h1>' }, { name: 'images/food.webp', text: 'image' }]) {
  return execFileSync('python3', ['-c', fixtureScript], { input: JSON.stringify(entries), maxBuffer: 5 * 1024 * 1024 });
}
// Verify that rejection fixtures are otherwise readable ZIPs, with unchanged
// payload CRCs and actual forbidden filename characters in their central records.
function inspectZip(bytes) {
  const script = String.raw`
import io, json, sys, zipfile
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
    print(json.dumps([{'name': info.orig_filename, 'text': z.read(info).decode('utf-8')} for info in z.infolist()]))
`;
  return JSON.parse(execFileSync('python3', ['-c', script], { input: bytes, encoding: 'utf8' }));
}
function site(bytes, overrides = {}) {
  return { staticArtifact: { url: releaseUrl, sourceSha: 'a'.repeat(40), sha256: createHash('sha256').update(bytes).digest('hex'), ...overrides } };
}
async function fixture(callback) {
  const root = await mkdtemp(join(tmpdir(), 'static-artifact-test-'));
  const target = join(root, 'export');
  try { await callback({ root, target }); } finally { await rm(root, { recursive: true, force: true }); }
}
async function absent(path) { await assert.rejects(access(path), { code: 'ENOENT' }); }

function patchSizes(bytes, size) {
  const result = Buffer.from(bytes);
  for (let offset = 0; offset < result.length - 28; offset++) {
    if (result.readUInt32LE(offset) === 0x02014b50) result.writeUInt32LE(size, offset + 24);
  }
  return result;
}

test('verified public release materializes nested regular files with non-executable modes', async () => {
  await fixture(async ({ target }) => {
    const bytes = zip();
    const calls = [];
    await materializeStaticArtifact(site(bytes), target, { fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/github-production-release-asset/test.zip?signature=public' } }) : new Response(bytes);
    } });
    assert.equal(await readFile(join(target, 'index.html'), 'utf8'), '<h1>Proposal</h1>');
    assert.equal(await readFile(join(target, 'images/food.webp'), 'utf8'), 'image');
    assert.equal((await lstat(join(target, 'index.html'))).mode & 0o777, 0o644);
    assert.deepEqual(await readdir(target), ['images', 'index.html']);
    for (const call of calls) {
      assert.equal(call.options.redirect, 'manual');
      assert.equal(Object.keys(call.options.headers).some(name => /authorization|cookie/i.test(name)), false);
    }
  });
});

test('hash mismatch rejects before extraction and leaves no target or staging directory', async () => {
  await fixture(async ({ root, target }) => {
    const bytes = zip();
    await assert.rejects(materializeStaticArtifact(site(bytes, { sha256: '0'.repeat(64) }), target, { fetchImpl: async () => new Response(bytes) }), /SHA256 mismatch/);
    await absent(target);
    assert.deepEqual(await readdir(root), []);
  });
});

test('rejects untrusted initial URLs and redirect destinations before fetching them', async () => {
  const bytes = zip();
  await fixture(async ({ target }) => {
    for (const url of ['https://evil.example/site.zip', 'http://github.com/xk2022/xk-website-showcase/releases/download/tag/site.zip', 'https://user:password@github.com/xk2022/xk-website-showcase/releases/download/tag/site.zip']) {
      await assert.rejects(materializeStaticArtifact(site(bytes, { url }), target, { fetchImpl: async () => { throw new Error('Must not fetch'); } }), /Unsafe/);
    }
    for (const location of ['https://evil.example/site.zip', 'http://release-assets.githubusercontent.com/a', 'https://release-assets.githubusercontent.com.evil.example/a', 'https://user:password@objects.githubusercontent.com/a']) {
      let calls = 0;
      await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location } }); } }), /Unsafe/);
      assert.equal(calls, 1);
      await absent(target);
    }
  });
});

test('bounds redirect chains and rejects failed downloads', async () => {
  const bytes = zip();
  await fixture(async ({ target }) => {
    let calls = 0;
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://objects.githubusercontent.com/a' } }); } }), /redirect limit/);
    assert.equal(calls, 4);
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(null, { status: 404 }) }), /HTTP 404/);
    await absent(target);
  });
});

test('enforces both declared and streamed download limits', async () => {
  const bytes = zip();
  await fixture(async ({ target }) => {
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes, { headers: { 'content-length': String(31 * 1024 * 1024) } }) }), /size limit/);
    const oversized = new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(16 * 1024 * 1024)); controller.enqueue(Buffer.alloc(16 * 1024 * 1024)); controller.close(); } });
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(oversized) }), /size limit/);
    await absent(target);
  });
});

test('rejects traversal, absolute, encoded and ambiguous archive paths without partial files', async () => {
  await fixture(async ({ root, target }) => {
    for (const name of ['../escape.txt', '/absolute.txt', 'a/../../escape.txt', 'a\\escape.txt', '%2e%2e/escape.txt', 'a//b.txt', 'a/./b.txt', 'C:/escape.txt']) {
      const bytes = zip([{ name: 'index.html' }, { name }]);
      await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /Unsafe static archive path/);
      await absent(target);
      assert.deepEqual(await readdir(root), []);
    }
  });
});

test('rejects symlinks, duplicate normalized filenames and file-directory collisions', async () => {
  await fixture(async ({ target }) => {
    for (const entries of [
      [{ name: 'index.html' }, { name: 'images/link', text: '../../outside', symlink: true }],
      [{ name: 'index.html' }, { name: 'index.html', text: 'replacement' }],
      [{ name: 'caf\u00e9.txt' }, { name: 'cafe\u0301.txt' }],
      [{ name: 'a' }, { name: 'a/file.txt' }],
      [{ name: 'a/file.txt' }, { name: 'a' }],
    ]) {
      const bytes = zip(entries);
      await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /symlink|Duplicate normalized|paths conflict/);
      await absent(target);
    }
  });
});

test('rejects oversized individual entries, total expansion and excessive entry count', async () => {
  await fixture(async ({ target }) => {
    for (const bytes of [
      patchSizes(zip(), 51 * 1024 * 1024),
      patchSizes(zip(Array.from({ length: 5 }, (_, i) => ({ name: `part${i}.txt` }))), 45 * 1024 * 1024),
      zip(Array.from({ length: 10001 }, (_, i) => ({ name: `${i}.txt`, text: '' }))),
    ]) {
      await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /size limit|entry count/);
      await absent(target);
    }
  });
});

test('rejects encrypted and corrupt archives and never changes an existing destination', async () => {
  await fixture(async ({ target, root }) => {
    const encrypted = zip();
    for (let i = 0; i < encrypted.length - 10; i++) {
      const signature = encrypted.readUInt32LE(i);
      if (signature === 0x04034b50) encrypted.writeUInt16LE(encrypted.readUInt16LE(i + 6) | 1, i + 6);
      if (signature === 0x02014b50) encrypted.writeUInt16LE(encrypted.readUInt16LE(i + 8) | 1, i + 8);
    }
    await assert.rejects(materializeStaticArtifact(site(encrypted), target, { fetchImpl: async () => new Response(encrypted) }), /Encrypted/);
    const invalid = Buffer.from('not a ZIP');
    await assert.rejects(materializeStaticArtifact(site(invalid), target, { fetchImpl: async () => new Response(invalid) }), /zip file/);
    assert.deepEqual(await readdir(root), []);
    await writeFile(target, 'original');
    await assert.rejects(materializeStaticArtifact(site(zip()), target, { fetchImpl: async () => { throw new Error('Must not fetch'); } }), /target already exists/);
    assert.equal(await readFile(target, 'utf8'), 'original');
  });
});


test('rejects a genuine single-backslash filename in an otherwise readable ZIP', async () => {
  await fixture(async ({ target, root }) => {
    const name = String.raw`images\food.webp`;
    assert.equal([...name].filter(char => char.charCodeAt(0) === 92).length, 1);
    const bytes = zip([{ name: 'index.html', text: 'valid index' }, { name, text: 'valid payload' }]);
    assert.deepEqual(inspectZip(bytes), [{ name: 'index.html', text: 'valid index' }, { name, text: 'valid payload' }]);
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /Unsafe static archive path/);
    await absent(target);
    assert.deepEqual(await readdir(root), []);
  });
});

test('rejects a genuine embedded NUL filename before extraction rather than CRC validation', async () => {
  await fixture(async ({ target, root }) => {
    const bytes = zip([{ name: 'nulXname.txt', text: 'valid payload' }]);
    const marker = Buffer.from('nulXname.txt');
    let changed = 0;
    for (let offset = bytes.indexOf(marker); offset !== -1; offset = bytes.indexOf(marker, offset + marker.length)) {
      bytes[offset + 3] = 0;
      changed++;
    }
    assert.equal(changed, 2, 'Patch both local and central filename records');
    const metadata = inspectZip(bytes);
    assert.equal(metadata[0].name.charCodeAt(3), 0);
    assert.equal(metadata[0].text, 'valid payload', 'Archive payload remains readable with its original CRC');
    await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /Unsafe static archive path/);
    await absent(target);
    assert.deepEqual(await readdir(root), []);
  });
});

test('rejects workspace source files, secrets, dependencies and source maps', async () => {
  await fixture(async ({ target, root }) => {
    for (const name of ['.git/config', '.GIT/config', '.next/server/page.js', 'src/app/page.tsx', 'server/index.js', 'node_modules/package/index.js', '.env', '.env.production.local', 'nested/.env.local', '_next/static/chunks/app.js.map']) {
      const bytes = zip([{ name: 'index.html' }, { name }]);
      await assert.rejects(materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) }), /private source or workspace files/);
      await absent(target);
      assert.deepEqual(await readdir(root), []);
    }
  });
});

test('permits browser runtime chunks, styles, fonts and Next public RSC payloads', async () => {
  await fixture(async ({ target }) => {
    const entries = ['index.html', '_next/static/chunks/app.js', '_next/static/css/app.css', '_next/static/media/font.woff2', 'products/example/index.txt', '__next._full.txt', 'images/food.webp'].map(name => ({ name, text: 'public output' }));
    const bytes = zip(entries);
    await materializeStaticArtifact(site(bytes), target, { fetchImpl: async () => new Response(bytes) });
    for (const entry of entries) assert.equal(await readFile(join(target, entry.name), 'utf8'), entry.text);
  });
});

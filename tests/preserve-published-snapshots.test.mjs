import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareSnapshots, preservePublishedSnapshots, validatePublicationRun } from '../scripts/preserve-published-snapshots.mjs';

const repository = 'xk2022/xk-website-showcase';
const sourceSha = 'a'.repeat(40);
const hubSha = 'b'.repeat(40);
const site = { slug: 'honest', repository: 'xk2022/xk-lp-honest-diecut', sha: sourceSha };
const registration = { slug: site.slug, name: 'Fixture', repository: site.repository, ref: 'main', env: { NEXT_PUBLIC_BASE_PATH: '/honest' }, releaseGate: { workflow: '.github/workflows/ci.yml', job: 'verify' } };
const release = { sha: sourceSha, workflow: '.github/workflows/ci.yml', job: 'verify', run_id: 123, run_attempt: 1, run_url: `https://github.com/${site.repository}/actions/runs/123`, verified_at: '2026-11-25T00:00:00Z' };
const html = '<html><head><link rel="canonical" href="https://showcase.xplorekaleidoscope.com/honest/"></head><body><h1>Previously published</h1><script src="/honest/_next/static/app.js"></script></body></html>';
const pythonArchive = String.raw`
import io, json, sys, tarfile, zipfile
data = json.load(sys.stdin)
tar_buffer = io.BytesIO()
with tarfile.open(fileobj=tar_buffer, mode='w') as t:
    for entry in data['entries']:
        info = tarfile.TarInfo(entry['name'])
        if 'paxPath' in entry:
            info.pax_headers = {'path': entry['paxPath']}
        content = entry.get('content', '').encode()
        kind = entry.get('type', 'file')
        if kind == 'symlink':
            info.type = tarfile.SYMTYPE
            info.linkname = entry.get('link', '/tmp/outside')
        elif kind == 'hardlink':
            info.type = tarfile.LNKTYPE
            info.linkname = entry.get('link', './honest/index.html')
        elif kind == 'directory':
            info.type = tarfile.DIRTYPE
        elif kind == 'device':
            info.type = tarfile.CHRTYPE
        else:
            info.size = entry.get('size', len(content))
        if kind == 'oversized':
            # A header-only malformed member exercises the pre-stream size guard.
            # Newer Python versions refuse addfile(nonzero_size, fileobj=None).
            header = info.tobuf()
            t.fileobj.write(header)
            t.offset += len(header)
        else:
            t.addfile(info, io.BytesIO(content) if kind == 'file' else None)
outer = io.BytesIO()
with zipfile.ZipFile(outer, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr(data.get('outerName', 'artifact.tar'), tar_buffer.getvalue())
    for extra in data.get('outerExtra', []):
        info = zipfile.ZipInfo(extra['name'])
        if extra.get('type') == 'symlink':
            info.create_system = 3
            info.external_attr = 0o120777 << 16
        z.writestr(info, extra.get('content', 'extra'))
sys.stdout.buffer.write(outer.getvalue())
`;

function fixture({ manifest = [{ ...site, release }], overrides = {}, extra = [], outerName, outerExtra } = {}) {
  const entries = {
    './manifest.json': JSON.stringify(manifest),
    './honest/index.html': html,
    './honest/_next/static/app.js': '/* previously published browser asset */',
    './honest/sitemap.xml': '<urlset><url><loc>https://showcase.xplorekaleidoscope.com/honest/</loc></url></urlset>',
    ...overrides,
  };
  const bytes = execFileSync('python3', ['-c', pythonArchive], {
    input: JSON.stringify({ entries: [...Object.entries(entries).filter(([, value]) => value !== undefined).map(([name, content]) => ({ name, content })), ...extra], outerName, outerExtra }),
    maxBuffer: 8 * 1024 * 1024,
  });
  const publication = {
    repository, runId: 456, runAttempt: 1, hubSha,
    artifactId: 789, artifactSha256: createHash('sha256').update(bytes).digest('hex'),
    tag: 'preserved-showcase-456-v1', sites: [{ ...site, release }],
  };
  return { bytes, publication, registrations: [registration] };
}

function run() {
  return { id: 456, run_attempt: 1, head_sha: hubSha, head_branch: 'main', event: 'push', path: '.github/workflows/deploy.yml', status: 'completed', conclusion: 'success', head_repository: { full_name: repository } };
}

function inventory(bytes) {
  return JSON.parse(execFileSync('python3', ['-c', "import io,json,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); print(json.dumps({n:z.read(n).decode() for n in z.namelist() if not n.endswith('/')}))"], { input: bytes, encoding: 'utf8' }));
}

test('preservation requires the exact successful main push publication identity', () => {
  const { publication } = fixture();
  assert.doesNotThrow(() => validatePublicationRun(run(), publication));
  for (const change of [
    { id: 457 }, { run_attempt: 2 }, { head_sha: 'c'.repeat(40) }, { head_branch: 'feature/other' },
    { event: 'pull_request' }, { path: '.github/workflows/other.yml' }, { status: 'in_progress' },
    { conclusion: 'failure' }, { head_repository: { full_name: 'outsider/repo' } },
  ]) assert.throws(() => validatePublicationRun({ ...run(), ...change }, publication));
});

test('invalid workflow context stops before any artifact request or publication', async () => {
  const base = { GITHUB_REPOSITORY: repository, GITHUB_SHA: hubSha, GITHUB_RUN_ID: '123456', GH_TOKEN: 'test-only-token' };
  for (const change of [{ GITHUB_REPOSITORY: 'outsider/repo' }, { GITHUB_SHA: 'not-a-sha' }, { GITHUB_RUN_ID: '123/other' }, { GH_TOKEN: '' }, { GH_TOKEN: 'token with spaces' }]) {
    let calls = 0;
    await assert.rejects(preservePublishedSnapshots({ env: { ...base, ...change }, fetchImpl: async () => { calls++; throw new Error('Must not fetch'); } }));
    assert.equal(calls, 0);
  }
});

test('preservation packages only the approved case output and pins the original source identity', async () => {
  const { bytes, publication, registrations } = fixture();
  const prepared = await prepareSnapshots(bytes, { publication, registrations });
  assert.equal(prepared.archives.length, 1);
  const archive = prepared.archives[0];
  assert.equal(archive.site.slug, site.slug);
  assert.equal(archive.filename, 'honest-static.zip');
  assert.equal(archive.sha256, createHash('sha256').update(archive.bytes).digest('hex'));
  assert.deepEqual(inventory(archive.bytes), {
    'index.html': html,
    '_next/static/app.js': '/* previously published browser asset */',
    'sitemap.xml': '<urlset><url><loc>https://showcase.xplorekaleidoscope.com/honest/</loc></url></urlset>',
  });
  assert.equal(prepared.registrations.length, 1);
  const candidate = prepared.registrations[0];
  assert.equal(candidate.repository, site.repository);
  assert.equal(candidate.ref, sourceSha);
  assert.deepEqual(candidate.staticArtifact, {
    url: `https://github.com/${repository}/releases/download/${publication.tag}/honest-static.zip`,
    sha256: archive.sha256, sourceSha,
  });
  assert.equal(candidate.releaseGate, undefined);
  assert.deepEqual(prepared.manifest.sites[0].previousSourceRelease, release);
  assert.equal(prepared.manifest.previousPublication.runId, publication.runId);
  assert.equal(prepared.manifest.previousPublication.artifactSha256, publication.artifactSha256);
  assert.match(prepared.manifest.verification, /does not|previous|preserv|published/i);
});

test('artifact checksum mismatch is rejected before archive processing', async () => {
  const { bytes, publication, registrations } = fixture();
  await assert.rejects(prepareSnapshots(bytes, { publication: { ...publication, artifactSha256: '0'.repeat(64) }, registrations }), /SHA|digest|checksum/i);
});

test('manifest must preserve every exact reviewed slug, repository and source SHA', async () => {
  for (const manifest of [
    [], [{ ...site, sha: 'c'.repeat(40) }], [{ ...site, repository: 'xk2022/other' }],
    [{ ...site, slug: 'other' }], [site, site],
  ]) {
    const { bytes, publication, registrations } = fixture({ manifest });
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }));
  }
});

test('unsafe ZIP entries and unexpected outer archive structure are rejected', async () => {
  for (const options of [
    { outerName: '../artifact.tar' }, { outerName: '/artifact.tar' },
    { outerExtra: [{ name: '../escape', content: 'no' }] },
    { outerExtra: [{ name: 'linked', type: 'symlink', content: '/tmp/escape' }] },
    { outerExtra: [{ name: 'artifact.tar', content: 'duplicate' }] },
  ]) {
    const { bytes, publication, registrations } = fixture(options);
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }));
  }
});

test('tar traversal, absolute paths, links, devices and duplicate paths are rejected', async () => {
  for (const extra of [
    [{ name: '../escape', content: 'no' }], [{ name: '/absolute', content: 'no' }],
    [{ name: './honest/link', type: 'symlink' }], [{ name: './honest/link', type: 'hardlink' }],
    [{ name: './honest/device', type: 'device' }], [{ name: './honest/index.html', content: html }],
  ]) {
    const { bytes, publication, registrations } = fixture({ extra });
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }));
  }
});

test('tar paths reject a literal backslash and an effective PAX path containing NUL', async () => {
  const names = ['./honest\\escape', './honest/evil\u0000name'];
  assert.equal([...names[0]].filter(char => char.charCodeAt(0) === 92).length, 1);
  assert.equal([...names[1]].filter(char => char.charCodeAt(0) === 0).length, 1);
  for (const name of names) {
    const entry = name.includes('\u0000') ? { name: './honest/safe-name', paxPath: name, content: 'no' } : { name, content: 'no' };
    const { bytes, publication, registrations } = fixture({ extra: [entry] });
    const effectiveNames = JSON.parse(execFileSync('python3', ['-c', "import io,json,sys,tarfile,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); t=tarfile.open(fileobj=io.BytesIO(z.read('artifact.tar')),mode='r:'); print(json.dumps([i.name for i in t]))"], { input: bytes, encoding: 'utf8' }));
    assert.ok(effectiveNames.includes(name), 'fixture must expose the exact unsafe effective path to tarfile');
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }), /Unsafe Pages TAR path/);
  }
});

test('workspace sources, environment files and source maps cannot enter preserved snapshots', async () => {
  for (const name of ['./honest/.env', './honest/src/private.ts', './honest/.git/config', './honest/node_modules/secret', './honest/_next/static/app.js.map', './honest/leaked.ts', './honest/leaked.tsx', './honest/leaked.jsx']) {
    const { bytes, publication, registrations } = fixture({ extra: [{ name, content: 'private workspace content' }] });
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }));
  }
});

test('declared oversized TAR members are rejected before streaming or publication', async () => {
  const { bytes, publication, registrations } = fixture({ extra: [{ name: './honest/oversized.bin', type: 'oversized', size: 51 * 1024 * 1024 }] });
  await assert.rejects(prepareSnapshots(bytes, { publication, registrations }), /limit|oversized/i);
});

test('invalid compiled output cannot be republished as a preserved source snapshot', async () => {
  for (const overrides of [
    { './honest/index.html': '<h1>No canonical or assets</h1>' },
    { './honest/index.html': html.replace('/honest/_next/static/app.js', '/other/_next/static/app.js') },
    { './honest/sitemap.xml': undefined },
  ]) {
    const { bytes, publication, registrations } = fixture({ overrides });
    await assert.rejects(prepareSnapshots(bytes, { publication, registrations }));
  }
});

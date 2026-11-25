import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { validateExport } from './static-export.mjs';
import { materializeStaticArtifact } from './static-artifact.mjs';

const run = promisify(execFile);
const fixedPublication = JSON.parse(await readFile(new URL('../config/preserved-publication.json', import.meta.url), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const maxArchive = 30 * 1024 * 1024;
const manifestName = 'preservation-manifest.json';

// The CLI never accepts a run, source, slug, asset or repository from input.
// The explicit preparation configuration argument exists for deterministic tests.
export function validatePublicationRun(value, publication = fixedPublication) {
  if (value?.id !== publication.runId || value.run_attempt !== publication.runAttempt
    || value.head_sha !== publication.hubSha || value.head_branch !== 'main'
    || value.event !== 'push' || value.path !== '.github/workflows/deploy.yml'
    || value.head_repository?.full_name !== publication.repository
    || value.status !== 'completed' || value.conclusion !== 'success') {
    throw new Error('Previous publication run does not match the approved successful main release');
  }
}

const extractAndRepack = String.raw`
import json, pathlib, stat, sys, tarfile, unicodedata, zipfile
archive, destination, config_path = sys.argv[1:]
MAX_FILES, MAX_TOTAL, MAX_FILE = 30000, 200*1024*1024, 50*1024*1024
configuration = json.loads(pathlib.Path(config_path).read_text())
slugs = {row['slug'] for row in configuration['sites']}
root = pathlib.Path(destination)
root.mkdir(mode=0o700)
with zipfile.ZipFile(archive) as z:
    rows = z.infolist()
    if len(rows) != 1 or rows[0].filename != 'artifact.tar':
        raise ValueError('Pages ZIP must contain exactly artifact.tar')
    info = rows[0]
    if info.flag_bits & 1 or info.compress_type not in [zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED]:
        raise ValueError('Unsupported Pages ZIP compression or encryption')
    if stat.S_IFMT(info.external_attr >> 16) not in [0, stat.S_IFREG] or info.file_size > MAX_TOTAL:
        raise ValueError('Unsafe or oversized Pages ZIP entry')
    tar_path = root.parent/'publication.tar'
    actual = 0
    with z.open(info) as source, tar_path.open('xb') as target:
        while True:
            chunk = source.read(65536)
            if not chunk: break
            actual += len(chunk)
            if actual > MAX_TOTAL or actual > info.file_size: raise ValueError('Pages TAR exceeds size limit')
            target.write(chunk)
    if actual != info.file_size: raise ValueError('Pages TAR size mismatch')
seen, regular, directories = set(), set(), set()
count, total = 0, 0
with tarfile.open(tar_path, 'r:') as tar:
    for info in tar:
        count += 1
        if count > MAX_FILES: raise ValueError('Pages TAR entry limit exceeded')
        name = info.name
        if name in ['.', './']:
            if not info.isdir(): raise ValueError('Invalid TAR root')
            continue
        while name.startswith('./'): name = name[2:]
        parts = name.rstrip('/').split('/')
        if not name or name.startswith('/') or any(ord(c) in [0, 92] for c in name) or '%' in name or ':' in name or any(p in ['', '.', '..'] for p in parts):
            raise ValueError('Unsafe Pages TAR path')
        normalized = '/'.join(unicodedata.normalize('NFC', p) for p in parts)
        if normalized in seen: raise ValueError('Duplicate normalized Pages TAR path')
        seen.add(normalized)
        if not (info.isfile() or info.isdir()): raise ValueError('Pages TAR contains link or nonregular entry')
        ancestors = ['/'.join(normalized.split('/')[:i]) for i in range(1, len(parts))]
        if any(p in regular for p in ancestors) or (info.isfile() and normalized in directories): raise ValueError('Pages TAR file/directory conflict')
        directories.update(ancestors)
        (directories if info.isdir() else regular).add(normalized)
        if info.size < 0 or info.size > MAX_FILE: raise ValueError('Pages TAR file limit exceeded')
        total += info.size
        if total > MAX_TOTAL: raise ValueError('Pages TAR expanded limit exceeded')
        # Inspect all members before choosing the approved public case directories.
        forbidden = {'.git', '.next', 'src', 'server', 'node_modules'}
        if any(p.casefold() in forbidden or p.casefold().startswith('.env') for p in parts) or parts[-1].casefold().endswith(('.map', '.ts', '.tsx', '.jsx')):
            raise ValueError('Pages TAR contains private source or workspace files')
        if parts[0] not in slugs and normalized != 'manifest.json': continue
        output = root.joinpath(*parts)
        if info.isdir():
            output.mkdir(parents=True, exist_ok=True, mode=0o755)
            continue
        output.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        actual = 0
        with tar.extractfile(info) as source, output.open('xb') as target:
            while True:
                chunk = source.read(65536)
                if not chunk: break
                actual += len(chunk)
                if actual > info.size or actual > MAX_FILE: raise ValueError('Pages TAR streamed file limit exceeded')
                target.write(chunk)
        if actual != info.size: raise ValueError('Pages TAR file size mismatch')
        output.chmod(0o644)
for slug in sorted(slugs):
    site = root/slug
    if not site.is_dir(): raise ValueError('Missing approved case directory: '+slug)
    target = root.parent/(slug+'-static.zip')
    with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(site.rglob('*')):
            if path.is_file():
                # Fixed metadata makes archive hashes reproducible across runs.
                info = zipfile.ZipInfo(path.relative_to(site).as_posix(), (2026, 11, 25, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                z.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
`;

function assertManifest(actual, publication) {
  const expected = publication.baselineManifest ?? publication.sites;
  if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error('Previous publication manifest count differs');
  const tuples = rows => rows.map(({ slug, repository, sha }) => ({ slug, repository, sha })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (new Set(actual.map(row => row.slug)).size !== actual.length || JSON.stringify(tuples(actual)) !== JSON.stringify(tuples(expected))) throw new Error('Previous publication manifest tuples differ');
  for (const site of publication.sites) {
    const row = actual.find(entry => entry.slug === site.slug);
    if (JSON.stringify(row.release ?? null) !== JSON.stringify(site.release ?? null)) throw new Error('Previous source release evidence differs');
  }
}

export async function prepareSnapshots(bytes, { publication = fixedPublication, registrations = publication.registrations } = {}) {
  if (bytes.length > maxArchive || digest(bytes) !== publication.artifactSha256) throw new Error('Pinned Pages artifact SHA256 mismatch or size limit exceeded');
  const work = await mkdtemp(join(tmpdir(), 'preserve-published-'));
  try {
    await writeFile(join(work, 'pages.zip'), bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(join(work, 'configuration.json'), JSON.stringify({ sites: publication.sites }), { flag: 'wx', mode: 0o600 });
    await run('python3', ['-c', extractAndRepack, join(work, 'pages.zip'), join(work, 'extracted'), join(work, 'configuration.json')], { timeout: 60000, maxBuffer: 1024 * 1024 });
    const previous = JSON.parse(await readFile(join(work, 'extracted/manifest.json'), 'utf8'));
    assertManifest(previous, publication);
    const archives = [];
    const candidates = [];
    for (const site of publication.sites) {
      const registration = registrations.find(row => row.slug === site.slug);
      if (!registration || registration.repository !== site.repository) throw new Error('Missing or mismatched approved registration');
      // Validate using the original reviewed policy, including source gate and APP
      // restrictions. This checks bytes; it never executes or queries the source.
      await validateExport(join(work, 'extracted', site.slug), { ...registration, ref: site.sha });
      const filename = `${site.slug}-static.zip`;
      const archive = await readFile(join(work, filename));
      if (archive.length > maxArchive) throw new Error('Preserved case archive exceeds size limit');
      const sha256 = digest(archive);
      const { releaseGate: previousGate, ...candidate } = registration;
      candidates.push({ ...candidate, ref: site.sha, staticArtifact: {
        url: `https://github.com/${publication.repository}/releases/download/${publication.tag}/${filename}`,
        sha256, sourceSha: site.sha,
      } });
      archives.push({ site, bytes: archive, sha256, filename });
    }
    const manifest = {
      schemaVersion: 1,
      previousPublication: {
        repository: publication.repository, runId: publication.runId, runAttempt: publication.runAttempt,
        hubSha: publication.hubSha, artifactId: publication.artifactId, artifactSha256: publication.artifactSha256,
      },
      sites: archives.map(({ site, sha256, filename }) => ({ slug: site.slug, repository: site.repository, sourceSha: site.sha, sha256, filename, ...(site.release ? { previousSourceRelease: site.release } : {}) })),
      verification: 'Preserved compiled bytes from the pinned successful public Hub release; no private source checkout, execution or new source CI verification.',
    };
    return { archives, registrations: candidates, manifest };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function boundedBytes(response, limit) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Response exceeds size limit');
  if (!response.body) throw new Error('Missing response body');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new Error('Response exceeds size limit');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

export async function preservePublishedSnapshots({ env = process.env, fetchImpl = fetch, outputPath = '.release/preserved-registrations.json' } = {}) {
  const publication = fixedPublication;
  if (env.GITHUB_REPOSITORY !== publication.repository || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || !/^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '') || !env.GH_TOKEN || /\s/.test(env.GH_TOKEN)) throw new Error('Invalid Hub preservation context');
  const prefix = `/repos/${publication.repository}`;
  async function api(path, { method = 'GET', body, allow404 = false } = {}) {
    if (!path.startsWith(prefix + '/')) throw new Error('Unsafe Hub API path');
    const response = await fetchImpl(`https://api.github.com${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(30000), headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (allow404 && response.status === 404) { await response.body?.cancel(); return undefined; }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Hub preservation API ${method} failed: HTTP ${response.status}`); }
    return JSON.parse((await boundedBytes(response, 4 * 1024 * 1024)).toString('utf8'));
  }
  validatePublicationRun(await api(`${prefix}/actions/runs/${publication.runId}`), publication);
  const jobs = await api(`${prefix}/actions/runs/${publication.runId}/attempts/${publication.runAttempt}/jobs?per_page=100`);
  const deploy = jobs.jobs?.find(job => job.id === publication.deploymentJobId);
  if (jobs.total_count > 100 || deploy?.name !== 'deploy' || deploy.head_sha !== publication.hubSha || deploy.run_id !== publication.runId || deploy.run_attempt !== publication.runAttempt || deploy.conclusion !== 'success' || !deploy.steps?.some(step => step.name === 'Verify public source manifest, routes and referenced assets' && step.conclusion === 'success')) throw new Error('Pinned previous deployment/public verification is not successful');
  const metadata = await api(`${prefix}/actions/artifacts/${publication.artifactId}`);
  if (metadata.id !== publication.artifactId || metadata.name !== 'github-pages' || metadata.expired !== false || metadata.digest !== `sha256:${publication.artifactSha256}` || metadata.size_in_bytes !== publication.artifactSize || metadata.workflow_run?.id !== publication.runId || metadata.workflow_run.head_sha !== publication.hubSha) throw new Error('Pinned Pages artifact metadata differs');
  // The credential is sent only to the fixed same-Hub REST endpoint. Signed
  // storage redirects are bounded and fetched anonymously.
  let url = `https://api.github.com${prefix}/actions/artifacts/${publication.artifactId}/zip`;
  let bytes;
  for (let redirects = 0; redirects <= 3; redirects++) {
    const parsed = new URL(url);
    const authenticated = parsed.hostname === 'api.github.com';
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.hash || (!authenticated && !/^(?:[a-z0-9-]+\.blob\.core\.windows\.net|[a-z0-9-]+\.actions\.githubusercontent\.com)$/.test(parsed.hostname))) throw new Error('Unsafe Pages artifact redirect');
    const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(30000), headers: authenticated ? { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json' } : { Accept: 'application/octet-stream' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location');
      await response.body?.cancel();
      if (!next || redirects === 3) throw new Error('Pages artifact redirect limit exceeded');
      const target = new URL(next, url);
      if (target.hostname === 'api.github.com') throw new Error('Pages artifact redirect must not reuse authenticated API');
      url = target.href;
      continue;
    }
    if (response.status !== 200) { await response.body?.cancel(); throw new Error(`Pages artifact download failed: HTTP ${response.status}`); }
    bytes = await boundedBytes(response, maxArchive);
    break;
  }
  if (!bytes) throw new Error('Missing Pages artifact bytes');
  const prepared = await prepareSnapshots(bytes);
  const existing = await api(`${prefix}/releases/tags/${publication.tag}`, { allow404: true });
  if (existing) {
    let recorded;
    try { recorded = JSON.parse(existing.body); } catch { throw new Error('Existing preservation release has no verifiable manifest'); }
    if (existing.draft !== false || existing.tag_name !== publication.tag || JSON.stringify(recorded) !== JSON.stringify(prepared.manifest)) throw new Error('Existing preservation release differs or is draft; never overwrite');
    const names = [...prepared.archives.map(row => row.filename), manifestName];
    if (existing.assets?.length !== names.length || names.some(name => existing.assets.filter(asset => asset.name === name).length !== 1)) throw new Error('Existing preservation release assets differ');
    for (const registration of prepared.registrations) {
      const work = await mkdtemp(join(tmpdir(), 'verify-preserved-release-'));
      try {
        await materializeStaticArtifact(registration, join(work, 'export'), { fetchImpl });
        await validateExport(join(work, 'export'), registration);
      } finally { await rm(work, { recursive: true, force: true }); }
    }
  } else {
    const created = await api(`${prefix}/releases`, { method: 'POST', body: {
      tag_name: publication.tag, target_commitish: env.GITHUB_SHA,
      name: 'Preserved public Showcase snapshots · 45564113822',
      body: JSON.stringify(prepared.manifest, null, 2), draft: true, prerelease: true,
    } });
    if (!Number.isSafeInteger(created.id) || created.id < 1 || created.tag_name !== publication.tag || created.draft !== true) throw new Error('Unexpected preservation draft response');
    for (const asset of [...prepared.archives.map(({ filename, bytes }) => ({ filename, bytes, type: 'application/zip' })), { filename: manifestName, bytes: Buffer.from(JSON.stringify(prepared.manifest, null, 2) + '\n'), type: 'application/json' }]) {
      const response = await fetchImpl(`https://uploads.github.com${prefix}/releases/${created.id}/assets?name=${encodeURIComponent(asset.filename)}`, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(60000), headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': asset.type, 'Content-Length': String(asset.bytes.length) }, body: asset.bytes });
      if (response.status !== 201) { await response.body?.cancel(); throw new Error(`Preservation upload failed: HTTP ${response.status}; release remains draft`); }
      const uploaded = JSON.parse((await boundedBytes(response, 1024 * 1024)).toString('utf8'));
      if (uploaded.name !== asset.filename || uploaded.size !== asset.bytes.length || uploaded.state !== 'uploaded') throw new Error('Unexpected preservation asset response');
    }
    const published = await api(`${prefix}/releases/${created.id}`, { method: 'PATCH', body: { draft: false, prerelease: true } });
    if (published.draft !== false || published.tag_name !== publication.tag) throw new Error('Preservation release was not published');
  }
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, JSON.stringify(prepared.registrations, null, 2) + '\n');
  return { tag: publication.tag, preserved: prepared.archives.length, registrations: outputPath, reused: Boolean(existing), previousPublication: prepared.manifest.previousPublication };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await preservePublishedSnapshots())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

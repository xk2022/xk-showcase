import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);
const maxDownload = 30 * 1024 * 1024;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const assetHosts = new Set(['release-assets.githubusercontent.com', 'objects.githubusercontent.com']);

function validateUrl(value, initial = false) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port) throw new Error('Unsafe static artifact URL');
  if (url.hostname === 'github.com') {
    if (!/^\/xk2022\/xk-website-showcase\/releases\/download\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.zip$/.test(url.pathname) || url.search) throw new Error('Unsafe static artifact release URL');
  } else if (initial || !assetHosts.has(url.hostname)) {
    throw new Error('Unsafe static artifact redirect host');
  }
  return url;
}

async function downloadArtifact(value, fetchImpl) {
  let url = validateUrl(value, true);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetchImpl(url.href, {
      redirect: 'manual',
      headers: { Accept: 'application/octet-stream' },
      signal: AbortSignal.timeout(30000),
    });
    if (redirectStatuses.has(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new Error('Static artifact redirect limit exceeded or location missing');
      url = validateUrl(new URL(location, url).href);
      continue;
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`Static artifact download failed: HTTP ${response.status}`);
    }
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxDownload)) {
      await response.body?.cancel();
      throw new Error('Static artifact download exceeds size limit');
    }
    if (!response.body) throw new Error('Static artifact download has no body');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > maxDownload) throw new Error('Static artifact download exceeds size limit');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, size);
  }
  throw new Error('Static artifact redirect limit exceeded');
}

const extractScript = String.raw`
import os, pathlib, shutil, stat, sys, unicodedata, zipfile
archive, destination = sys.argv[1:]
MAX_FILES, MAX_TOTAL, MAX_FILE = 10000, 200 * 1024 * 1024, 50 * 1024 * 1024
with zipfile.ZipFile(archive) as z:
    entries = z.infolist()
    if not entries or len(entries) > MAX_FILES:
        raise ValueError('Static archive entry count exceeds limit or archive is empty')
    seen, directories, regular, planned = set(), set(), set(), []
    total = 0
    for info in entries:
        name = info.orig_filename
        if not name or name.startswith('/') or any(ord(c) in [0, 92] for c in name) or '%' in name or ':' in name:
            raise ValueError('Unsafe static archive path')
        parts = name.rstrip('/').split('/')
        if any(part in ['', '.', '..'] for part in parts):
            raise ValueError('Unsafe static archive path')
        # Public exports never contain workspace sources, dependencies or source maps.
        forbidden_parts = {'.git', '.next', 'src', 'server', 'node_modules'}
        if any(part.casefold() in forbidden_parts or part.casefold().startswith('.env') for part in parts) or parts[-1].casefold().endswith('.map'):
            raise ValueError('Static archive contains private source or workspace files')
        normalized = '/'.join(unicodedata.normalize('NFC', part) for part in parts)
        if normalized in seen:
            raise ValueError('Duplicate normalized static archive path')
        seen.add(normalized)
        mode = stat.S_IFMT(info.external_attr >> 16)
        is_dir = info.is_dir()
        if mode not in ([0, stat.S_IFDIR] if is_dir else [0, stat.S_IFREG]):
            raise ValueError('Static archive contains a symlink or nonregular entry')
        if info.flag_bits & 1:
            raise ValueError('Encrypted static archives are unsupported')
        if info.compress_type not in [zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED]:
            raise ValueError('Unsupported static archive compression')
        if info.file_size > MAX_FILE:
            raise ValueError('Static archive file exceeds size limit')
        total += info.file_size
        if total > MAX_TOTAL:
            raise ValueError('Static archive expanded size exceeds limit')
        ancestors = ['/'.join(normalized.split('/')[:i]) for i in range(1, len(parts))]
        if any(parent in regular for parent in ancestors) or (not is_dir and normalized in directories):
            raise ValueError('Static archive file and directory paths conflict')
        directories.update(ancestors)
        (directories if is_dir else regular).add(normalized)
        planned.append((info, parts, is_dir))
    if not regular:
        raise ValueError('Static archive contains no regular files')
    actual_total = 0
    for info, parts, is_dir in planned:
        output = pathlib.Path(destination).joinpath(*parts)
        if is_dir:
            output.mkdir(parents=True, exist_ok=True, mode=0o755)
            continue
        output.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        actual_file = 0
        with z.open(info) as source, output.open('xb') as target:
            while True:
                chunk = source.read(65536)
                if not chunk: break
                actual_file += len(chunk)
                actual_total += len(chunk)
                if actual_file > MAX_FILE or actual_file > info.file_size or actual_total > MAX_TOTAL:
                    raise ValueError('Static archive expanded size exceeds limit')
                target.write(chunk)
        if actual_file != info.file_size:
            raise ValueError('Static archive file size mismatch')
        output.chmod(0o644)
`;

async function assertAbsent(target) {
  try { await lstat(target); } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('Static artifact target already exists');
}

export async function materializeStaticArtifact(site, target, { fetchImpl = fetch } = {}) {
  const artifact = site.staticArtifact;
  if (!artifact || !/^[a-f0-9]{64}$/.test(artifact.sha256) || !/^[a-f0-9]{40}$/.test(artifact.sourceSha)) throw new Error('Invalid static artifact digest or source SHA');
  const destination = resolve(target);
  await assertAbsent(destination);
  const bytes = await downloadArtifact(artifact.url, fetchImpl);
  if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) throw new Error('Static artifact SHA256 mismatch');
  const temporary = await mkdtemp(join(tmpdir(), 'xk-static-artifact-'));
  let staging;
  try {
    const archive = join(temporary, 'artifact.zip');
    await writeFile(archive, bytes, { flag: 'wx', mode: 0o600 });
    await mkdir(dirname(destination), { recursive: true });
    staging = await mkdtemp(join(dirname(destination), '.static-artifact-'));
    await run('python3', ['-c', extractScript, archive, staging], { timeout: 60000, maxBuffer: 1024 * 1024 });
    await assertAbsent(destination);
    await rename(staging, destination);
    staging = undefined;
  } finally {
    await rm(temporary, { recursive: true, force: true });
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

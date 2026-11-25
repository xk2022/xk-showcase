import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { materializeStaticArtifact } from './static-artifact.mjs';
import { validateExport } from './static-export.mjs';

const repository = 'xk2022/xk-website-showcase';
const maxZip = 30 * 1024 * 1024;
const manifestName = 'release-manifest.json';
// Publication inputs select only reviewed projects, never arbitrary repository,
// slug, asset or release names. Omitted INPUT_PROJECT preserves the original job.
const projects = {
  shengfengyang: {
    sourceRepository: 'xk2022/xk-brand-shengfengyang',
    archiveName: 'shengfengyang-static.zip', name: '昇豐陽食品｜靜態提案',
    policy: { indexable: false, listed: false },
  },
  carpentry: {
    sourceRepository: 'xk2022/xk-lp-carpentry',
    archiveName: 'carpentry-static.zip', name: '木作職人｜靜態展示',
    policy: {},
  },
};

function inputs(env) {
  if (env.GITHUB_REPOSITORY !== repository) throw new Error('Static publication is restricted to the Showcase Hub');
  const project = env.INPUT_PROJECT === undefined ? 'shengfengyang' : env.INPUT_PROJECT;
  if (typeof project !== 'string' || !Object.hasOwn(projects, project)) throw new Error('Invalid INPUT_PROJECT');
  for (const key of ['INPUT_BLOB_SHA', 'INPUT_SOURCE_SHA', 'GITHUB_SHA']) {
    if (!/^[a-f0-9]{40}$/.test(env[key] ?? '')) throw new Error(`Invalid ${key}`);
  }
  if (!/^[a-f0-9]{64}$/.test(env.INPUT_SHA256 ?? '')) throw new Error('Invalid INPUT_SHA256');
  if (!/^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '')) throw new Error('Invalid GITHUB_RUN_ID');
  if (!env.GH_TOKEN || /\s/.test(env.GH_TOKEN)) throw new Error('Missing or invalid Hub publication token');
  return {
    project,
    blobSha: env.INPUT_BLOB_SHA, sha256: env.INPUT_SHA256,
    sourceSha: env.INPUT_SOURCE_SHA, hubSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID, token: env.GH_TOKEN,
  };
}

async function jsonResponse(response, limit = 45 * 1024 * 1024) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('GitHub API response exceeds size limit');
  if (!response.body) throw new Error('GitHub API response has no body');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new Error('GitHub API response exceeds size limit');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks, size).toString('utf8')); }
  catch { throw new Error('Invalid GitHub API JSON'); }
}

export async function publishStaticArtifact({ env = process.env, fetchImpl = fetch } = {}) {
  const input = inputs(env);
  const { sourceRepository, archiveName, name, policy } = projects[input.project];
  const tag = `${input.project}-${input.sourceSha.slice(0, 7)}-v1`;
  const downloadUrl = `https://github.com/${repository}/releases/download/${tag}/${archiveName}`;
  const site = {
    slug: input.project, repository: sourceRepository, ref: input.sourceSha,
    ...policy,
    staticArtifact: { url: downloadUrl, sha256: input.sha256, sourceSha: input.sourceSha },
  };
  // Authenticated calls are constructed only for this fixed Hub repository.
  // Redirects are never followed with the workflow credential.
  async function api(path, { method = 'GET', body, allow404 = false } = {}) {
    if (!path.startsWith(`/repos/${repository}/`)) throw new Error('Unsafe Hub API path');
    const response = await fetchImpl(`https://api.github.com${path}`, {
      method, redirect: 'manual', signal: AbortSignal.timeout(30000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${input.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (allow404 && response.status === 404) { await response.body?.cancel(); return undefined; }
    if (response.status < 200 || response.status >= 300) { await response.body?.cancel(); throw new Error(`Hub API ${method} failed: HTTP ${response.status}`); }
    return jsonResponse(response);
  }

  const blob = await api(`/repos/${repository}/git/blobs/${input.blobSha}`);
  if (blob.sha !== input.blobSha || blob.encoding !== 'base64' || !Number.isSafeInteger(blob.size) || blob.size < 1 || blob.size > maxZip || typeof blob.content !== 'string') throw new Error('Invalid static artifact Git blob metadata');
  const encoded = blob.content.replace(/[\r\n\t ]/g, '');
  if (encoded.length !== Math.ceil(blob.size / 3) * 4 || /[^A-Za-z0-9+/=]/.test(encoded)) throw new Error('Invalid static artifact blob encoding');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== blob.size || bytes.length > maxZip || bytes.toString('base64') !== encoded) throw new Error('Invalid static artifact blob size or encoding');
  if (createHash('sha256').update(bytes).digest('hex') !== input.sha256) throw new Error('Static artifact blob SHA256 mismatch');
  const gitSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (gitSha !== input.blobSha) throw new Error('Static artifact Git blob SHA mismatch');

  const temporary = await mkdtemp(join(tmpdir(), 'publish-static-artifact-'));
  try {
    const local = join(temporary, 'validated-export');
    // Reuse bounded safe ZIP extraction; this fake fetch supplies only the
    // verified bytes. No source code, package lifecycle or private API is run.
    await materializeStaticArtifact(site, local, { fetchImpl: async () => new Response(bytes) });
    await validateExport(local, site);

    const existing = await api(`/repos/${repository}/releases/tags/${tag}`, { allow404: true });
    if (existing) {
      let recorded;
      try { recorded = JSON.parse(existing.body); } catch { throw new Error('Existing static release has no verifiable manifest body'); }
      if (existing.tag_name !== tag || existing.draft !== false || recorded.sourceSha !== input.sourceSha || recorded.sha256 !== input.sha256 || recorded.sourceRepository !== sourceRepository) throw new Error('Existing static release differs or is still a draft; inspect it without overwriting assets');
      for (const name of [archiveName, manifestName]) {
        if ((existing.assets ?? []).filter(asset => asset.name === name).length !== 1) throw new Error('Existing static release is incomplete or has duplicate assets');
      }
      const published = join(temporary, 'existing-public-export');
      await materializeStaticArtifact(site, published, { fetchImpl });
      await validateExport(published, site);
      return { tag, url: downloadUrl, sha256: input.sha256, sourceSha: input.sourceSha, reused: true };
    }

    const manifest = {
      schemaVersion: 1, sourceRepository, sourceSha: input.sourceSha, sha256: input.sha256,
      staticOnly: true,
      publication: {
        repository, commitSha: input.hubSha,
        workflow: '.github/workflows/deploy.yml', runId: input.runId,
        runUrl: `https://github.com/${repository}/actions/runs/${input.runId}`,
      },
      verification: 'Verified compiled static export only; this publication job does not query private source CI.',
    };
    const created = await api(`/repos/${repository}/releases`, { method: 'POST', body: {
      tag_name: tag, target_commitish: input.hubSha,
      name: `${name} ${input.sourceSha.slice(0, 7)}`,
      body: JSON.stringify(manifest, null, 2), draft: true, prerelease: true,
    } });
    if (!Number.isSafeInteger(created.id) || created.id < 1 || created.tag_name !== tag || created.draft !== true) throw new Error('Unexpected draft release response');

    async function upload(name, content, type) {
      const response = await fetchImpl(`https://uploads.github.com/repos/${repository}/releases/${created.id}/assets?name=${encodeURIComponent(name)}`, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(60000),
        headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/vnd.github+json', 'Content-Type': type, 'Content-Length': String(content.length) },
        body: content,
      });
      if (response.status !== 201) { await response.body?.cancel(); throw new Error(`Static release asset upload failed: HTTP ${response.status}`); }
      const uploaded = await jsonResponse(response, 1024 * 1024);
      if (uploaded.name !== name || uploaded.state !== 'uploaded' || uploaded.size !== content.length) throw new Error('Unexpected static release asset upload response');
    }
    await upload(archiveName, bytes, 'application/zip');
    await upload(manifestName, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), 'application/json');
    const published = await api(`/repos/${repository}/releases/${created.id}`, { method: 'PATCH', body: { draft: false, prerelease: true } });
    if (published.draft !== false || published.tag_name !== tag) throw new Error('Static release was not published');
    return { tag, url: downloadUrl, sha256: input.sha256, sourceSha: input.sourceSha, reused: false };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await publishStaticArtifact())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { materializeStaticArtifact } from './static-artifact.mjs';
import { origin, validateExport } from './static-export.mjs';

const repository = 'xk2022/xk-website-showcase';
const maxZip = 30 * 1024 * 1024;
const manifestName = 'release-manifest.json';
// Publication inputs select only reviewed projects, never arbitrary repository,
// slug, asset or release names. Omitted INPUT_PROJECT preserves the original job.
const projects = {
  'taiyang-logistics': {
    sourceRepository: 'xk2022/xk-lp-taiyang-logistics',
    archiveName: 'taiyang-logistics-static.zip', name: '太陽國際物流｜貨櫃陸運需求整理',
    policy: { framework: 'next' },
  },
  'consulting-chengce': {
    sourceRepository: 'xk2022/xk-lp-consulting-chengce',
    archiveName: 'consulting-chengce-static.zip', name: '澄策企業顧問工作室',
    // Retain the registered Next export contract, including its sitemap.
    // Preview noindex remains part of the reviewed source HTML.
    policy: { framework: 'next' },
  },
  honest: {
    sourceRepository: 'xk2022/xk-lp-honest-diecut',
    archiveName: 'honest-static.zip', name: '宏能興業｜製造業詢價展示',
    policy: { framework: 'next' },
  },
  'hongjia-birdnest': {
    sourceRepository: 'xk2022/xk-lp-hongjia-birdnest',
    archiveName: 'hongjia-birdnest-static.zip', name: '宏家燕窩｜送禮洽詢展示',
    policy: { framework: 'next' },
  },
  rotaract: {
    sourceRepository: 'xk2022/xk-app-rotaract',
    archiveName: 'rotaract-static.zip', name: '扶青萬花筒｜合成資料互動展示',
    policy: { framework: 'interactive', indexable: false, env: { VITE_SHOWCASE_DEMO: 'true' } },
  },
  'rui-cafe': {
    sourceRepository: 'xk2022/xk-brand-rui-cafe',
    archiveName: 'rui-cafe-static.zip', name: '蕋咖啡 Rui Café｜非官方品牌網站提案',
    policy: { framework: 'next', status: 'proposal', indexable: false, listed: true },
  },
  'little-me-owner-demo': {
    sourceRepository: 'xk2022/xk-app-little-me-inventory',
    archiveName: 'little-me-owner-demo-static.zip', name: 'Little Me｜店主庫存互動展示',
    policy: { framework: 'interactive', indexable: false },
  },
  shengfengyang: {
    sourceRepository: 'xk2022/xk-brand-shengfengyang',
    archiveName: 'shengfengyang-static.zip', name: '昇豐陽食品｜靜態提案',
    policy: { indexable: false, listed: false },
  },
  'guanghai-software': {
    sourceRepository: 'xk2022/xk-lp-guanghai-software',
    archiveName: 'guanghai-software-static.zip', name: '廣海軟體有限公司｜企業軟體需求整理',
    policy: {},
  },
  'qiangang-windows': {
    sourceRepository: 'xk2022/xk-lp-qiangang-windows',
    archiveName: 'qiangang-windows-static.zip', name: '萬花筒塑鋼門窗｜XK Demo',
    releaseRevision: 2, policy: {},
  },
  carpentry: {
    // 新快照使用更名後的模板來源；舊來源 Release 保留原貌，身份不符時不會被改寫或重用。
    sourceRepository: 'xk2022/xk-template-lp',
    archiveName: 'carpentry-static.zip', name: '職人產業 LP Template｜六產業靜態展示',
    policy: {},
  },
  'hongjia-brand': {
    sourceRepository: 'xk2022/xk-brand-hongjia-birdnest',
    archiveName: 'hongjia-brand-static.zip', name: '宏家燕窩 Brand｜自主規劃展示',
    policy: { framework: 'next', indexable: true, listed: true },
  },
};

// This selector promotes the existing four-page indexable Brand site only.
// Preparation source CI stays separately recorded; these checks inspect ZIP bytes.
async function validateHongjiaBrand(directory) {
  const home = `${origin}/hongjia-brand/`;
  const routes = ['', 'brand/', 'gifting/', 'journal/'];
  const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(([, key, , value]) => [key.toLowerCase(), value]));
  const xml = await readFile(join(directory, 'sitemap.xml'), 'utf8');
  const locations = [...xml.matchAll(/<loc\b[^>]*>(.*?)<\/loc>/gs)].map(([, value]) => value.trim()).sort();
  if (JSON.stringify(locations) !== JSON.stringify(routes.map(route => home + route).sort())) throw new Error('Hongjia Brand sitemap must contain exactly its four routes');
  for (const route of routes) {
    const html = await readFile(join(directory, route, 'index.html'), 'utf8');
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0])).filter(tag => tag.rel?.toLowerCase() === 'canonical');
    if (canonical.length !== 1 || canonical[0].href !== home + route) throw new Error(`Incorrect Hongjia Brand canonical URL: ${route || '/'}`);
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    if (headings.length !== 1 || !headings[0][1].replace(/<[^>]*>/g, '').trim()) throw new Error(`Hongjia Brand requires one nonempty H1: ${route || '/'}`);
    const robots = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).filter(tag => tag.name?.toLowerCase() === 'robots');
    if (robots.some(tag => (tag.content || '').toLowerCase().split(/[\s,]+/).some(token => ['noindex', 'nofollow', 'none'].includes(token)))) throw new Error(`Hongjia Brand must retain its indexable policy: ${route || '/'}`);
  }
}

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
  const { sourceRepository, archiveName, name, policy, releaseRevision = 1 } = projects[input.project];
  const tag = `${input.project}-${input.sourceSha.slice(0, 7)}-v${releaseRevision}`;
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
    if (input.project === 'hongjia-brand') await validateHongjiaBrand(local);

    const generatedManifest = {
      schemaVersion: 1, sourceRepository, sourceSha: input.sourceSha, sha256: input.sha256,
      staticOnly: true,
      publication: {
        repository, commitSha: input.hubSha,
        workflow: '.github/workflows/deploy.yml', runId: input.runId,
        runUrl: `https://github.com/${repository}/actions/runs/${input.runId}`,
      },
      verification: 'Verified compiled static export only; this publication job does not query private source CI.',
    };
    let manifest = generatedManifest;
    let created;
    let existing = await api(`/repos/${repository}/releases/tags/${tag}`, { allow404: true });
    if (!existing && input.project === 'rotaract') {
      // GitHub's by-tag endpoint can omit unpublished drafts. Prove absence
      // through a bounded Hub-only inventory before creating another draft.
      const matches = [];
      let complete = false;
      for (let page = 1; page <= 3; page++) {
        const releases = await api(`/repos/${repository}/releases?per_page=100&page=${page}`);
        if (!Array.isArray(releases) || releases.length > 100) throw new Error('Invalid Hub release inventory');
        matches.push(...releases.filter(release => release.tag_name === tag));
        if (matches.length > 1) throw new Error('Multiple Rotaract releases have the expected tag; refusing ambiguous recovery');
        if (releases.length < 100) { complete = true; break; }
      }
      if (!complete) throw new Error('Hub release inventory exceeds Rotaract recovery bounds');
      if (matches.length) {
        const id = matches[0].id;
        if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid Rotaract release identity');
        existing = await api(`/repos/${repository}/releases/${id}`);
        if (existing.id !== id || existing.tag_name !== tag) throw new Error('Rotaract release changed during recovery lookup');
      }
    }
    if (existing) {
      let recorded;
      try { recorded = JSON.parse(existing.body); } catch { throw new Error('Existing static release has no verifiable manifest body'); }
      if (existing.tag_name !== tag || recorded.sourceSha !== input.sourceSha || recorded.sha256 !== input.sha256 || recorded.sourceRepository !== sourceRepository) throw new Error('Existing static release differs; inspect it without overwriting assets');
      if (existing.draft === true && input.project === 'rotaract') {
        // Resume only this helper's matching Rotaract draft. GitHub-generated
        // asset digests prove identity before missing assets can be added.
        const publication = recorded.publication;
        if (!Number.isSafeInteger(existing.id) || existing.id < 1 || existing.prerelease !== true || !Array.isArray(existing.assets)
          || Object.keys(recorded).sort().join(',') !== Object.keys(generatedManifest).sort().join(',')
          || recorded.schemaVersion !== 1 || recorded.staticOnly !== true || recorded.verification !== generatedManifest.verification
          || !publication || Object.keys(publication).sort().join(',') !== Object.keys(generatedManifest.publication).sort().join(',')
          || publication.repository !== repository || publication.workflow !== generatedManifest.publication.workflow
          || !/^[a-f0-9]{40}$/.test(publication.commitSha ?? '') || existing.target_commitish !== publication.commitSha
          || !/^[1-9][0-9]{0,19}$/.test(publication.runId ?? '') || typeof publication.runId !== 'string'
          || publication.runUrl !== `https://github.com/${repository}/actions/runs/${publication.runId}`
          || existing.body !== JSON.stringify(recorded, null, 2)) throw new Error('Existing Rotaract draft has unverified publication provenance');
        created = existing;
        manifest = recorded;
      } else {
        if (existing.draft !== false) throw new Error('Existing static release is still a draft; inspect it without overwriting assets');
        for (const name of [archiveName, manifestName]) {
          if ((existing.assets ?? []).filter(asset => asset.name === name).length !== 1) throw new Error('Existing static release is incomplete or has duplicate assets');
        }
        const published = join(temporary, 'existing-public-export');
        await materializeStaticArtifact(site, published, { fetchImpl });
        await validateExport(published, site);
        if (input.project === 'hongjia-brand') await validateHongjiaBrand(published);
        return { tag, url: downloadUrl, sha256: input.sha256, sourceSha: input.sourceSha, reused: true };
      }
    }

    const assets = new Map([
      [archiveName, { content: bytes, type: 'application/zip' }],
      [manifestName, { content: Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), type: 'application/json' }],
    ]);
    const present = new Set();
    if (created) {
      // Check every existing asset before making any write, including assets
      // whose upload succeeded before an earlier attempt failed.
      for (const asset of created.assets) {
        const expected = assets.get(asset.name);
        if (!expected || present.has(asset.name) || !Number.isSafeInteger(asset.id) || asset.id < 1
          || asset.state !== 'uploaded' || asset.size !== expected.content.length
          || asset.digest !== `sha256:${createHash('sha256').update(expected.content).digest('hex')}`) throw new Error('Existing Rotaract draft asset differs or has no verified digest; refusing to overwrite');
        present.add(asset.name);
      }
    } else {
      created = await api(`/repos/${repository}/releases`, { method: 'POST', body: {
        tag_name: tag, target_commitish: input.hubSha,
        name: `${name} ${input.sourceSha.slice(0, 7)}`,
        body: JSON.stringify(manifest, null, 2), draft: true, prerelease: true,
        ...(input.project === 'rotaract' ? { make_latest: 'false' } : {}),
      } });
      if (!Number.isSafeInteger(created.id) || created.id < 1 || created.tag_name !== tag || created.draft !== true) throw new Error('Unexpected draft release response');
    }

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
    for (const [name, asset] of assets) {
      if (!present.has(name)) await upload(name, asset.content, asset.type);
    }
    const published = await api(`/repos/${repository}/releases/${created.id}`, { method: 'PATCH', body: { draft: false, prerelease: true, ...(input.project === 'rotaract' ? { make_latest: 'false' } : {}) } });
    if (published.draft !== false || published.tag_name !== tag) throw new Error('Static release was not published');
    return { tag, url: downloadUrl, sha256: input.sha256, sourceSha: input.sourceSha, reused: false, ...(existing?.draft ? { resumed: true } : {}) };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await publishStaticArtifact())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

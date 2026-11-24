import { validateSites } from './static-export.mjs';

export const brandRepository = 'xk2022/xk-brand-hongjia-birdnest';
export const requiredBrandChecks = ['Verify root static export', 'Verify subpath static export'];
export const isSha = value => /^[a-f0-9]{40}$/.test(value);

export async function githubRequest(path, { token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response = await fetchImpl(`https://api.github.com/${path}`, { headers, signal: AbortSignal.timeout(15000) });
  // All registry sources are public. A hub-scoped GITHUB_TOKEN may not have
  // cross-repository checks access (403 or concealed 404); anonymous public
  // reads use the same API and still fail closed if the resource is private/missing.
  if ([403, 404].includes(response.status) && token) {
    const { Authorization: omitted, ...publicHeaders } = headers;
    response = await fetchImpl(`https://api.github.com/${path}`, { headers: publicHeaders, signal: AbortSignal.timeout(15000) });
  }
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${path}`);
  return response.json();
}

export function assertSuccessfulBrandChecks(checks, sha) {
  for (const name of requiredBrandChecks) {
    const latest = checks.filter(check => check.name === name && check.head_sha === sha && check.app?.slug === 'github-actions').sort((a, b) => b.id - a.id)[0];
    if (latest?.status !== 'completed' || latest.conclusion !== 'success') {
      throw new Error(`Brand source ${sha} needs successful CI: ${name} (${latest?.conclusion || latest?.status || 'missing'})`);
    }
  }
}

export async function resolveSources(sites, request = githubRequest) {
  validateSites(sites);
  const resolved = await Promise.all(sites.map(async site => {
    if (typeof site.ref !== 'string' || !site.ref) throw new Error(`Missing source ref: ${site.slug}`);
    const commit = await request(`repos/${site.repository}/commits/${encodeURIComponent(site.ref)}`);
    if (!isSha(commit.sha)) throw new Error(`Invalid resolved commit: ${site.slug}`);
    return { ...site, sha: commit.sha };
  }));
  for (const site of resolved.filter(site => site.repository === brandRepository)) {
    const data = await request(`repos/${site.repository}/commits/${site.sha}/check-runs?filter=latest&per_page=100`);
    assertSuccessfulBrandChecks(data.check_runs || [], site.sha);
  }
  return resolved;
}

export function validateResolvedSources(sites, resolved) {
  validateSites(sites);
  if (!Array.isArray(resolved) || resolved.length !== sites.length) throw new Error('Resolved source plan does not match registry');
  for (const site of sites) {
    const candidate = resolved.find(entry => entry.slug === site.slug);
    if (!candidate || !isSha(candidate.sha)) throw new Error(`Missing resolved SHA: ${site.slug}`);
    const { sha, ...registration } = candidate;
    if (JSON.stringify(registration) !== JSON.stringify(site)) throw new Error(`Resolved registration changed: ${site.slug}`);
  }
}

export function assertFreshPublication({ expectedSha, currentSha, runNumber, runs }) {
  if (!isSha(expectedSha) || expectedSha !== currentSha) throw new Error('Publication superseded: Hub main changed');
  const newer = runs.find(run => run.head_branch === 'main' && ['push', 'workflow_dispatch'].includes(run.event) && run.run_number > Number(runNumber));
  if (newer) throw new Error(`Publication superseded by newer main run ${newer.id}`);
}

export function sourceBuildEnvironment(environment, configured = {}) {
  const publicEntries = entries => Object.fromEntries(Object.entries(entries).filter(([key]) => !/(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTHORIZATION|PRIVATE_KEY)/i.test(key)));
  return { ...publicEntries(environment), NEXT_TELEMETRY_DISABLED: '1', ...publicEntries(configured) };
}

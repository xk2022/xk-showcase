import { isSha, resolveSources, validateResolvedSources } from './release.mjs';
import { verifyRelease, validateReleaseEvidence } from './release-gate.mjs';

export const transportRepository = 'xk2022/xk-corp-truck-transport';
export const transportGate = { workflow: '.github/workflows/deploy-pages.yml', job: 'Validate Hub build' };
export const hubRepository = 'xk2022/xk-website-showcase';
const registryPath = 'config/showcases.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const formatRegistry = sites => `[\n${sites.map(site => `  ${JSON.stringify(site)}`).join(',\n')}\n]\n`;

export function transportRegistration(sites) {
  const rows = sites.filter(site => site.slug === 'truck-transport');
  if (rows.length !== 1 || rows[0].repository !== transportRepository || !same(rows[0].releaseGate, transportGate) || !isSha(rows[0].ref)) throw new Error('Transport sync requires the trusted repository, exact pinned SHA and Validate Hub build release gate');
  return rows[0];
}

export function assertSyncCandidate(plan) {
  if (plan?.version !== 1 || !isSha(plan.hubSha) || !isSha(plan.registryBlobSha) || !isSha(plan.sourceSha) || typeof plan.originalRegistry !== 'string' || typeof plan.candidateRegistry !== 'string') throw new Error('Invalid transport sync candidate');
  const original = JSON.parse(plan.originalRegistry);
  const candidate = JSON.parse(plan.candidateRegistry);
  const before = transportRegistration(original);
  const after = transportRegistration(candidate);
  const expected = original.map(site => site.slug === before.slug ? { ...site, ref: plan.sourceSha } : site);
  if (after.ref !== plan.sourceSha || !same(candidate, expected) || before.ref === after.ref) throw new Error('Sync candidate changes more than the transport source pin');
  validateResolvedSources(candidate, plan.resolvedSources);
  const resolved = plan.resolvedSources.find(site => site.slug === after.slug);
  validateReleaseEvidence(after, plan.sourceSha, resolved.release);
  return { original, candidate, transport: after };
}

// Documentation-only [skip ci] commits need not block promotion. Select the
// latest successful main push run, then verify its exact SHA/workflow/job again.
export async function latestSuccessfulTransport(request) {
  const workflow = transportGate.workflow.split('/').at(-1);
  const data = await request(`repos/${transportRepository}/actions/workflows/${workflow}/runs?branch=main&event=push&status=success&per_page=100`);
  if (!Array.isArray(data.workflow_runs)) throw new Error('Invalid transport workflow list');
  const matching = data.workflow_runs.filter(run => run.head_branch === 'main' && run.event === 'push' && run.path === transportGate.workflow && run.head_repository?.full_name === transportRepository && run.status === 'completed' && run.conclusion === 'success');
  const latest = matching.sort((a, b) => (b.run_number - a.run_number) || (b.id - a.id))[0];
  if (!latest) return undefined;
  if (!isSha(latest.head_sha) || !Number.isSafeInteger(latest.id)) throw new Error('Invalid successful transport source run');
  return latest;
}

// Inspection only reads public API metadata; install/build/test never runs here.
export async function inspectTransportSync({ originalRegistry, hubSha, registryBlobSha }, request) {
  if (!isSha(hubSha) || !isSha(registryBlobSha)) throw new Error('Invalid Hub inspection context');
  const sites = JSON.parse(originalRegistry);
  const transport = transportRegistration(sites);
  const main = await request(`repos/${hubRepository}/commits/main`);
  if (main.sha !== hubSha) return { changed: false, reason: 'Hub main changed; a later sync will inspect the new revision' };
  const source = await latestSuccessfulTransport(request);
  if (!source) return { changed: false, reason: 'No successful transport main push workflow is available' };
  const sourceSha = source.head_sha;
  if (sourceSha === transport.ref) return { changed: false, reason: 'Latest successful transport main push is already pinned' };
  const next = { ...transport, ref: sourceSha };
  try {
    await verifyRelease(next, sourceSha, request);
  } catch (error) {
    if (!/^Release gate (?:not satisfied|job .* is not successful|changed during verification)/.test(error.message)) throw error;
    return { changed: false, reason: `Latest successful source run is not approved: ${error.message}` };
  }
  const candidate = sites.map(site => site.slug === transport.slug ? next : site);
  const resolvedSources = await resolveSources(candidate, request);
  const latestSource = await latestSuccessfulTransport(request);
  if (latestSource?.head_sha !== sourceSha || latestSource.id !== source.id) return { changed: false, reason: 'A newer successful source run appeared during inspection' };
  const plan = { version: 1, hubSha, registryBlobSha, sourceSha, originalRegistry, candidateRegistry: formatRegistry(candidate), resolvedSources };
  assertSyncCandidate(plan);
  return { changed: true, plan };
}

const commitMessage = sha => `chore: sync verified transport ${sha.slice(0, 12)}`;

// This runs in the credential-bearing publication job, never alongside source code.
// PUT's expected blob SHA prevents a changed registry from being overwritten.
export async function publishTransportSync(plan, request) {
  const { candidate, transport } = assertSyncCandidate(plan);
  const [main, currentFile, source] = await Promise.all([
    request(`repos/${hubRepository}/commits/main`),
    request(`repos/${hubRepository}/contents/${registryPath}?ref=main`),
    latestSuccessfulTransport(request),
  ]);
  if (source?.head_sha !== plan.sourceSha) throw new Error('Sync superseded: a newer successful source main push is available');
  if (!isSha(currentFile.sha) || currentFile.encoding !== 'base64' || typeof currentFile.content !== 'string') throw new Error('Invalid current Hub registry blob');
  const currentText = Buffer.from(currentFile.content, 'base64').toString('utf8');
  // Recover a prior successful conditional commit whose workflow dispatch failed.
  // An unrelated main commit or edited registry is never accepted as this retry.
  const retry = main.sha !== plan.hubSha && currentText === plan.candidateRegistry && main.commit?.message === commitMessage(plan.sourceSha) && main.parents?.some(parent => parent.sha === plan.hubSha);
  if (!retry && (main.sha !== plan.hubSha || currentFile.sha !== plan.registryBlobSha || currentText !== plan.originalRegistry)) throw new Error('Sync superseded: Hub main or registry changed');
  await verifyRelease(transport, plan.sourceSha, request);
  const currentSource = await latestSuccessfulTransport(request);
  const currentHub = await request(`repos/${hubRepository}/commits/main`);
  if (currentSource?.head_sha !== plan.sourceSha || currentHub.sha !== main.sha) throw new Error('Sync superseded during final publication checks');
  let commitSha = main.sha;
  if (!retry) {
    const update = await request(`repos/${hubRepository}/contents/${registryPath}`, { method: 'PUT', body: {
      message: commitMessage(plan.sourceSha), branch: 'main', sha: plan.registryBlobSha,
      content: Buffer.from(plan.candidateRegistry).toString('base64'),
    } });
    commitSha = update.commit?.sha;
    if (!isSha(commitSha)) throw new Error('Transport pin update did not return a commit SHA');
    // API conditional blob SHA guards registry edits; also verify the resulting
    // commit parent so unrelated main movement cannot silently become a release.
    const updated = await request(`repos/${hubRepository}/commits/${commitSha}`);
    if (updated.parents?.length !== 1 || updated.parents[0].sha !== plan.hubSha) throw new Error('Hub main moved during pin update; registry is pinned but automatic deployment was withheld. Review the new commit and run Showcase Hub manually.');
  }
  const head = await request(`repos/${hubRepository}/commits/main`);
  if (head.sha !== commitSha) throw new Error('Hub main changed before deployment dispatch');
  // Commits made by GITHUB_TOKEN do not trigger push workflows, so dispatch is mandatory.
  await request(`repos/${hubRepository}/actions/workflows/deploy.yml/dispatches`, { method: 'POST', body: { ref: 'main' } });
  return { commitSha, sourceSha: transport.ref, resumed: retry, sites: candidate.length };
}

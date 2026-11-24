import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectTransportSync, publishTransportSync, assertSyncCandidate, latestSuccessfulTransport, transportRegistration, transportRepository, transportGate, hubRepository } from '../scripts/transport-sync.mjs';
import { sourceEnvironment } from '../scripts/release-gate.mjs';

const hubSha = 'a'.repeat(40);
const oldSha = 'b'.repeat(40);
const sourceSha = 'c'.repeat(40);
const blobSha = 'd'.repeat(40);
const pinSha = 'e'.repeat(40);
const newerSha = 'f'.repeat(40);
const transport = { slug: 'truck-transport', name: 'Transport', category: 'Demo', repository: transportRepository, ref: oldSha, releaseGate: transportGate, env: { GITHUB_PAGES: 'true', NEXT_PUBLIC_BASE_PATH: '/truck-transport' } };
const sites = [...Array.from({ length: 8 }, (_, i) => ({ slug: `existing-${i}`, name: `Existing ${i}`, repository: `xk2022/existing-${i}`, ref: oldSha, env: { BASE_PATH: `/existing-${i}/` } })), transport];
const originalRegistry = JSON.stringify(sites, null, 2) + '\n';
const input = { originalRegistry, hubSha, registryBlobSha: blobSha };
const run = (sha = sourceSha, change = {}) => ({ id: 91, run_number: 19, run_attempt: 1, head_sha: sha, head_branch: 'main', head_repository: { full_name: transportRepository }, path: transportGate.workflow, event: 'push', status: 'completed', conclusion: 'success', ...change });
const job = (sha = sourceSha, change = {}) => ({ id: 190, run_id: 91, run_attempt: 1, head_sha: sha, name: transportGate.job, status: 'completed', conclusion: 'success', ...change });
const clone = value => structuredClone(value);

function api(options = {}) {
  const state = { hubSha, registryText: originalRegistry, blobSha, successful: [run()], gateRuns: [run()], jobs: [job()], gateCurrent: run(), latestReads: 0, mainReads: 0, ...options };
  const calls = [];
  const request = async (path, mutation) => {
    calls.push({ path, mutation });
    if (path === `repos/${transportRepository}/commits/main`) throw new Error('Source HEAD must not replace the latest successful push selection');
    if (path === `repos/${hubRepository}/commits/main`) {
      state.mainReads++;
      if (state.onMainRead) state.onMainRead(state);
      return { sha: state.hubSha, commit: { message: state.commitMessage || '' }, parents: [{ sha: state.parentSha || hubSha }] };
    }
    if (path === `repos/${hubRepository}/contents/config/showcases.json?ref=main`) return { sha: state.blobSha, encoding: 'base64', content: Buffer.from(state.registryText).toString('base64') };
    if (path.includes('/actions/workflows/') && path.includes('status=success')) {
      state.latestReads++;
      if (state.onLatestRead) state.onLatestRead(state);
      return { total_count: state.successful.length, workflow_runs: clone(state.successful) };
    }
    if (path.includes('/actions/workflows/') && path.includes('head_sha=')) return { total_count: state.gateRuns.length, workflow_runs: clone(state.gateRuns) };
    if (path.includes('/attempts/')) return { total_count: state.jobs.length, jobs: clone(state.jobs) };
    if (path === `repos/${transportRepository}/actions/runs/91`) return clone(state.gateCurrent);
    if (mutation?.method === 'PUT' && path === `repos/${hubRepository}/contents/config/showcases.json`) {
      assert.equal(mutation.body.branch, 'main');
      assert.equal(mutation.body.sha, state.blobSha, 'PUT must condition on the inspected registry blob');
      state.registryText = Buffer.from(mutation.body.content, 'base64').toString('utf8');
      state.hubSha = pinSha;
      state.blobSha = newerSha;
      state.commitMessage = mutation.body.message;
      state.parentSha = hubSha;
      return { commit: { sha: pinSha } };
    }
    if (path === `repos/${hubRepository}/commits/${pinSha}`) return { sha: pinSha, parents: [{ sha: state.updatedParentSha || hubSha }] };
    if (mutation?.method === 'POST' && path === `repos/${hubRepository}/actions/workflows/deploy.yml/dispatches`) {
      assert.deepEqual(mutation.body, { ref: 'main' });
      if (state.dispatchFailures) { state.dispatchFailures--; throw new Error('Synthetic dispatch failure'); }
      return undefined;
    }
    if (path.includes('/commits/')) {
      const sha = decodeURIComponent(path.split('/commits/')[1]);
      assert.match(sha, /^[a-f0-9]{40}$/);
      return { sha };
    }
    throw new Error(`Unexpected mock API request: ${path}`);
  };
  return { state, calls, request };
}

async function candidate() {
  const mock = api();
  const inspected = await inspectTransportSync(input, mock.request);
  assert.equal(inspected.changed, true);
  return inspected.plan;
}

const mutations = mock => mock.calls.filter(call => call.mutation);

test('sync selects only the newest successful main push for the trusted workflow and repository', async () => {
  const invalid = [
    run(newerSha, { id: 100, run_number: 100, status: 'queued', conclusion: null }),
    run(newerSha, { id: 101, run_number: 101, conclusion: 'failure' }),
    run(newerSha, { id: 102, run_number: 102, event: 'pull_request' }),
    run(newerSha, { id: 103, run_number: 103, head_branch: 'feature' }),
    run(newerSha, { id: 104, run_number: 104, path: '.github/workflows/other.yml' }),
    run(newerSha, { id: 105, run_number: 105, head_repository: { full_name: 'outsider/fork' } }),
  ];
  const mock = api({ successful: [run(oldSha, { id: 80, run_number: 18 }), ...invalid, run()] });
  assert.equal((await latestSuccessfulTransport(mock.request)).head_sha, sourceSha);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].path, /branch=main&event=push&status=success/);
  mock.state.successful = invalid;
  assert.equal(await latestSuccessfulTransport(mock.request), undefined);
});

test('an already pinned successful push is a read-only no-op, independent of skip-CI documentation HEAD', async () => {
  const mock = api({ successful: [run(oldSha)] });
  const result = await inspectTransportSync(input, mock.request);
  assert.equal(result.changed, false);
  assert.match(result.reason, /already pinned/);
  assert.equal(mock.calls.length, 2);
  assert.equal(mutations(mock).length, 0);
  assert(mock.calls.every(({ path }) => path !== `repos/${transportRepository}/commits/main`));
});

test('inspection skips failed source releases and old Hub main without preparing a publishable candidate', async () => {
  for (const state of [
    { successful: [] },
    { gateRuns: [run(sourceSha, { status: 'in_progress', conclusion: null })] },
    { gateRuns: [run(sourceSha, { conclusion: 'failure' })] },
    { gateRuns: [run(sourceSha, { path: '.github/workflows/wrong.yml' })] },
    { jobs: [job(sourceSha, { name: 'Other job' })] },
    { jobs: [job(sourceSha, { conclusion: 'failure' })] },
    { gateCurrent: run(sourceSha, { run_attempt: 2, status: 'queued', conclusion: null }) },
    { hubSha: newerSha },
  ]) {
    const mock = api(state);
    const result = await inspectTransportSync(input, mock.request);
    assert.equal(result.changed, false);
    assert.equal(result.plan, undefined);
    assert.equal(mutations(mock).length, 0);
  }
});

test('inspection preserves the other eight registrations and freezes exact source CI evidence', async () => {
  const mock = api();
  const result = await inspectTransportSync(input, mock.request);
  assert.equal(result.changed, true);
  assert.equal(result.plan.sourceSha, sourceSha);
  const checked = assertSyncCandidate(result.plan);
  assert.deepEqual(checked.candidate.slice(0, 8), sites.slice(0, 8));
  assert.deepEqual(checked.transport, { ...transport, ref: sourceSha });
  assert.equal(result.plan.resolvedSources.length, 9);
  const source = result.plan.resolvedSources.find(site => site.slug === 'truck-transport');
  assert.equal(source.sha, sourceSha);
  assert.equal(source.release.sha, sourceSha);
  assert.equal(source.release.job, 'Validate Hub build');
  assert.equal(source.release.workflow, '.github/workflows/deploy-pages.yml');
  assert.equal(source.release.run_id, 91);
  assert.equal(mutations(mock).length, 0);
});

test('a newer successful source push during inspection supersedes the candidate', async () => {
  const mock = api({ onLatestRead: state => { if (state.latestReads > 1) state.successful = [run(newerSha, { id: 92, run_number: 20 })]; } });
  const result = await inspectTransportSync(input, mock.request);
  assert.equal(result.changed, false);
  assert.match(result.reason, /newer successful/);
  assert.equal(mutations(mock).length, 0);
});

test('candidate integrity rejects arbitrary registration edits, credential injection and missing release proof', async () => {
  const plan = await candidate();
  for (const change of [
    draft => { const entries = JSON.parse(draft.candidateRegistry); entries[0].ref = newerSha; draft.candidateRegistry = JSON.stringify(entries); },
    draft => { const entries = JSON.parse(draft.candidateRegistry); entries.at(-1).env.GH_TOKEN = 'synthetic-secret'; draft.candidateRegistry = JSON.stringify(entries); },
    draft => { draft.sourceSha = oldSha; },
    draft => { delete draft.resolvedSources.at(-1).release; },
    draft => { draft.resolvedSources.at(-1).release.sha = newerSha; },
  ]) {
    const invalid = clone(plan);
    change(invalid);
    assert.throws(() => assertSyncCandidate(invalid));
  }
  for (const broken of [
    { ...transport, repository: 'outsider/fork' },
    { ...transport, ref: 'main' },
    { ...transport, releaseGate: { ...transportGate, job: 'Other' } },
  ]) assert.throws(() => transportRegistration([broken]), /trusted repository/);
  const clean = sourceEnvironment({ PATH: '/usr/bin', HOME: '/tmp/runner', GH_TOKEN: 'synthetic-secret', GITHUB_TOKEN: 'synthetic-secret', ACTIONS_RUNTIME_TOKEN: 'synthetic-secret', CUSTOM_SECRET: 'synthetic-secret' }, transport.env);
  assert.doesNotMatch(JSON.stringify(clean), /synthetic-secret/);
});

test('publication rechecks Hub main, registry blob, successful source and the exact required CI job before mutation', async () => {
  const plan = await candidate();
  for (const state of [
    { hubSha: newerSha },
    { blobSha: newerSha },
    { registryText: originalRegistry + ' ' },
    { successful: [run(newerSha, { id: 92, run_number: 20 })] },
    { gateRuns: [run(sourceSha, { conclusion: 'failure' })] },
    { jobs: [job(sourceSha, { conclusion: 'failure' })] },
    { jobs: [job(sourceSha, { name: 'Unrelated job' })] },
    { onMainRead: state => { if (state.mainReads > 1) state.hubSha = newerSha; } },
  ]) {
    const mock = api(state);
    await assert.rejects(publishTransportSync(plan, mock.request));
    assert.equal(mutations(mock).length, 0);
  }
});

test('publication conditionally updates only the transport pin and explicitly dispatches the deployment workflow', async () => {
  const plan = await candidate();
  const mock = api();
  const result = await publishTransportSync(plan, mock.request);
  assert.equal(result.commitSha, pinSha);
  assert.equal(result.sourceSha, sourceSha);
  assert.equal(result.resumed, false);
  assert.deepEqual(mutations(mock).map(({ mutation }) => mutation.method), ['PUT', 'POST']);
  const update = mutations(mock)[0].mutation.body;
  assert.equal(update.sha, blobSha);
  assert.equal(update.branch, 'main');
  const updated = JSON.parse(Buffer.from(update.content, 'base64').toString());
  assert.deepEqual(updated.slice(0, 8), sites.slice(0, 8));
  assert.equal(updated.at(-1).ref, sourceSha);
  assert.equal(mutations(mock)[1].path, `repos/${hubRepository}/actions/workflows/deploy.yml/dispatches`);
});

test('publication withholds deployment when Hub changed between the last read and conditional update', async () => {
  const plan = await candidate();
  const mock = api({ updatedParentSha: newerSha });
  await assert.rejects(publishTransportSync(plan, mock.request), /automatic deployment was withheld/);
  assert.deepEqual(mutations(mock).map(({ mutation }) => mutation.method), ['PUT']);
});

test('a failed dispatch is recoverable by rerunning publication without a duplicate pin commit', async () => {
  const plan = await candidate();
  const mock = api({ dispatchFailures: 1 });
  await assert.rejects(publishTransportSync(plan, mock.request), /Synthetic dispatch failure/);
  assert.equal(mock.state.hubSha, pinSha);
  const result = await publishTransportSync(plan, mock.request);
  assert.equal(result.resumed, true);
  assert.equal(result.commitSha, pinSha);
  assert.deepEqual(mutations(mock).map(({ mutation }) => mutation.method), ['PUT', 'POST', 'POST']);
});

test('a registry that resembles a prior sync cannot bypass a foreign main revision or commit message', async () => {
  const plan = await candidate();
  for (const state of [
    { commitMessage: 'unrelated commit', parentSha: hubSha },
    { commitMessage: `chore: sync verified transport ${sourceSha.slice(0, 12)}`, parentSha: newerSha },
  ]) {
    const mock = api({ hubSha: pinSha, registryText: plan.candidateRegistry, ...state });
    await assert.rejects(publishTransportSync(plan, mock.request), /Hub main or registry changed/);
    assert.equal(mutations(mock).length, 0);
  }
});

test('transport inspection fails closed on malformed or inaccessible source metadata', async () => {
  await assert.rejects(latestSuccessfulTransport(async () => ({})), /Invalid transport workflow list/);
  await assert.rejects(latestSuccessfulTransport(async () => ({ workflow_runs: [run('main')] })), /Invalid successful/);
  const mock = api();
  await assert.rejects(inspectTransportSync(input, async path => {
    if (path.includes('head_sha=')) throw new Error('GitHub API 403');
    return mock.request(path);
  }), /GitHub API 403/);
});

test('sync workflow isolates read-only inspection, token-free source execution and conditional write publication', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-transport.yml', import.meta.url), 'utf8');
  const inspection = workflow.split('\n  inspect:')[1].split('\n  build:')[0];
  const build = workflow.split('\n  build:')[1].split('\n  publish:')[0];
  const publish = workflow.split('\n  publish:')[1];
  assert.match(workflow, /cron: '\*\/30 \* \* \* \*'/);
  assert.match(workflow, /group: showcase-transport-sync/);
  assert.doesNotMatch(workflow, /group: showcase-publication/);
  assert.match(inspection, /contents: read/);
  assert.match(inspection, /actions: read/);
  assert.match(inspection, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.doesNotMatch(inspection, /contents: write|actions: write|npm ci|npm test|test-transport\.mjs/);
  assert.match(build, /needs: inspect/);
  assert.match(build, /contents: read/);
  assert.match(build, /build-showcases\.mjs \.release\/resolved-sites\.json \.release\/candidate-registry\.json/);
  assert.match(build, /test-transport\.mjs \.release\/resolved-sites\.json --install-browsers/);
  assert.doesNotMatch(build, /GH_TOKEN|GITHUB_TOKEN|secrets\.|contents: write|actions: write|pages: write|id-token: write/);
  assert.match(publish, /needs: \[inspect, build\]/);
  assert.match(publish, /needs.build.result == 'success'/);
  assert.match(publish, /contents: write/);
  assert.match(publish, /actions: write/);
  assert.match(publish, /name: transport-sync-candidate/);
  assert.match(publish, /publish-transport-sync\.mjs/);
  assert.doesNotMatch(publish, /npm ci|npm test|build-showcases\.mjs|test-transport\.mjs|secrets\./);
  assert.equal((workflow.match(/persist-credentials: false/g) || []).length, 3);
});

test('normal publication tests the resolved transport artifact before upload without exposing its API token', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const build = workflow.split('\n  build:')[1].split('\n  deploy:')[0];
  const buildIndex = build.indexOf('build-showcases.mjs .release/resolved-sites.json');
  const testIndex = build.indexOf('test-transport.mjs .release/resolved-sites.json --install-browsers');
  const uploadIndex = build.indexOf('actions/upload-pages-artifact');
  assert(buildIndex >= 0 && testIndex > buildIndex && uploadIndex > testIndex);
  assert.doesNotMatch(build, /GH_TOKEN|GITHUB_TOKEN|secrets\.|contents: write|actions: write|pages: write|id-token: write/);
  assert.match(workflow, /group: showcase-\$\{\{/);
});

test('the source browser suite is fetched by immutable SHA and cannot rebuild instead of testing Hub dist', async () => {
  const source = await readFile(new URL('../scripts/test-transport.mjs', import.meta.url), 'utf8');
  assert.match(source, /\['fetch', '--quiet', '--depth', '1', 'origin', source.sha\]/);
  assert.match(source, /\['checkout', '--quiet', '--detach', 'FETCH_HEAD'\]/);
  assert.match(source, /createPreviewServer\(dist\)/);
  assert.match(source, /\['ci'\]/);
  assert.match(source, /\['test'\]/);
  assert.doesNotMatch(source, /\['run', 'build'\]|\['fetch'[^\n]*'main'/);
  assert.match(source, /Run transport source tests without API credentials/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { sourceEnvironment, validateReleaseConfiguration, verifyRelease as verifyGate } from '../scripts/release-gate.mjs';
import { githubRequest, resolveSources, validateResolvedSources } from '../scripts/release.mjs';

const verifyRelease = (site, sha, options) => verifyGate(site, sha, path => githubRequest(path, options));

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const site = { slug: 'yuan-guang-pcb', repository: 'xk2022/xk-brand-yuan-guang-pcb', ref: sha, releaseGate: { workflow: '.github/workflows/ci.yml', job: 'verify' } };
const successRun = { id: 61, run_number: 9, run_attempt: 2, head_sha: sha, path: '.github/workflows/ci.yml', event: 'push', head_repository: { full_name: site.repository }, status: 'completed', conclusion: 'success' };
const successJob = { id: 100, run_id: 61, run_attempt: 2, head_sha: sha, name: 'verify', status: 'completed', conclusion: 'success' };

function api({ runs = [successRun], jobs = [successJob], current = successRun, status = 200, count = runs.length } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    let data;
    if (url.includes('/commits/')) data = { sha };
    else if (url.includes('/workflows/')) data = { total_count: count, workflow_runs: runs };
    else if (url.includes('/attempts/')) data = { total_count: jobs.length, jobs };
    else data = current;
    return { ok: status === 200, status, json: async () => data };
  };
  return { calls, fetchImpl };
}

test('release requires success for the exact SHA, workflow, latest attempt and named job', async () => {
  const mock = api();
  const proof = await verifyRelease(site, sha, { token: 'synthetic-secret', fetchImpl: mock.fetchImpl });
  assert.equal(proof.sha, sha);
  assert.equal(proof.run_id, 61);
  assert.equal(proof.run_attempt, 2);
  assert.equal(proof.job, 'verify');
  assert.doesNotMatch(JSON.stringify(proof), /synthetic-secret/);
  assert.equal(mock.calls.length, 3);
  assert.match(mock.calls[0].url, new RegExp(`head_sha=${sha}&event=push`));
  assert.match(mock.calls[1].url, /runs\/61\/attempts\/2\/jobs/);
  for (const request of mock.calls) {
    assert.equal(new URL(request.url).origin, 'https://api.github.com');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers.Authorization, 'Bearer synthetic-secret');
  }
});

test('another SHA, workflow, fork or PR run cannot provide the green light', async () => {
  for (const change of [{ head_sha: otherSha }, { path: '.github/workflows/deploy.yml' }, { event: 'pull_request' }, { head_repository: { full_name: 'outsider/fork' } }]) {
    const mock = api({ runs: [{ ...successRun, ...change }] });
    await assert.rejects(verifyRelease(site, sha, { token: '', fetchImpl: mock.fetchImpl }), /not satisfied/);
    assert.equal(mock.calls.length, 1);
  }
});

test('a newer pending or failed workflow supersedes an older successful run', async () => {
  for (const state of [{ status: 'queued', conclusion: null }, { status: 'completed', conclusion: 'failure' }]) {
    const mock = api({ runs: [successRun, { ...successRun, id: 62, run_number: 10, ...state }] });
    await assert.rejects(verifyRelease(site, sha, { token: '', fetchImpl: mock.fetchImpl }), /not satisfied/);
  }
});

test('missing, failed, old-attempt or wrong-SHA verify jobs fail closed', async () => {
  for (const change of [{ name: 'lint' }, { conclusion: 'failure' }, { run_attempt: 1 }, { head_sha: otherSha }, { run_id: 60 }]) {
    const mock = api({ jobs: [{ ...successJob, ...change }] });
    await assert.rejects(verifyRelease(site, sha, { token: '', fetchImpl: mock.fetchImpl }), /job verify is not successful/);
  }
});

test('metadata errors, incomplete pages and a rerun starting during verification fail closed', async () => {
  for (const mock of [api({ status: 403 }), api({ count: 101 }), api({ current: { ...successRun, run_attempt: 3, status: 'queued', conclusion: null } })]) {
    await assert.rejects(verifyRelease(site, sha, { token: '', fetchImpl: mock.fetchImpl }));
  }
});

test('mutable refs resolve before verification and generate a pinned approval', async () => {
  const configured = { ...site, ref: 'release/v1' };
  const mock = api();
  const plan = await resolveSources([configured], path => githubRequest(path, { token: '', fetchImpl: mock.fetchImpl }));
  assert.match(mock.calls[0].url, /commits\/release%2Fv1$/);
  assert.equal(plan[0].sha, sha);
  validateResolvedSources([configured], plan);
  assert.equal(plan[0].ref, 'release/v1');
});

test('resolved plans require exact configured repository, ref, workflow and source-CI evidence', async () => {
  const mock = api();
  const plan = await resolveSources([site], path => githubRequest(path, { token: '', fetchImpl: mock.fetchImpl }));
  validateResolvedSources([site], plan);
  for (const changed of [{ ...site, ref: otherSha }, { ...site, repository: 'xk2022/other' }, { ...site, releaseGate: { ...site.releaseGate, job: 'other' } }]) {
    assert.throws(() => validateResolvedSources([changed], plan), /registration changed/);
  }
  assert.throws(() => validateResolvedSources([site], [{ ...site, sha }]), /Release evidence/);
  assert.throws(() => validateResolvedSources([site], [{ ...plan[0], release: { ...plan[0].release, sha: otherSha } }]), /Release evidence/);
  assert.throws(() => validateResolvedSources([site], [{ ...plan[0], sha: otherSha }]), /pinned registry ref/);
});

test('source subprocesses receive runtime/public settings and no hub credentials', () => {
  const environment = sourceEnvironment({ PATH: '/usr/bin', HOME: '/tmp/home', npm_config_cache: '/tmp/cache', GITHUB_TOKEN: 'secret', GH_TOKEN: 'secret', ACTIONS_RUNTIME_TOKEN: 'secret', CUSTOM_SECRET: 'secret', NPM_TOKEN: 'secret', HTTP_PROXY: 'https://user:secret@proxy.invalid', HTTPS_PROXY: 'https://proxy.invalid' }, { BASE_PATH: '/yuan-guang-pcb/', GITHUB_PAGES: 'true' });
  assert.equal(environment.PATH, '/usr/bin');
  assert.equal(environment.npm_config_cache, '/tmp/cache');
  assert.equal(environment.BASE_PATH, '/yuan-guang-pcb/');
  assert.equal(environment.HTTPS_PROXY, 'https://proxy.invalid');
  assert.doesNotMatch(JSON.stringify(environment), /secret/);
  for (const configured of [{ GITHUB_TOKEN: 'secret' }, { API_KEY: 'secret' }, { BASE_PATH: '/path\nInjected' }]) assert.throws(() => sourceEnvironment({}, configured), /public build settings/);
});

test('release config rejects malformed refs and workflows before network access', () => {
  for (const ref of ['--upload-pack=evil', '../other', 'main\nother']) assert.throws(() => validateReleaseConfiguration({ ...site, ref }), /Invalid source ref/);
  assert.throws(() => validateReleaseConfiguration({ ...site, releaseGate: { workflow: 'https://evil.example/ci.yml', job: 'verify' } }), /Invalid release gate/);
});

test('the credential-bearing verification job is separate from token-free source execution', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const verification = workflow.split('\n  resolve:')[1].split('\n  build:')[0];
  const build = workflow.split('\n  build:')[1].split('\n  deploy:')[0];
  assert.match(verification, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(build, /needs: resolve/);
  assert.match(build, /build-showcases\.mjs \.release\/resolved-sites\.json/);
  assert.doesNotMatch(build, /GITHUB_TOKEN|GH_TOKEN|actions: write|pages: write|id-token: write/);
  assert.throws(() => execFileSync(process.execPath, ['scripts/build-showcases.mjs'], { cwd: new URL('..', import.meta.url), env: { ...sourceEnvironment(process.env), GITHUB_TOKEN: 'synthetic-secret' }, stdio: 'pipe' }), error => {
    assert.match(error.stderr.toString(), /Run the build without GITHUB_TOKEN/);
    assert.doesNotMatch(error.stderr.toString(), /synthetic-secret/);
    return true;
  });
});

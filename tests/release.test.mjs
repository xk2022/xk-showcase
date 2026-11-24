import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSources, validateResolvedSources, assertSuccessfulBrandChecks, assertFreshPublication, sourceBuildEnvironment, githubRequest, requiredBrandChecks } from '../scripts/release.mjs';

const sha = 'a'.repeat(40);
const newerSha = 'b'.repeat(40);
const brand = { slug: 'hongjia-brand', repository: 'xk2022/xk-brand-hongjia-birdnest', ref: 'main', env: { NEXT_PUBLIC_SHOWCASE_BASE_PATH: '/hongjia-brand' } };
const other = { slug: 'other', repository: 'xk2022/other', ref: 'release-1' };
const checks = requiredBrandChecks.map((name, i) => ({ id: i + 1, name, head_sha: sha, status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } }));

test('resolution freezes branch/tag/SHA revisions and gates only Brand source CI', async () => {
  const calls = [];
  const request = async path => {
    calls.push(path);
    return path.includes('check-runs') ? { check_runs: checks } : { sha };
  };
  const sources = await resolveSources([brand, other, { ...other, slug: 'raw-sha', ref: sha }], request);
  assert.deepEqual(sources.map(source => source.sha), [sha, sha, sha]);
  assert.equal(calls.filter(path => path.includes('check-runs')).length, 1);
  assert.ok(calls.includes(`repos/xk2022/other/commits/${sha}`));
  validateResolvedSources([brand, other, { ...other, slug: 'raw-sha', ref: sha }], sources);
});

test('unverified Brand, wrong SHA, spoofed app and pending newer checks cannot publish', () => {
  assert.throws(() => assertSuccessfulBrandChecks([], sha), /needs successful CI/);
  assert.throws(() => assertSuccessfulBrandChecks(checks, newerSha), /needs successful CI/);
  assert.throws(() => assertSuccessfulBrandChecks(checks.map(check => ({ ...check, app: { slug: 'another-app' } })), sha), /needs successful CI/);
  assert.throws(() => assertSuccessfulBrandChecks([...checks, { ...checks[0], id: 99, status: 'in_progress', conclusion: null }], sha), /in_progress/);
  assert.doesNotThrow(() => assertSuccessfulBrandChecks(checks, sha));
});

test('resolved plans reject ref/env changes and missing source revisions before building', () => {
  const plan = [{ ...brand, sha }];
  validateResolvedSources([brand], plan);
  assert.throws(() => validateResolvedSources([{ ...brand, ref: 'another-tag' }], plan), /registration changed/);
  assert.throws(() => validateResolvedSources([brand], [{ ...brand, sha: 'main' }]), /Missing resolved SHA/);
  assert.throws(() => validateResolvedSources([brand], []), /does not match/);
});

test('freshness guard rejects older Hub commits and older publication requests', () => {
  const context = { expectedSha: sha, currentSha: sha, runNumber: 10, runs: [] };
  assert.doesNotThrow(() => assertFreshPublication(context));
  assert.throws(() => assertFreshPublication({ ...context, currentSha: newerSha }), /Hub main changed/);
  for (const event of ['push', 'workflow_dispatch']) {
    assert.throws(() => assertFreshPublication({ ...context, runs: [{ id: 11, head_branch: 'main', event, run_number: 11 }] }), /newer main run 11/);
  }
  assert.doesNotThrow(() => assertFreshPublication({ ...context, runs: [{ id: 11, head_branch: 'feature', event: 'pull_request', run_number: 11 }] }));
});

test('source npm lifecycle and build environments do not receive API credentials', () => {
  const environment = sourceBuildEnvironment({ PATH: '/bin', HOME: '/home/runner', GH_TOKEN: 'private', GITHUB_TOKEN: 'private', EXAMPLE_SECRET: 'private', NODE_EXTRA_CA_CERTS: '/trust/ca.pem' }, brand.env);
  assert.equal(environment.GH_TOKEN, undefined);
  assert.equal(environment.GITHUB_TOKEN, undefined);
  assert.equal(environment.EXAMPLE_SECRET, undefined);
  assert.equal(environment.PATH, '/bin');
  assert.equal(environment.NODE_EXTRA_CA_CERTS, '/trust/ca.pem');
  assert.equal(environment.NEXT_PUBLIC_SHOWCASE_BASE_PATH, '/hongjia-brand');
});

test('public cross-repository API fallback omits credentials rather than escalating access', async () => {
  const authorization = [];
  const result = await githubRequest('repos/xk2022/public/commits/main', { token: 'private', fetchImpl: async (url, options) => {
    authorization.push(options.headers.Authorization);
    return authorization.length === 1 ? { status: 403, ok: false } : { status: 200, ok: true, json: async () => ({ sha }) };
  } });
  assert.equal(result.sha, sha);
  assert.deepEqual(authorization, ['Bearer private', undefined]);
});


test('concealed public check reads can retry anonymously but private/missing resources still fail closed', async () => {
  for (const anonymousStatus of [200, 404]) {
    const calls = [];
    const request = githubRequest('repos/xk2022/public/commits/main/check-runs', { token: 'private', fetchImpl: async (url, options) => {
      calls.push(options.headers.Authorization);
      const status = calls.length === 1 ? 404 : anonymousStatus;
      return { status, ok: status === 200, json: async () => ({ check_runs: checks }) };
    } });
    if (anonymousStatus === 200) assert.deepEqual((await request).check_runs, checks);
    else await assert.rejects(request, /GitHub API 404/);
    assert.deepEqual(calls, ['Bearer private', undefined]);
  }
});

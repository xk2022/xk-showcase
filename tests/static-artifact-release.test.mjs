import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveSources, validateResolvedSources, requiredBrandChecks } from '../scripts/release.mjs';
import { validateSites } from '../scripts/static-export.mjs';

const sourceSha = '7d18d00faffb5aa95d9b55e823333353fd54cf70';
const artifact = {
  url: 'https://github.com/xk2022/xk-website-showcase/releases/download/shengfengyang-7d18d00-v1/shengfengyang-static.zip',
  sha256: 'a'.repeat(64),
  sourceSha,
};
const registration = {
  slug: 'shengfengyang', name: '昇豐陽食品｜品牌官網提案', category: '品牌形象概念提案',
  repository: 'xk2022/xk-brand-shengfengyang', ref: sourceSha,
  indexable: false, listed: false, staticArtifact: artifact,
};
const copy = value => structuredClone(value);

test('pinned public static artifacts resolve without reading private source metadata', async () => {
  let requests = 0;
  const sites = [copy(registration)];
  const plan = await resolveSources(sites, async () => { requests++; throw new Error('Private source metadata must not be read'); });
  assert.equal(requests, 0);
  assert.equal(plan[0].sha, sourceSha);
  assert.deepEqual(plan[0].staticArtifact, artifact);
  assert.notEqual(plan[0].staticArtifact, sites[0].staticArtifact);
  validateResolvedSources(sites, plan);
});

test('artifact registrations reject untrusted or escaping archive URLs before metadata requests', async () => {
  for (const url of [
    artifact.url.replace('https:', 'http:'),
    artifact.url.replace('github.com', 'github.com.evil.invalid'),
    artifact.url.replace('/xk2022/', '/another-owner/'),
    artifact.url.replace('/xk-website-showcase/', '/another-repository/'),
    artifact.url.replace('/releases/download/', '/archive/'),
    artifact.url.replace('/shengfengyang-static.zip', '/../private.zip'),
    artifact.url.replace('/shengfengyang-static.zip', '/%2e%2e%2fprivate.zip'),
    artifact.url.replace('/shengfengyang-static.zip', '/%2fprivate.zip'),
    artifact.url.replace('/shengfengyang-static.zip', '/static.tar.gz'),
    artifact.url.replace('https://', 'https://user:password@'),
    `${artifact.url}?token=unwanted`,
    `${artifact.url}#fragment`,
    `${artifact.url}\n`,
  ]) {
    const site = { ...copy(registration), staticArtifact: { ...artifact, url } };
    let called = false;
    await assert.rejects(resolveSources([site], async () => { called = true; throw new Error('Must not be called'); }), /Invalid pinned static artifact/);
    assert.equal(called, false, `Untrusted URL reached metadata: ${url}`);
  }
});

test('static artifact registration requires an exact source pin, digest and exclusive delivery mode', () => {
  const badSites = [
    { ...copy(registration), ref: 'main' },
    { ...copy(registration), ref: 'b'.repeat(40) },
    { ...copy(registration), staticArtifact: null },
    { ...copy(registration), staticArtifact: { ...artifact, sourceSha: 'main' } },
    { ...copy(registration), staticArtifact: { ...artifact, sha256: 'a'.repeat(63) } },
    { ...copy(registration), staticArtifact: { ...artifact, sha256: 'z'.repeat(64) } },
    { ...copy(registration), staticArtifact: { ...artifact, token: 'not-allowed' } },
    { ...copy(registration), releaseGate: { workflow: '.github/workflows/ci.yml', job: 'Static export (subpath)' } },
  ];
  for (const site of badSites) assert.throws(() => validateSites([site]), /static artifact|Static artifact/);
});

test('frozen artifact plans reject changed URL, digest, source SHA or unexpected source CI evidence', async () => {
  const sites = [copy(registration)];
  const plan = await resolveSources(sites, async () => assert.fail('Artifact must not read a source API'));
  for (const change of [
    { sha: 'b'.repeat(40) },
    { staticArtifact: { ...artifact, sha256: 'b'.repeat(64) } },
    { staticArtifact: { ...artifact, sourceSha: 'b'.repeat(40) } },
    { staticArtifact: { ...artifact, url: artifact.url.replace('-v1/', '-v2/') } },
    { release: { sha: sourceSha, workflow: '.github/workflows/ci.yml', job: 'verify' } },
  ]) assert.throws(() => validateResolvedSources(sites, [{ ...copy(plan[0]), ...change }]), /registration changed|differs from pinned|Unexpected release evidence/);
  sites[0].staticArtifact.sha256 = 'b'.repeat(64);
  assert.equal(plan[0].staticArtifact.sha256, artifact.sha256);
  assert.throws(() => validateResolvedSources(sites, plan), /registration changed/);
});

test('artifact delivery does not weaken existing public Brand and exact workflow release gates', async () => {
  const publicSha = 'b'.repeat(40);
  const brand = { slug: 'hongjia-brand', repository: 'xk2022/xk-brand-hongjia-birdnest', ref: 'main' };
  const gated = { slug: 'gated-public', repository: 'xk2022/gated-public', ref: publicSha, releaseGate: { workflow: '.github/workflows/ci.yml', job: 'verify' } };
  const calls = [];
  const run = { id: 42, run_number: 10, run_attempt: 1, head_sha: publicSha, path: gated.releaseGate.workflow, event: 'push', head_repository: { full_name: gated.repository }, status: 'completed', conclusion: 'success' };
  const request = async path => {
    calls.push(path);
    assert(!path.includes(registration.repository), 'Private artifact source was read');
    if (path.includes('/commits/') && path.includes('/check-runs')) return { check_runs: requiredBrandChecks.map((name, i) => ({ id: i + 1, name, head_sha: publicSha, status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } })) };
    if (path.includes('/commits/')) return { sha: publicSha };
    if (path.includes('/actions/workflows/')) return { workflow_runs: [run], total_count: 1 };
    if (path.includes('/attempts/')) return { total_count: 1, jobs: [{ name: 'verify', head_sha: publicSha, run_id: 42, run_attempt: 1, status: 'completed', conclusion: 'success' }] };
    if (path.endsWith('/actions/runs/42')) return run;
    assert.fail(`Unexpected request: ${path}`);
  };
  const sites = [copy(registration), brand, gated];
  const plan = await resolveSources(sites, request);
  validateResolvedSources(sites, plan);
  assert(calls.some(path => path.includes('/check-runs')));
  assert(calls.some(path => path.includes('/attempts/1/jobs')));
  assert.equal(plan[2].release.run_id, 42);
  await assert.rejects(resolveSources(sites, async path => path.includes('/check-runs') ? { check_runs: [] } : request(path)), /needs successful CI/);
  await assert.rejects(resolveSources(sites, async path => path.includes('/actions/workflows/') ? { workflow_runs: [{ ...run, conclusion: 'failure' }], total_count: 1 } : request(path)), /Release gate not satisfied/);
});


test('static artifact bootstrap isolates same-repository write permission from all source execution', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const header = workflow.split('\njobs:')[0];
  const publish = workflow.split('\n  publish-static-artifact:')[1].split('\n  resolve:')[0];
  const resolve = workflow.split('\n  resolve:')[1].split('\n  build:')[0];
  const build = workflow.split('\n  build:')[1].split('\n  deploy:')[0];
  const deploy = workflow.split('\n  deploy:')[1];
  assert.match(header, /permissions:\s+contents: read/);
  for (const input of ['static_artifact_blob', 'static_artifact_sha256', 'static_artifact_source']) {
    assert.match(header, new RegExp(`${input}:[\\s\\S]*?required: false[\\s\\S]*?type: string`));
  }
  assert.match(publish, /if: github.event_name == 'workflow_dispatch' && inputs.static_artifact_blob != ''/);
  assert.match(publish, /permissions:\s+contents: write/);
  assert.match(publish, /persist-credentials: false/);
  assert.match(publish, /run: node scripts\/publish-static-artifact\.mjs/);
  assert.match(publish, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(header, /static_artifact_project:[\s\S]*?type: choice[\s\S]*?- shengfengyang[\s\S]*?- carpentry/);
  assert.match(header, /static_artifact_project:[\s\S]*?options:[\s\S]*?- hongjia-birdnest/);
  assert.match(header, /static_artifact_project:[\s\S]*?options:[\s\S]*?- rui-cafe/);
  assert.match(header, /static_artifact_project:[\s\S]*?options:[\s\S]*?- rotaract/);
  assert.match(header, /static_artifact_project:[\s\S]*?options:[\s\S]*?- longtong-logistics/);
  assert(publish.includes('INPUT_PROJECT: ${{ inputs.static_artifact_project }}'));
  for (const [key, input] of [['INPUT_BLOB_SHA', 'blob'], ['INPUT_SHA256', 'sha256'], ['INPUT_SOURCE_SHA', 'source']]) {
    assert(publish.includes(key + ': ${{ inputs.static_artifact_' + input + ' }}'));
  }
  assert.doesNotMatch(publish, /npm |build-showcases\.mjs|test-transport\.mjs|resolve-sources\.mjs|secrets\.|actions: write|pages: write|id-token: write/);
  assert.equal((workflow.match(/contents: write/g) || []).length, 2);
  assert.match(resolve, /if: github.event_name != 'workflow_dispatch' \|\| \(inputs.static_artifact_blob == '' && !inputs.preserve_publication\)/);
  assert.match(build, /needs: resolve/);
  assert.doesNotMatch(build, /GH_TOKEN|GITHUB_TOKEN|secrets\.|contents: write|actions: write|pages: write|id-token: write/);
  assert.match(deploy, /if:.*inputs.static_artifact_blob == ''/);
  assert.match(deploy, /needs: build/);
  assert.doesNotMatch(resolve + build + deploy, /contents: write/);
});


test('fixed publication preservation has isolated Hub-only permissions and cannot deploy', async () => {
 const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
 const preserve = workflow.split('\n  preserve-published-snapshots:')[1].split('\n  publish-static-artifact:')[0];
 assert.match(preserve, /if: github.event_name == 'workflow_dispatch' && inputs.preserve_publication/);
 assert.match(preserve, /actions: read/);
 assert.match(preserve, /contents: write/);
 assert.match(preserve, /persist-credentials: false/);
 assert.match(preserve, /node scripts\/preserve-published-snapshots\.mjs/);
 assert.doesNotMatch(preserve, /pages: write|id-token: write|npm |build-showcases|secrets\./);
 assert.match(workflow, /static_artifact_blob != '' && !inputs.preserve_publication/);
 assert.match(workflow, /static_artifact_blob == '' && !inputs.preserve_publication/);
});

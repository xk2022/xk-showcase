import { githubRequest, assertFreshPublication } from './release.mjs';

const { GITHUB_REPOSITORY: repository, GITHUB_SHA: expectedSha, GITHUB_RUN_NUMBER: runNumber } = process.env;
if (!/^xk2022\/[a-zA-Z0-9_-]+$/.test(repository || '') || !/^\d+$/.test(runNumber || '')) throw new Error('Missing GitHub publication context');
const [commit, data] = await Promise.all([
  githubRequest(`repos/${repository}/commits/main`),
  githubRequest(`repos/${repository}/actions/workflows/deploy.yml/runs?branch=main&per_page=100`),
]);
assertFreshPublication({ expectedSha, currentSha: commit.sha, runNumber, runs: data.workflow_runs || [] });
console.log(`Publication ${runNumber} is current at ${expectedSha}`);

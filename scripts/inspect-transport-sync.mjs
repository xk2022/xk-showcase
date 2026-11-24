import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { githubRequest } from './release.mjs';
import { inspectTransportSync, hubRepository } from './transport-sync.mjs';

if (process.env.GITHUB_REPOSITORY !== hubRepository || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Transport synchronization is restricted to Hub main');
const originalRegistry = await readFile('config/showcases.json', 'utf8');
const registryBlobSha = execFileSync('git', ['hash-object', 'config/showcases.json'], { encoding: 'utf8' }).trim();
const result = await inspectTransportSync({ originalRegistry, hubSha: process.env.GITHUB_SHA, registryBlobSha }, githubRequest);
await mkdir('.release', { recursive: true });
if (result.changed) {
  await writeFile('.release/transport-sync.json', JSON.stringify(result.plan, null, 2) + '\n');
  await writeFile('.release/candidate-registry.json', result.plan.candidateRegistry);
  await writeFile('.release/resolved-sites.json', JSON.stringify(result.plan.resolvedSources, null, 2) + '\n');
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\n`);
console.log(result.changed ? `Candidate transport source: ${result.plan.sourceSha}` : result.reason);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, result.changed ? `Transport candidate \`${result.plan.sourceSha}\` must pass the complete Hub build and source browser suite before pinning.\n` : `${result.reason}\n`);

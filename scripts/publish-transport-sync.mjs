import { readFile, appendFile } from 'node:fs/promises';
import { githubRequest } from './release.mjs';
import { publishTransportSync, hubRepository } from './transport-sync.mjs';

if (process.env.GITHUB_REPOSITORY !== hubRepository || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Transport synchronization is restricted to Hub main');
const plan = JSON.parse(await readFile('.release/transport-sync.json', 'utf8'));
const request = async (path, options) => {
  if (!options) return githubRequest(path);
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Missing Hub publication token');
  // Mutation endpoints and destination are fixed by the trusted publication code.
  const allowed = [`repos/${hubRepository}/contents/config/showcases.json`, `repos/${hubRepository}/actions/workflows/deploy.yml/dispatches`];
  if (!allowed.includes(path)) throw new Error('Unexpected transport sync mutation endpoint');
  const response = await fetch(`https://api.github.com/${path}`, {
    method: options.method,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GitHub sync publication API ${response.status}: ${path}`);
  return response.status === 204 ? undefined : response.json();
};
const result = await publishTransportSync(plan, request);
console.log(`Pinned transport ${result.sourceSha} in Hub ${result.commitSha}; dispatched Showcase Hub on main`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `Pinned transport \`${result.sourceSha}\` in Hub \`${result.commitSha}\`; explicitly dispatched \`deploy.yml\` on main.\n`);

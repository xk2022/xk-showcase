import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveSources } from './release.mjs';

const sites = JSON.parse(await readFile(new URL('../config/showcases.json', import.meta.url), 'utf8'));
const output = resolve(process.argv[2] || '.release/resolved-sites.json');
const resolved = await resolveSources(sites);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(resolved, null, 2) + '\n');
console.log(`Resolved ${resolved.length} source commits to ${output}`);
for (const site of resolved) console.log(`${site.slug}: ${site.sha}`);

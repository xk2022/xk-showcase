import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderCards, validateSites, validateExport, origin } from '../scripts/static-export.mjs';

const app = { slug: 'app-preview', name: 'APP preview', category: 'APP', repository: 'xk2022/xk-app-preview', ref: 'main', framework: 'screen', indexable: false };

test('gallery shows screenshots and labels offline APP previews, while retaining hidden proposals', () => {
  const cards = renderCards([app, { ...app, slug: 'hidden', listed: false }]);
  assert.match(cards, /app-preview\/_showcase-preview\.jpg/);
  assert.match(cards, /查看畫面預覽/);
  assert.doesNotMatch(cards, /hidden/);
  assert.throws(() => validateSites([{ ...app, indexable: true }]), /non-indexable/);
  assert.throws(() => validateSites([{ ...app, repository: 'xk2022/xk-lp-preview' }]), /APP entries/);
});

test('APP screenshot-only export has no sitemap and requires its local screenshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xk-gallery-test-'));
  try {
    await writeFile(join(dir, 'index.html'), `<html><head><link rel="canonical" href="${origin}/app-preview/"><meta name="robots" content="noindex,nofollow"></head><body><img src="./_showcase-preview.jpg"></body></html>`);
    await assert.rejects(validateExport(dir, app));
    await writeFile(join(dir, '_showcase-preview.jpg'), 'test fixture');
    await validateExport(dir, app);
    await writeFile(join(dir, 'sitemap.xml'), '');
    await assert.rejects(validateExport(dir, app), /must not export sitemap/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

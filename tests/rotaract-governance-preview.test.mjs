import test from 'node:test';
import assert from 'node:assert/strict';
import { exerciseRotaractGovernance } from '../scripts/capture-preview.mjs';

function fixture({ marker = true, emptyTable, privateTable, alerts = 0 } = {}) {
  const opened = [];
  const ready = { waitFor: async () => {}, first() { return this; } };
  const page = {
    locator(selector) {
      if (selector === '[data-showcase="RK-DEMO-03"]') return { count: async () => Number(marker) };
      assert.equal(selector, '.gov-tree-node');
      return ready;
    },
    getByLabel() { return ready; },
    getByRole(role, options = {}) {
      if (role === 'navigation') return {
        getByRole(linkRole, link) {
          assert.equal(linkRole, 'link');
          return { click: async () => opened.push(link.name) };
        },
      };
      if (role === 'table') return {
        ...ready,
        locator(selector) {
          assert.equal(selector, 'tbody tr');
          return { count: async () => options.name === emptyTable ? 0 : 1 };
        },
        innerText: async () => options.name === privateTable ? 'private@synthetic.invalid' : '合成服務記錄 · 未公開姓名',
      };
      if (role === 'alert') return { count: async () => alerts };
      assert.ok(['heading', 'list'].includes(role));
      return ready;
    },
  };
  return { page, opened };
}

test('older Rotaract snapshots retain the earlier smoke without probing governance routes', async () => {
  const { page, opened } = fixture({ marker: false });
  assert.equal(await exerciseRotaractGovernance(page), false);
  assert.deepEqual(opened, []);
});

test('RK-DEMO-03 marker requires the real governance, handover and owner-history panels', async () => {
  const { page, opened } = fixture();
  assert.equal(await exerciseRotaractGovernance(page), true);
  assert.ok(opened.includes('年度交接管理'));
  assert.ok(opened.includes('我的服務履歷'));
  assert.equal(opened.at(-1), '歷屆幹部名錄');
});

for (const name of ['本頁展示任命', '年度幹部名錄']) {
  test(`governance smoke refuses missing seeded ${name}`, async () => {
    await assert.rejects(exerciseRotaractGovernance(fixture({ emptyTable: name }).page), /no seeded rows/);
  });
  test(`governance smoke refuses contact data in ${name}`, async () => {
    await assert.rejects(exerciseRotaractGovernance(fixture({ privateTable: name }).page), /private contact/);
  });
}

test('governance smoke refuses a rendered API failure', async () => {
  await assert.rejects(exerciseRotaractGovernance(fixture({ alerts: 1 }).page), /API error/);
});

test('a new handover workspace may legitimately have no plans before the user creates one', async () => {
  assert.equal(await exerciseRotaractGovernance(fixture({ emptyTable: '年度交接計畫' }).page), true);
});

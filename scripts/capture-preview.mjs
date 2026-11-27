import { createPreviewServer } from './test-transport.mjs';

// New workspaces retain the earlier roster/history smoke. The visible release
// marker selects the additional governance checks without changing rollback or
// other projects' browser policies.
export async function exerciseRotaractGovernance(page) {
  const marker = page.locator('[data-showcase="RK-DEMO-03"]');
  if (!await marker.count()) return false;
  const navigation = page.getByRole('navigation', { name: '工作台導覽', exact: true });
  const open = async (name, heading, level) => {
    await navigation.getByRole('link', { name, exact: true }).click();
    await page.getByRole('heading', { name: heading, level, exact: true }).waitFor();
  };
  const requireRows = async name => {
    const table = page.getByRole('table', { name, exact: true });
    await table.waitFor();
    if (!await table.locator('tbody tr').count()) throw new Error(`Governance preview has no seeded rows: ${name}`);
    if (/\.invalid|\+000/.test(await table.innerText())) throw new Error('Governance preview exposed private contact data');
  };
  await open('年度治理總覽', '從年度架構到每一段服務', 2);
  await page.getByRole('heading', { name: '幹部名錄', level: 2, exact: true }).waitFor();
  await open('組織架構', '年度組織架構', 3);
  await page.locator('.gov-tree-node').first().waitFor();
  await open('職務與幹部任命', '年度職務與幹部任命', 3);
  await requireRows('本頁展示任命');
  await open('年度交接管理', '年度交接管理', 2);
  await page.getByRole('table', { name: '年度交接計畫', exact: true }).waitFor();
  await open('我的服務履歷', '我的服務履歷', 2);
  await page.getByLabel('服務日數統計', { exact: true }).waitFor();
  await page.getByRole('list', { name: '本人服務時間軸', exact: true }).waitFor();
  await open('歷屆幹部名錄', '歷屆幹部名錄', 2);
  await requireRows('年度幹部名錄');
  if (await page.getByRole('alert').count()) throw new Error('Governance preview displayed an API error');
  return true;
}

// The browser can read only the locally built static export, never external APIs.
export async function capturePreview(directory, path, output, { interactive = false, rotaractWorkspace = false, ownerDemo = false, anonymousLogistics = false, logisticsDemo = false } = {}) {
  const { chromium } = await import('playwright');
  const server = await createPreviewServer(directory);
  let browser;
  try {
    browser = await chromium.launch(process.env.SHOWCASE_CHROMIUM_PATH ? { executablePath: process.env.SHOWCASE_CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const denied = [];
    const runtimeErrors = [];
    if (interactive || logisticsDemo) page.on('pageerror', error => runtimeErrors.push(error.message));
    if (logisticsDemo) {
      page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
      page.on('websocket', () => denied.push('websocket'));
      await page.routeWebSocket('**/*', async socket => {
        denied.push('websocket');
        await socket.close({ code: 1008, reason: 'Offline showcase' });
      });
    }
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (anonymousLogistics && url.origin === server.url && url.pathname === '/api/v1/auth/me' && route.request().method() === 'GET') return route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED', message: 'Synthetic anonymous preview', timestamp: '2026-11-25T00:00:00+08:00' } });
      if ((interactive || ownerDemo || logisticsDemo) && url.origin === server.url && url.pathname === '/favicon.ico') return route.abort();
      if ((interactive || ownerDemo || logisticsDemo) && (url.origin !== server.url || !url.pathname.startsWith(path) || ['fetch', 'xhr', 'websocket'].includes(route.request().resourceType()))) {
        denied.push(url.pathname);
        return route.abort();
      }
      return url.origin === server.url && !/^\/(api|media|uploads|actuator)(\/|$)/.test(url.pathname) ? route.continue() : route.abort();
    });
    const response = await page.goto(`${server.url}${path}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Preview unavailable: ${path}`);
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: output, type: 'jpeg', quality: 78, animations: 'disabled' });
    if (ownerDemo) {
      await page.getByRole('button', { name: '查看 LM-101-CREAM-S 異動', exact: true }).click();
      await page.getByLabel('只看盤點差異').check();
      await page.getByRole('button', { name: '匯出盤點差異 CSV' }).waitFor();
      await page.locator('.sidebar nav').getByRole('button', { name: '商品管理' }).click();
      await page.getByRole('button', { name: '新增商品', exact: true }).click();
      await page.getByRole('dialog', { name: '建立一件新商品' }).getByLabel('款號 *', { exact: true }).waitFor();
      if (denied.length) throw new Error('Owner demo attempted live access: ' + denied.join(', '));
    }
    if (interactive) {
      await page.getByText('互動示範 · 離線', { exact: true }).first().waitFor();
      if (rotaractWorkspace) {
        await page.getByLabel('展示身份', { exact: true }).selectOption('club-a');
        await page.getByRole('button', { name: '開啟展示工作台', exact: true }).click();
        await page.getByRole('button', { name: '重新整理授權', exact: true }).click({ trial: true });
        await page.getByLabel('組織', { exact: true }).selectOption('30000000-0000-4000-8000-000000000001');
        await page.getByRole('button', { name: '重新整理授權', exact: true }).click({ trial: true });
        await page.getByRole('navigation', { name: '工作台導覽', exact: true }).getByRole('link', { name: '社友管理', exact: true }).click();
        await page.getByRole('heading', { name: '社友管理總覽', exact: true }).waitFor();
        const members = page.getByRole('table', { name: '社友名冊', exact: true });
        await members.waitFor();
        const content = await members.innerText();
        if (!content.includes('合成轉社體驗') || !content.includes('未公開或未設定') || /\.invalid|\+000/.test(content)) throw new Error('Interactive workspace must show the synthetic roster with private contacts hidden');
        const governance = await exerciseRotaractGovernance(page);
        await page.getByLabel('扶輪年度', { exact: true }).selectOption('10000000-0000-4000-8000-000000000025');
        await page.getByText('歷史年度 · 唯讀', { exact: true }).waitFor();
        if (governance) {
          await page.getByText('歷史年度 · 幹部名錄唯讀', { exact: true }).waitFor();
          await page.getByRole('table', { name: '年度幹部名錄', exact: true }).waitFor();
          if (await page.getByRole('button', { name: '新增行政提名', exact: true }).count()) throw new Error('Historical governance preview exposes a mutation control');
        }
        await page.getByText('展示操作指南與信箱', { exact: true }).click();
        await page.getByRole('region', { name: '展示信箱', exact: true }).waitFor();
      } else {
        // The original preserved release remains available for a reviewed rollback.
        await page.getByText('晨光扶青社（示範）').waitFor();
        await page.getByLabel('篩選地區').selectOption('demo-south');
        await page.getByText('星河扶青社（示範）').waitFor();
        if (await page.getByText('晨光扶青社（示範）').count()) throw new Error('Demo district filter not applied');
        await page.getByRole('button', { name: '社友名冊' }).click();
        await page.getByText('社友名冊介面預覽').waitFor();
      }
      if (runtimeErrors.length) throw new Error(`Interactive demo runtime errors: ${runtimeErrors.join(', ')}`);
      if (await page.getByRole('button', { name: '返回正式資料' }).count() || denied.length) throw new Error(`Interactive demo attempted live access: ${denied.join(', ')}`);
    }
    if (logisticsDemo) {
      // This is a distinct offline application, never Rotaract's identity flow
      // or the anonymous normal-Logistics API response used by screen previews.
      await page.getByText('合成互動展示，不連線後端／非正式操作', { exact: true }).waitFor();
      await page.getByRole('heading', { name: '管理員展示工作台', exact: true }).waitFor();
      const storage = async () => page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookies: document.cookie,
        databases: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).length : 0,
        caches: typeof caches === 'undefined' ? 0 : (await caches.keys()).length,
        workers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
      }));
      const initialStorage = await storage();
      if (Object.values(initialStorage).some(value => value !== 0 && value !== '') || (await page.context().cookies()).length) throw new Error('Logistics demo persisted browser data');
      const role = page.getByLabel('展示角色', { exact: true });
      await role.selectOption('ADMIN');
      await page.getByRole('button', { name: '訂單工作台', exact: true }).click();
      await page.getByRole('heading', { name: '訂單工作台', exact: true }).waitFor();
      const localOrder = page.getByRole('article', { name: '展示訂單 DEMO-LOCAL-1001', exact: true });
      const acceptLocalOrder = async () => {
        await localOrder.getByRole('button', { name: '展示受理', exact: true }).click();
        await page.getByRole('dialog', { name: '確認展示操作', exact: true }).getByRole('button', { name: '確認執行展示操作', exact: true }).click();
        await localOrder.getByRole('button', { name: '前往展示調度', exact: true }).waitFor();
      };
      await acceptLocalOrder();
      await page.getByRole('button', { name: '調度工作台', exact: true }).click();
      await page.getByRole('heading', { name: '調度工作台', exact: true }).waitFor();
      await role.selectOption('DRIVER');
      await page.getByRole('button', { name: '本人運輸任務', exact: true }).click();
      await page.getByRole('heading', { name: '本人運輸任務', exact: true }).waitFor();
      if (await page.getByRole('button', { name: '訂單工作台', exact: true }).count()) throw new Error('Driver demo exposes the manager workspace');
      await role.selectOption('DISPATCHER');
      await page.getByRole('button', { name: '調度工作台', exact: true }).click();
      await page.getByRole('heading', { name: '調度工作台', exact: true }).waitFor();
      await page.getByRole('button', { name: '重置展示', exact: true }).click();
      const confirmation = page.getByRole('dialog', { name: '確認重置展示', exact: true });
      await confirmation.getByRole('button', { name: '確認重置', exact: true }).click();
      await page.getByRole('heading', { name: '管理員展示工作台', exact: true }).waitFor();
      if (await role.inputValue() !== 'ADMIN') throw new Error('Logistics reset did not restore the initial role');
      await page.getByRole('button', { name: '訂單工作台', exact: true }).click();
      await page.getByRole('heading', { name: '訂單工作台', exact: true }).waitFor();
      await localOrder.getByRole('button', { name: '展示受理', exact: true }).waitFor();
      if (await page.getByRole('article', { name: /^展示訂單 / }).count() !== 3) throw new Error('Logistics reset did not restore the three synthetic drafts');
      await acceptLocalOrder();
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: '管理員展示工作台', exact: true }).waitFor();
      if (await role.inputValue() !== 'ADMIN') throw new Error('Logistics reload did not restore memory-owned state');
      await page.getByRole('button', { name: '訂單工作台', exact: true }).click();
      await localOrder.getByRole('button', { name: '展示受理', exact: true }).waitFor();
      if (JSON.stringify(await storage()) !== JSON.stringify(initialStorage) || (await page.context().cookies()).length) throw new Error('Logistics demo persisted browser data');
      if (runtimeErrors.length || denied.length) throw new Error(`Logistics demo attempted live access or failed: ${[...runtimeErrors, ...denied].join(', ')}`);
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

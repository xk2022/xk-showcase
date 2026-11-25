import { createPreviewServer } from './test-transport.mjs';

// The browser can read only the locally built static export, never external APIs.
export async function capturePreview(directory, path, output, { interactive = false, ownerDemo = false, anonymousLogistics = false } = {}) {
  const { chromium } = await import('playwright');
  const server = await createPreviewServer(directory);
  let browser;
  try {
    browser = await chromium.launch(process.env.SHOWCASE_CHROMIUM_PATH ? { executablePath: process.env.SHOWCASE_CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const denied = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (anonymousLogistics && url.origin === server.url && url.pathname === '/api/v1/auth/me' && route.request().method() === 'GET') return route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED', message: 'Synthetic anonymous preview', timestamp: '2026-11-25T00:00:00+08:00' } });
      if ((interactive || ownerDemo) && url.origin === server.url && url.pathname === '/favicon.ico') return route.abort();
      if ((interactive || ownerDemo) && (url.origin !== server.url || !url.pathname.startsWith(path) || ['fetch', 'xhr', 'websocket'].includes(route.request().resourceType()))) {
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
      if (denied.length) throw new Error('Owner demo attempted live access: ' + denied.join(', '));
    }
    if (interactive) {
      await page.getByText('互動示範 · 離線', { exact: true }).waitFor();
      await page.getByText('晨光扶青社（示範）').waitFor();
      await page.getByLabel('篩選地區').selectOption('demo-south');
      await page.getByText('星河扶青社（示範）').waitFor();
      if (await page.getByText('晨光扶青社（示範）').count()) throw new Error('Demo district filter not applied');
      await page.getByRole('button', { name: '社友名冊' }).click();
      await page.getByText('社友名冊介面預覽').waitFor();
      if (await page.getByRole('button', { name: '返回正式資料' }).count() || denied.length) throw new Error(`Interactive demo attempted live access: ${denied.join(', ')}`);
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

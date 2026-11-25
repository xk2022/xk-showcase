import { createPreviewServer } from './test-transport.mjs';

// The browser can read only the locally built static export, never external APIs.
export async function capturePreview(directory, path, output) {
  const { chromium } = await import('playwright');
  const server = await createPreviewServer(directory);
  let browser;
  try {
    browser = await chromium.launch(process.env.SHOWCASE_CHROMIUM_PATH ? { executablePath: process.env.SHOWCASE_CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === server.url && !/^\/(api|media|uploads|actuator)(\/|$)/.test(url.pathname) ? route.continue() : route.abort();
    });
    const response = await page.goto(`${server.url}${path}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Preview unavailable: ${path}`);
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: output, type: 'jpeg', quality: 78, animations: 'disabled' });
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { sourceEnvironment } from './release-gate.mjs';
import { createPreviewServer } from './test-transport.mjs';

const pathname = '/consulting-chengce/';
const canonical = 'https://showcase.xplorekaleidoscope.com/consulting-chengce/';
const widths = [375, 768, 1024, 1440];
const syntheticInquiry = Object.freeze({
  name: '陳語安',
  company: '青禾營運研究室',
  email: 'browser-check@example.com',
  phone: '',
  category: '企業經營管理',
  message: '希望梳理營運流程與品牌智慧財產規劃，並討論後續合作方向。',
});
const serializedInquiry = [
  '澄策企業顧問工作室｜諮詢需求', '',
  `姓名：${syntheticInquiry.name}`,
  `公司或組織名稱：${syntheticInquiry.company}`,
  `聯絡信箱：${syntheticInquiry.email}`,
  '聯絡電話：未填寫',
  `諮詢類別：${syntheticInquiry.category}`,
  `需求說明：${syntheticInquiry.message}`,
].join('\n');

async function checkImages(page) {
  for (const image of await page.locator('img').all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async element => {
      if (!element.complete) await Promise.race([
        element.decode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), 10000)),
      ]);
    });
    assert(await image.evaluate(element => element.complete && element.naturalWidth > 0), `Broken image: ${await image.getAttribute('src')}`);
  }
}

async function checkAnchor(page, link, hash) {
  await link.click();
  await page.waitForFunction(expected => location.hash === expected, hash);
  const rect = await page.locator(hash).evaluate(element => ({ top: element.getBoundingClientRect().top }));
  assert(rect.top >= -1 && rect.top < 160, `Anchor ${hash} is outside the readable position: ${rect.top}`);
}

async function fillInquiry(page, values = syntheticInquiry) {
  for (const field of ['name', 'company', 'email', 'phone', 'message'])
    await page.locator(`#consultation-${field}`).fill(values[field]);
  await page.locator('#consultation-category').selectOption(values.category);
}

export async function testChengce({ directory, reportDirectory = '.release/chengce-report' }) {
  const root = resolve(directory);
  const output = resolve(reportDirectory);
  await access(join(root, 'consulting-chengce', 'index.html'));
  const requestedSha = process.env.CHENGCE_SOURCE_SHA;
  if (requestedSha !== undefined) assert(/^[a-f\d]{40}$/i.test(requestedSha), 'CHENGCE_SOURCE_SHA must be a complete commit SHA');
  let sourceSha = requestedSha;
  let provenance = { kind: 'caller-supplied candidate version', independentManifestCheck: false };
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (manifest !== undefined) {
    assert(Array.isArray(manifest), 'Hub manifest must be an array');
    const cases = manifest.filter(site => site.slug === 'consulting-chengce');
    assert.equal(cases.length, 1, 'Hub manifest must contain exactly one Chengce case');
    const source = cases[0];
    assert.equal(source.repository, 'xk2022/xk-lp-consulting-chengce', 'Hub manifest references an unexpected Chengce repository');
    assert(/^[a-f\d]{40}$/i.test(source.sha), 'Hub manifest Chengce version must be a complete commit SHA');
    if (requestedSha !== undefined) assert.equal(source.sha, requestedSha, 'CHENGCE_SOURCE_SHA differs from the combined Hub manifest');
    if (source.staticArtifact) assert.equal(source.staticArtifact.sourceSha, source.sha, 'Hub manifest archive source differs from its case version');
    sourceSha = source.sha;
    provenance = { kind: 'validated combined Hub manifest', independentManifestCheck: true, repository: source.repository };
  }
  assert(sourceSha, 'An isolated candidate requires CHENGCE_SOURCE_SHA; a combined Hub can derive it from manifest.json');
  await mkdir(output, { recursive: true });
  const preview = await createPreviewServer(root);
  const report = {
    status: 'RUNNING', testedAt: new Date().toISOString(), testedDirectory: root,
    sourceSha, provenance,
    route: pathname, canonical, widths, browser: null, checks: [], errors: [],
    clipboard: { mode: 'deterministic browser stubs', success: 'not run', failure: 'not run', limitation: 'Checks application feedback, serialized text and selectable fallback. The operating-system clipboard is not exercised.' },
    screenshots: [],
    limitations: 'Chromium compiled-output checks only. Does not assert actual receipt of an inquiry or formal booking; no receiving endpoint is configured, and no external service is contacted.',
  };
  let browser;
  const allBlockedExternal = [];
  const allFormRequests = [];
  async function check(name, width, operation) {
    try {
      await operation();
      report.checks.push({ name, width, status: 'PASS' });
    } catch (error) {
      report.checks.push({ name, width, status: 'FAIL', error: error.message });
      throw new Error(`${width}px ${name}: ${error.message}`, { cause: error });
    }
  }

  try {
    browser = await chromium.launch({
      headless: true,
      env: sourceEnvironment(process.env),
      ...(process.env.SHOWCASE_CHROMIUM_PATH ? { executablePath: process.env.SHOWCASE_CHROMIUM_PATH } : {}),
    });
    report.browser = `Chromium ${browser.version()}`;
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin === preview.url) return route.continue();
        allBlockedExternal.push(route.request().url());
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      let observeFormRequests = false;
      page.on('pageerror', error => report.errors.push({ width, kind: 'javascript', message: error.message }));
      page.on('console', message => { if (message.type() === 'error') report.errors.push({ width, kind: 'console', message: message.text() }); });
      page.on('response', response => { if (response.status() >= 400) report.errors.push({ width, kind: 'http', status: response.status(), url: response.url() }); });
      page.on('requestfailed', request => report.errors.push({ width, kind: 'request', url: request.url(), message: request.failure()?.errorText }));
      page.on('request', request => {
        if (observeFormRequests && (['fetch', 'xhr'].includes(request.resourceType()) || !['GET', 'HEAD'].includes(request.method())))
          allFormRequests.push({ width, method: request.method(), type: request.resourceType(), url: request.url() });
      });
      try {
        await check('render, content and responsive layout', width, async () => {
          const response = await page.goto(`${preview.url}${pathname}`, { waitUntil: 'networkidle' });
          assert.equal(response?.status(), 200);
          assert.equal(await page.locator('h1').count(), 1);
          assert(await page.locator('h1').isVisible());
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
          assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
          const body = await page.locator('body').innerText();
          assert(!/展示|測試|模擬|示範|提案|待確認|待提供/.test(body), 'Found obsolete product wording');
          assert(!/已送出|預約已完成|預約成功|預約成立/.test(body), 'Found an unsupported submission or booking claim');
          await checkImages(page);
          const layout = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
          assert(layout.document <= layout.width + 1, `Horizontal overflow ${layout.document} > ${layout.width}`);
          const assets = await page.locator('img[src], script[src], link[rel="stylesheet"][href], link[rel~="icon"][href], link[rel="preload"][href], link[rel="modulepreload"][href]').evaluateAll(elements => [...new Set(elements.map(element => element.src || element.href).filter(url => url && /^https?:/.test(url)))]);
          for (const asset of assets) {
            const target = new URL(asset);
            assert.equal(target.origin, preview.url, `External asset: ${asset}`);
            assert(target.pathname.startsWith(pathname), `Asset escapes case path: ${asset}`);
            assert.equal((await context.request.head(asset)).status(), 200, `Broken resource: ${asset}`);
          }
          if ([375, 1440].includes(width)) {
            await page.evaluate(() => scrollTo(0, 0));
            const screenshot = `${width}-home.png`;
            await page.screenshot({ path: join(output, screenshot), fullPage: true });
            report.screenshots.push(screenshot);
          }
        });

        await check('navigation and consultation CTA', width, async () => {
          if (width < 1024) {
            const open = page.getByRole('button', { name: '開啟導覽選單', exact: true });
            await open.click();
            assert.equal(await page.locator('#mobile-nav').isVisible(), true);
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#mobile-nav').isVisible(), false);
            assert(await open.evaluate(element => element === document.activeElement), 'Escape did not return focus to menu toggle');
            await open.click();
            await checkAnchor(page, page.locator('#mobile-nav').getByRole('link', { name: '服務領域', exact: true }), '#services');
            assert.equal(await page.locator('#mobile-nav').isVisible(), false);
          } else {
            for (const hash of ['#about', '#services', '#consultant', '#process'])
              await checkAnchor(page, page.locator(`.desktop-nav a[href="${hash}"]`), hash);
          }
          await checkAnchor(page, page.locator('.hero-actions a[href="#consultation"]'), '#consultation');
        });

        await check('FAQ pointer and keyboard disclosure', width, async () => {
          const items = page.locator('.faq-list details');
          assert.equal(await items.count(), 4);
          for (const item of await items.all()) {
            await item.locator('summary').click();
            assert(await item.evaluate(element => element.open));
            await item.locator('summary').click();
            assert(!await item.evaluate(element => element.open));
          }
          const first = items.first();
          await first.locator('summary').focus();
          await page.keyboard.press('Enter');
          assert(await first.evaluate(element => element.open));
          await page.keyboard.press('Space');
          assert(!await first.evaluate(element => element.open));
        });

        // Start after hydration and resource loading. Purely local form actions must
        // not produce fetch/XHR or non-read HTTP methods.
        observeFormRequests = true;
        await check('required fields and invalid email feedback', width, async () => {
          await page.getByRole('button', { name: '整理諮詢需求', exact: true }).click();
          assert.equal(await page.locator('.consultation-error').count(), 5);
          assert(await page.locator('#consultation-name').evaluate(element => element === document.activeElement));
          assert.equal(await page.locator('#consultation-phone').getAttribute('aria-invalid'), 'false');
          await fillInquiry(page, { ...syntheticInquiry, email: 'invalid-email' });
          await page.getByRole('button', { name: '整理諮詢需求', exact: true }).click();
          assert.equal(await page.locator('.consultation-error').count(), 1);
          assert.equal(await page.locator('#consultation-email').getAttribute('aria-invalid'), 'true');
          assert(await page.locator('#consultation-email').evaluate(element => element === document.activeElement));
        });

        await check('valid inquiry produces accurate local summary', width, async () => {
          await page.locator('#consultation-email').fill(syntheticInquiry.email);
          await page.getByRole('button', { name: '整理諮詢需求', exact: true }).click();
          await page.getByRole('heading', { name: '諮詢摘要已備妥', exact: true }).waitFor();
          assert(await page.getByRole('heading', { name: '諮詢摘要已備妥', exact: true }).evaluate(element => element === document.activeElement));
          assert.deepEqual(await page.locator('.consultation-summary dd').allTextContents(), [syntheticInquiry.name, syntheticInquiry.company, syntheticInquiry.email, '未填寫', syntheticInquiry.category, syntheticInquiry.message]);
          assert.equal(await page.getByRole('button', { name: '開啟郵件洽詢', exact: true }).count(), 0);
          assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
          assert.equal(await page.getByRole('link', { name: '前往聯絡管道', exact: true }).count(), 0);
          if ([375, 1440].includes(width)) {
            const screenshot = `${width}-summary.png`;
            await page.locator('.consultation-card').screenshot({ path: join(output, screenshot) });
            report.screenshots.push(screenshot);
          }
        });

        await check('copy feedback and selected-text failure fallback', width, async () => {
          await page.evaluate(() => {
            window.__chengceCopiedText = null;
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__chengceCopiedText = value; } } });
          });
          await page.getByRole('button', { name: '複製諮詢摘要', exact: true }).click();
          await page.getByRole('status').filter({ hasText: '諮詢摘要已複製。' }).waitFor();
          assert.equal(await page.evaluate(() => window.__chengceCopiedText), serializedInquiry);
          report.clipboard.success = 'PASS (deterministic writeText stub)';
          await page.evaluate(() => {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Clipboard unavailable for this case', 'NotAllowedError'); } } });
          });
          await page.getByRole('button', { name: '複製諮詢摘要', exact: true }).click();
          const fallback = page.locator('#consultation-copy-text');
          await fallback.waitFor();
          assert.equal(await fallback.inputValue(), serializedInquiry);
          assert(await fallback.evaluate(element => element.readOnly && element === document.activeElement && element.selectionStart === 0 && element.selectionEnd === element.value.length));
          assert((await page.getByRole('status').innerText()).includes('目前無法自動複製'));
          report.clipboard.failure = 'PASS (deterministic rejected writeText stub)';
        });

        await check('edit retains values; reset and reload clear them', width, async () => {
          await page.getByRole('button', { name: '修改需求內容', exact: true }).click();
          for (const field of ['name', 'company', 'email', 'phone', 'category', 'message'])
            assert.equal(await page.locator(`#consultation-${field}`).inputValue(), syntheticInquiry[field]);
          await page.getByRole('button', { name: '整理諮詢需求', exact: true }).click();
          await page.getByRole('button', { name: '清除並重新填寫', exact: true }).click();
          for (const field of ['name', 'company', 'email', 'phone', 'category', 'message'])
            assert.equal(await page.locator(`#consultation-${field}`).inputValue(), '');
          await fillInquiry(page);
          observeFormRequests = false;
          await page.reload({ waitUntil: 'networkidle' });
          for (const field of ['name', 'company', 'email', 'phone', 'category', 'message'])
            assert.equal(await page.locator(`#consultation-${field}`).inputValue(), '');
        });
      } finally {
        await context.close();
      }
    }
    assert.equal(allBlockedExternal.length, 0, `Unexpected external requests: ${allBlockedExternal.join(', ')}`);
    assert.equal(allFormRequests.length, 0, `Local form unexpectedly sent a request: ${JSON.stringify(allFormRequests)}`);
    assert.equal(report.errors.length, 0, `Browser errors: ${JSON.stringify(report.errors)}`);
    report.checks.push({ name: 'no external requests, form submissions or browser errors', status: 'PASS' });
    report.status = 'PASS';
    console.log(`Chengce Chromium checks passed at ${widths.join(', ')}px. Copy branches use documented deterministic stubs; no external form was sent.`);
    return report;
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.message;
    throw error;
  } finally {
    report.blockedExternalRequests = allBlockedExternal;
    report.formRequests = allFormRequests;
    report.finishedAt = new Date().toISOString();
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (browser) await browser.close();
    await preview.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [directory, reportDirectory] = process.argv.slice(2);
  if (!directory) throw new Error('Usage: node scripts/test-chengce.mjs <combined-root> [report-directory]');
  await testChengce({ directory, reportDirectory });
}

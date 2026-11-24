import test from 'node:test';
import assert from 'node:assert/strict';
import { assertManifest, verifyPublication, verifyWithRetries } from '../scripts/verify-publication.mjs';

const origin = 'https://showcase.example.test';
const sha = 'a'.repeat(40);
const sites = [
  { slug: 'hongjia-brand', repository: 'xk2022/xk-brand-hongjia-birdnest', ref: 'main', sha },
  { slug: 'existing', repository: 'xk2022/existing', ref: 'main', sha: 'b'.repeat(40) },
  { slug: 'truck-transport', repository: 'xk2022/xk-corp-truck-transport', ref: 'main', sha: 'd'.repeat(40) },
  { slug: 'proposal', repository: 'xk2022/proposal', ref: 'main', framework: 'vite', indexable: false, listed: false, sha: 'c'.repeat(40) },
];
const manifest = sites.map(({ slug, repository, sha: sourceSha }) => ({ slug, repository, sha: sourceSha }));

function page(slug, route = '', robots = '') {
  const social = slug === 'hongjia-brand' ? `<meta property="og:image" content="${origin}/hongjia-brand/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/hongjia-brand/social-card.png">` : '';
  const transportSocial = slug === 'truck-transport' ? `<meta property="og:url" content="${origin}/truck-transport/${route}"><meta property="og:image" content="${origin}/truck-transport/images/social-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/truck-transport/images/social-card.jpg">` : '';
  const icon = slug === 'truck-transport' ? `/${slug}/favicon.svg` : `/${slug}/assets/icon.svg`;
  return `<html><head>${social}${transportSocial}<link rel="canonical" href="${origin}/${slug}/${route}">${robots}<link rel="stylesheet" href="/${slug}/assets/site.css"><link rel="preload" as="image" href="/${slug}/assets/photo.webp"><link rel="icon" href="${icon}"></head><body><h1>Example</h1><a href="/">Hub</a><img src="/${slug}/assets/photo.webp"><script src="/${slug}/assets/site.js"></script></body></html>`;
}

function fixture() {
  const files = new Map();
  const put = (path, body, type = 'text/html') => files.set(path, { body, type });
  put('/manifest.json', JSON.stringify(manifest), 'application/json');
  put('/', '<a href="./hongjia-brand/">Brand</a><a href="/existing/">Existing</a><a href="/truck-transport/">Transport</a>');
  put('/robots.txt', `User-agent: *\nSitemap: ${origin}/hongjia-brand/sitemap.xml\nSitemap: ${origin}/existing/sitemap.xml\nSitemap: ${origin}/truck-transport/sitemap.xml\nDisallow: /proposal/\n`, 'text/plain');
  for (const site of sites) {
    const paths = site.slug === 'hongjia-brand' ? ['', 'brand/', 'gifting/', 'journal/'] : site.slug === 'truck-transport' ? ['', 'services/', 'shipping-guide/', 'about/', 'inquiry/'] : [''];
    for (const path of paths) put(`/${site.slug}/${path}`, page(site.slug, path, site.indexable === false || site.slug === 'truck-transport' ? '<meta name="robots" content="noindex,nofollow">' : ''));
    if (site.slug === 'hongjia-brand') put(`/${site.slug}/social-card.png`, 'social image bytes', 'image/png');
    if (site.slug === 'truck-transport') {
      put('/truck-transport/images/social-card.jpg', 'social image bytes', 'image/jpeg');
      put('/truck-transport/favicon.svg', '<svg/>', 'image/svg+xml');
    }
    if (site.indexable !== false) put(`/${site.slug}/sitemap.xml`, `<urlset>${paths.map(path => `<url><loc>${origin}/${site.slug}/${path}</loc></url>`).join('')}</urlset>`, 'application/xml');
    put(`/${site.slug}/assets/site.css`, '@import "extra.css"; @font-face{src:url("font.woff2")} main{background:url(photo.webp)}', 'text/css');
    put(`/${site.slug}/assets/extra.css`, 'h1{color:navy}', 'text/css');
    put(`/${site.slug}/assets/site.js`, '/* javascript */', 'text/javascript');
    put(`/${site.slug}/assets/photo.webp`, 'image bytes', 'image/webp');
    put(`/${site.slug}/assets/icon.svg`, '<svg/>', 'image/svg+xml');
    put(`/${site.slug}/assets/font.woff2`, 'font bytes', 'font/woff2');
  }
  const requests = [];
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    requests.push({ url, options });
    const file = files.get(url.pathname);
    return new Response(file?.body || 'Not found', { status: file?.status || (file ? 200 : 404), headers: { 'content-type': file?.type || 'text/plain' } });
  };
  return { files, put, requests, fetchImpl };
}

function verify(data) { return verifyPublication({ sites, manifest, origin, fetchImpl: data.fetchImpl, verificationId: 'test-release' }); }

test('published manifest must have exactly the resolved source SHAs without duplicates', () => {
  assert.doesNotThrow(() => assertManifest([...manifest].reverse(), manifest));
  for (const bad of [manifest.slice(1), [...manifest, manifest[0]], manifest.map((entry, i) => i ? entry : { ...entry, sha: 'd'.repeat(40) }), [...manifest, { slug: 'other', repository: 'xk2022/other', sha }]]) {
    assert.throws(() => assertManifest(bad, manifest), /manifest/);
  }
});

test('public verification checks all Brand routes, existing sites, proposal controls and nested CSS resources', async () => {
  const data = fixture();
  const result = await verify(data);
  assert.equal(result.sites, 4);
  assert.equal(result.pages, 11);
  assert.equal(result.assets, 26);
  assert(data.requests.some(({ url }) => url.pathname === '/hongjia-brand/assets/font.woff2'));
  assert(data.requests.some(({ url }) => url.pathname === '/hongjia-brand/journal/'));
  for (const { url, options } of data.requests) {
    assert.equal(url.searchParams.get('__showcase_verify'), 'test-release');
    assert.equal(options.headers['cache-control'], 'no-cache, no-store');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert(options.signal instanceof AbortSignal);
  }
});

test('a missing Brand deep route fails even when its homepage and manifest are present', async () => {
  const data = fixture();
  data.files.delete('/hongjia-brand/gifting/');
  await assert.rejects(verify(data), /HTTP 404.*gifting/);
  data.put('/hongjia-brand/sitemap.xml', `<urlset><url><loc>${origin}/hongjia-brand/</loc></url></urlset>`, 'application/xml');
  await assert.rejects(verify(data), /sitemap is missing route/);
});

test('CSS font 404 and asset HTML fallback fail verification', async () => {
  const data = fixture();
  data.files.delete('/hongjia-brand/assets/font.woff2');
  await assert.rejects(verify(data), /HTTP 404.*font/);
  data.put('/hongjia-brand/assets/font.woff2', '<html>404 fallback</html>');
  await assert.rejects(verify(data), /Asset returned HTML/);
});

test('wrong nested canonical or duplicate Brand H1 fails verification', async () => {
  const data = fixture();
  data.put('/hongjia-brand/brand/', page('hongjia-brand', ''));
  await assert.rejects(verify(data), /Incorrect canonical.*brand/);
  data.put('/hongjia-brand/brand/', page('hongjia-brand', 'brand/') + '<h1>Second</h1>');
  await assert.rejects(verify(data), /one H1/);
});

test('proposal indexing and visibility cannot silently change in the public export', async () => {
  const data = fixture();
  data.put('/proposal/', page('proposal'));
  await assert.rejects(verify(data), /Missing noindex,nofollow/);
  data.put('/proposal/', page('proposal', '', '<meta name="robots" content="noindex,nofollow">'));
  data.put('/proposal/sitemap.xml', '<urlset/>', 'application/xml');
  await assert.rejects(verify(data), /proposal exposes sitemap/);
  data.files.delete('/proposal/sitemap.xml');
  data.put('/', '<a href="./hongjia-brand/">Brand</a><a href="./existing/">Existing</a><a href="./truck-transport/">Transport</a><a href="./proposal/">Proposal</a>');
  await assert.rejects(verify(data), /card visibility/);
});


test('Brand social metadata must use the public 1200×630 card on every page', async () => {
  for (const [oldValue, newValue] of [
    ['content="1200"', 'content="800"'],
    ['content="630"', 'content="600"'],
    ['content="summary_large_image"', 'content="summary"'],
    [`${origin}/hongjia-brand/social-card.png`, `${origin}/old-lp/social-card.png`],
  ]) {
    const data = fixture();
    data.put('/hongjia-brand/journal/', page('hongjia-brand', 'journal/').replace(oldValue, newValue));
    await assert.rejects(verify(data), /Incorrect Brand social metadata/);
  }
  const data = fixture();
  data.put('/hongjia-brand/gifting/', page('hongjia-brand', 'gifting/').replace(/<meta name="twitter:image"[^>]*>/, ''));
  await assert.rejects(verify(data), /Incorrect Brand social metadata twitter:image/);
});

test('Brand social image is fetched and a 404 fails public verification', async () => {
  const data = fixture();
  data.files.delete('/hongjia-brand/social-card.png');
  await assert.rejects(verify(data), /HTTP 404.*social-card/);
});

test('same-origin assets cannot escape their showcase and unrelated external assets are not requested', async () => {
  const data = fixture();
  data.put('/hongjia-brand/', page('hongjia-brand') + '<img src="https://images.example.test/photo.webp">');
  await verify(data);
  assert(data.requests.every(({ url }) => url.origin === origin));
  data.put('/hongjia-brand/', page('hongjia-brand') + '<script src="/other/site.js"></script>');
  await assert.rejects(verify(data), /Asset escapes case path/);
});

test('bounded retries recover from a stale manifest without disabling certificate verification', async () => {
  const data = fixture();
  let manifestRequests = 0;
  const delayedFetch = async (url, options) => {
    assert.equal(options.rejectUnauthorized, undefined);
    if (new URL(url).pathname === '/manifest.json' && ++manifestRequests === 1) return new Response(JSON.stringify(manifest.map(entry => ({ ...entry, sha: 'f'.repeat(40) }))), { headers: { 'content-type': 'application/json' } });
    return data.fetchImpl(url, options);
  };
  const waits = [];
  const result = await verifyWithRetries({ sites, origin, fetchImpl: delayedFetch }, { attempts: 2, delayMs: 5, sleepImpl: async ms => waits.push(ms), onRetry: () => {} });
  assert.equal(result.pages, 11);
  assert.equal(manifestRequests, 2);
  assert.deepEqual(waits, [5]);
});

test('verification gives up after a bounded number of cache misses and rejects unbounded configuration', async () => {
  let attempts = 0;
  const staleFetch = async () => { attempts++; return new Response('[]'); };
  await assert.rejects(verifyWithRetries({ sites, origin, fetchImpl: staleFetch }, { attempts: 2, delayMs: 0, sleepImpl: async () => {}, onRetry: () => {} }), /failed after 2 attempts/);
  assert.equal(attempts, 2);
  await assert.rejects(verifyWithRetries({ sites }, { attempts: 0 }), /Invalid bounded/);
});


test('transport publication verifies five explicit routes, noindex and actual social/icon assets', async () => {
  const data = fixture();
  await verify(data);
  for (const route of ['', 'services/', 'shipping-guide/', 'about/', 'inquiry/']) assert(data.requests.some(({ url }) => url.pathname === `/truck-transport/${route}`));
  for (const asset of ['/truck-transport/images/social-card.jpg', '/truck-transport/favicon.svg']) assert(data.requests.some(({ url }) => url.pathname === asset));
  for (const asset of ['/truck-transport/images/social-card.jpg', '/truck-transport/favicon.svg']) {
    const missing = fixture();
    missing.files.delete(asset);
    await assert.rejects(verify(missing), /HTTP 404/);
  }
});

test('transport sitemap must have exactly five unique routes and cannot hide a missing deep page', async () => {
  const data = fixture();
  data.files.delete('/truck-transport/inquiry/');
  await assert.rejects(verify(data), /HTTP 404.*inquiry/);
  for (const xml of [
    `<urlset><loc>${origin}/truck-transport/</loc></urlset>`,
    `<urlset>${['', 'services/', 'shipping-guide/', 'about/', 'about/'].map(route => `<loc>${origin}/truck-transport/${route}</loc>`).join('')}</urlset>`,
  ]) {
    data.put('/truck-transport/sitemap.xml', xml, 'application/xml');
    await assert.rejects(verify(data), /Transport sitemap/);
  }
});

test('transport rejects indexing changes, duplicate H1 and incorrect social/icon metadata on a nested page', async () => {
  const correct = page('truck-transport', 'about/', '<meta name="robots" content="noindex,nofollow">');
  for (const html of [
    correct.replace('noindex,nofollow', 'index,follow'),
    correct + '<h1>Duplicate</h1>',
    correct.replace('property="og:url"', 'property="missing:og-url"'),
    correct.replace(`${origin}/truck-transport/images/social-card.jpg`, 'https://external.invalid/card.jpg'),
    correct.replace('href="/truck-transport/favicon.svg"', 'href="/other/favicon.svg"'),
  ]) {
    const data = fixture();
    data.put('/truck-transport/about/', html);
    await assert.rejects(verify(data), /transport|Transport/);
  }
});


test('transport social image and icon cannot return a successful non-image response', async () => {
  for (const asset of ['/truck-transport/images/social-card.jpg', '/truck-transport/favicon.svg']) {
    const data = fixture();
    data.put(asset, '{"not":"an image"}', 'application/json');
    await assert.rejects(verify(data), /Incorrect transport asset content type/);
  }
});

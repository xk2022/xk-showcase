import test from 'node:test';
import assert from 'node:assert/strict';
import { assertManifest, verifyPublication, verifyWithRetries } from '../scripts/verify-publication.mjs';

const origin = 'https://showcase.example.test';
const sha = 'a'.repeat(40);
const sites = [
  { slug: 'hongjia-brand', repository: 'xk2022/xk-brand-hongjia-birdnest', ref: 'main', sha },
  { slug: 'existing', repository: 'xk2022/existing', ref: 'main', sha: 'b'.repeat(40) },
  { slug: 'proposal', repository: 'xk2022/proposal', ref: 'main', framework: 'vite', indexable: false, listed: false, sha: 'c'.repeat(40) },
];
const manifest = sites.map(({ slug, repository, sha: sourceSha }) => ({ slug, repository, sha: sourceSha }));

function page(slug, route = '', robots = '') {
  const social = slug === 'hongjia-brand' ? `<meta property="og:image" content="${origin}/hongjia-brand/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/hongjia-brand/social-card.png">` : '';
  return `<html><head>${social}<link rel="canonical" href="${origin}/${slug}/${route}">${robots}<link rel="stylesheet" href="/${slug}/assets/site.css"><link rel="preload" as="image" href="/${slug}/assets/photo.webp"><link rel="icon" href="/${slug}/assets/icon.svg"></head><body><h1>Example</h1><a href="/">Hub</a><img src="/${slug}/assets/photo.webp"><script src="/${slug}/assets/site.js"></script></body></html>`;
}

function fixture() {
  const files = new Map();
  const put = (path, body, type = 'text/html') => files.set(path, { body, type });
  put('/manifest.json', JSON.stringify(manifest), 'application/json');
  put('/', '<a href="./hongjia-brand/">Brand</a><a href="/existing/">Existing</a>');
  put('/robots.txt', `User-agent: *\nSitemap: ${origin}/hongjia-brand/sitemap.xml\nSitemap: ${origin}/existing/sitemap.xml\nDisallow: /proposal/\n`, 'text/plain');
  for (const site of sites) {
    const paths = site.slug === 'hongjia-brand' ? ['', 'brand/', 'gifting/', 'journal/'] : [''];
    for (const path of paths) put(`/${site.slug}/${path}`, page(site.slug, path, site.indexable === false ? '<meta name="robots" content="noindex,nofollow">' : ''));
    if (site.slug === 'hongjia-brand') put(`/${site.slug}/social-card.png`, 'social image bytes', 'image/png');
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
  assert.equal(result.sites, 3);
  assert.equal(result.pages, 6);
  assert.equal(result.assets, 19);
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
  data.put('/', '<a href="./hongjia-brand/">Brand</a><a href="./existing/">Existing</a><a href="./proposal/">Proposal</a>');
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
  assert.equal(result.pages, 6);
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

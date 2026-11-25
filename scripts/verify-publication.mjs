import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { origin as defaultOrigin, validateSites, transportRoutes, shengfengyangRoutes, assertTransportPage, assertTransportSitemap } from './static-export.mjs';

const shaPattern = /^[a-f0-9]{40}$/;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(([, name, , value]) => [name.toLowerCase(), decode(value)]));
const tags = (html, names) => [...html.matchAll(new RegExp(`<(${names})\\b[^>]*>`, 'gi'))].map(match => ({ tagName: match[1].toLowerCase(), ...attributes(match[0]) }));

function manifestRows(manifest) {
  if (!Array.isArray(manifest)) throw new Error('Publication manifest must be an array');
  const slugs = new Set();
  return manifest.map(entry => {
    if (!entry || typeof entry.slug !== 'string' || typeof entry.repository !== 'string' || !shaPattern.test(entry.sha) || slugs.has(entry.slug)) throw new Error('Invalid or duplicate publication manifest entry');
    slugs.add(entry.slug);
    return { slug: entry.slug, repository: entry.repository, sha: entry.sha };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}

export function assertManifest(actual, expected) {
  if (JSON.stringify(manifestRows(actual)) !== JSON.stringify(manifestRows(expected))) throw new Error('Published manifest does not match the resolved release SHAs');
}

function assertCanonical(html, expected) {
  const canonical = tags(html, 'link').filter(tag => tag.rel?.toLowerCase().split(/\s+/).includes('canonical'));
  if (canonical.length !== 1 || canonical[0].href !== expected) throw new Error(`Incorrect canonical URL: ${expected}`);
}

function assertBrandSocial(html, base) {
  const expectedImage = `${base}/hongjia-brand/social-card.png`;
  const expected = {
    'og:image': expectedImage,
    'og:image:width': '1200',
    'og:image:height': '630',
    'twitter:card': 'summary_large_image',
    'twitter:image': expectedImage,
  };
  const metadata = tags(html, 'meta');
  for (const [key, value] of Object.entries(expected)) {
    const matches = metadata.filter(tag => (tag.property || tag.name)?.toLowerCase() === key);
    if (matches.length !== 1 || matches[0].content !== value) throw new Error(`Incorrect Brand social metadata ${key}`);
  }
  return expectedImage;
}

function assertNoindex(html, url) {
  const robots = tags(html, 'meta').filter(tag => tag.name?.toLowerCase() === 'robots');
  if (!robots.length || robots.some(tag => {
    const tokens = (tag.content || '').toLowerCase().split(/[\s,]+/);
    return !tokens.includes('noindex') || !tokens.includes('nofollow') || tokens.includes('index') || tokens.includes('follow');
  })) throw new Error(`Missing noindex,nofollow: ${url}`);
}

function sourceSet(value) {
  if (!value || value.startsWith('data:')) return [];
  return value.split(',').map(item => item.trim().split(/\s+/)[0]).filter(Boolean);
}

function htmlResources(html) {
  const resources = [];
  for (const tag of tags(html, 'script|img|source|link')) {
    if (tag.tagName === 'script' && tag.src) resources.push(tag.src);
    if (['img', 'source'].includes(tag.tagName)) {
      if (tag.src) resources.push(tag.src);
      resources.push(...sourceSet(tag.srcset));
    }
    if (tag.tagName === 'link' && /^(?:stylesheet|icon|shortcut icon|apple-touch-icon|preload|modulepreload)$/i.test(tag.rel || '')) {
      if (tag.href) resources.push(tag.href);
      resources.push(...sourceSet(tag.imagesrcset));
    }
  }
  return resources;
}

function cssResources(css) {
  return [...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map(match => match[2]).concat([...css.matchAll(/@import\s+(["'])(.*?)\1/gi)].map(match => match[2]));
}

export async function verifyPublication({ sites, manifest = sites.map(({ slug, repository, sha }) => ({ slug, repository, sha })), origin = defaultOrigin, fetchImpl = fetch, requestTimeoutMs = 5000, verificationId = `${Date.now()}` }) {
  validateSites(sites);
  const base = new URL(origin).origin;
  manifestRows(manifest);
  const visitedAssets = new Set();
  let pagesChecked = 0;
  let requests = 0;
  const request = async (input, { allowMissing = false } = {}) => {
    const url = new URL(input, `${base}/`);
    if (url.origin !== base) throw new Error(`Verification request escapes showcase origin: ${url}`);
    url.searchParams.set('__showcase_verify', verificationId);
    requests++;
    const response = await fetchImpl(url, {
      headers: { 'cache-control': 'no-cache, no-store', pragma: 'no-cache' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (allowMissing && response.status === 404) return response;
    if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${input}`);
    return response;
  };
  const published = await (await request('/manifest.json')).json();
  assertManifest(published, manifest);
  const index = await (await request('/')).text();
  const hubLinks = new Set(tags(index, 'a').map(tag => tag.href).filter(Boolean).map(href => new URL(href, `${base}/`).href));
  const galleryImages = new Set(tags(index, 'img').map(tag => tag.src).filter(Boolean).map(src => new URL(src, `${base}/`).href));
  const robots = await (await request('/robots.txt')).text();
  const robotLines = new Set(robots.split(/\r?\n/).map(line => line.trim()));

  const verifyAsset = async (raw, pageUrl, site) => {
    if (!raw || /^(?:data:|blob:|#)/i.test(raw)) return;
    const url = new URL(raw, pageUrl);
    if (url.origin !== base) return; // Third-party assets are outside this publication contract.
    if (!url.pathname.startsWith(`/${site.slug}/`)) throw new Error(`Asset escapes case path: ${url.pathname}`);
    url.hash = '';
    if (visitedAssets.has(url.href)) return;
    visitedAssets.add(url.href);
    const response = await request(url);
    const type = response.headers.get('content-type') || '';
    const isCSS = /\.css$/i.test(url.pathname) || type.includes('text/css');
    if (type.includes('text/html')) throw new Error(`Asset returned HTML instead of its resource: ${url.pathname}`);
    if (site.slug === 'truck-transport') {
      const expectedType = url.pathname === '/truck-transport/images/social-card.jpg' ? 'image/jpeg' : url.pathname === '/truck-transport/favicon.svg' ? 'image/svg+xml' : undefined;
      if (expectedType && type.split(';')[0].trim().toLowerCase() !== expectedType) throw new Error(`Incorrect transport asset content type: ${url.pathname}`);
    }
    if (isCSS) {
      const css = await response.text();
      for (const resource of cssResources(css)) await verifyAsset(resource, url, site);
    } else {
      await response.arrayBuffer();
    }
  };

  for (const site of sites) {
    const home = `${base}/${site.slug}/`;
    if (hubLinks.has(home) !== (site.listed !== false)) throw new Error(`Incorrect showcase card visibility: ${site.slug}`);
    if (galleryImages.has(`${home}_showcase-preview.jpg`)) await verifyAsset(`${home}_showcase-preview.jpg`, home, site);
    const pages = new Set([home]);
    if (site.indexable === false) {
      if (!robotLines.has(`Disallow: /${site.slug}/`) || robotLines.has(`Sitemap: ${home}sitemap.xml`)) throw new Error(`Incorrect proposal robots policy: ${site.slug}`);
      const sitemap = await request(`${home}sitemap.xml`, { allowMissing: true });
      if (sitemap.status !== 404) throw new Error(`Non-indexable proposal exposes sitemap.xml: ${site.slug}`);
    } else {
      if (!robotLines.has(`Sitemap: ${home}sitemap.xml`)) throw new Error(`Missing sitemap robots reference: ${site.slug}`);
      const sitemap = await (await request(`${home}sitemap.xml`)).text();
      if (site.slug === 'truck-transport') assertTransportSitemap(sitemap, base);
      for (const [, value] of sitemap.matchAll(/<loc\b[^>]*>(.*?)<\/loc>/gs)) {
        const url = new URL(decode(value.trim()));
        if (url.origin !== base || !url.pathname.startsWith(`/${site.slug}/`) || url.search || url.hash) throw new Error(`Sitemap URL escapes case path: ${url}`);
        if (url.pathname.endsWith('.xml')) throw new Error(`Nested sitemap requires explicit verification support: ${url}`);
        pages.add(url.href);
      }
      if (pages.size > 200) throw new Error(`Too many sitemap pages to verify: ${site.slug}`);
      if (site.slug === 'hongjia-brand') {
        for (const route of ['', 'brand/', 'gifting/', 'journal/']) {
          if (!pages.has(`${home}${route}`)) throw new Error(`Brand sitemap is missing route: ${route || '/'}`);
        }
      }
    }
    if (site.slug === 'truck-transport') {
      for (const route of transportRoutes) pages.add(`${home}${route}`);
    }
    if (site.slug === 'shengfengyang') {
      for (const route of shengfengyangRoutes) pages.add(`${home}${route}`);
    }
    for (const url of pages) {
      const html = await (await request(url)).text();
      assertCanonical(html, url);
      // Vite proposals may render their heading in JavaScript; Brand pages are static HTML.
      if (site.slug === 'hongjia-brand' && [...html.matchAll(/<h1\b/gi)].length !== 1) throw new Error(`Brand page must have one H1: ${url}`);
      if (site.slug === 'shengfengyang') {
        const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
        if (headings.length !== 1 || !headings[0][1].replace(/<[^>]*>/g, '').trim()) throw new Error(`Shengfengyang page must have one nonempty H1: ${url}`);
      }
      if (site.indexable === false) assertNoindex(html, url);
      if (site.slug === 'hongjia-brand') await verifyAsset(assertBrandSocial(html, base), url, site);
      if (site.slug === 'truck-transport') {
        for (const asset of assertTransportPage(html, url, base)) await verifyAsset(asset, url, site);
      }
      for (const resource of htmlResources(html)) await verifyAsset(resource, url, site);
      pagesChecked++;
    }
  }
  return { sites: sites.length, pages: pagesChecked, assets: visitedAssets.size, requests };
}

export async function verifyWithRetries(options, { attempts = 12, delayMs = 15000, sleepImpl = sleep, onRetry = message => console.warn(message) } = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20 || !Number.isFinite(delayMs) || delayMs < 0 || delayMs > 30000) throw new Error('Invalid bounded verification retry options');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await verifyPublication({ ...options, verificationId: `${Date.now()}-${attempt}` });
    } catch (error) {
      if (attempt === attempts) throw new Error(`Public verification failed after ${attempts} attempts: ${error.message}`, { cause: error });
      onRetry(`Public verification attempt ${attempt}/${attempts}: ${error.message}`);
      await sleepImpl(delayMs);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/verify-publication.mjs <resolved-sites.json>');
  const plan = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const sites = Array.isArray(plan) ? plan : plan.sites;
  const result = await verifyWithRetries({ sites, origin: process.env.SHOWCASE_ORIGIN || defaultOrigin });
  console.log(`Verified publication: ${result.sites} sites, ${result.pages} pages, ${result.assets} assets`);
}

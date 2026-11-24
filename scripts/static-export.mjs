import { access, readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

export const origin = 'https://showcase.xplorekaleidoscope.com';
export const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function validateSites(sites) {
  const seen = new Set();
  for (const site of sites) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug) || seen.has(site.slug) || !/^xk2022\/[a-zA-Z0-9_-]+$/.test(site.repository)) throw new Error('Invalid or duplicate showcase: ' + site.slug);
    if (site.framework !== undefined && !['next', 'vite'].includes(site.framework)) throw new Error('Unsupported framework: ' + site.slug);
    for (const option of ['indexable', 'listed']) {
      if (site[option] !== undefined && typeof site[option] !== 'boolean') throw new Error(`Invalid ${option}: ${site.slug}`);
    }
    seen.add(site.slug);
  }
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(([, name, , value]) => [name.toLowerCase(), value]));
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Symlinks are not supported in static exports: ' + entry.name);
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

export async function validateLocalReferences(html, directory, slug, pagePath = 'index.html') {
  const prefix = `/${slug}/`;
  const resources = new Set([...html.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gs)].map(([, , value]) => value));
  for (const resource of resources) {
    if (resource.startsWith('//')) throw new Error(`Asset escapes case path: ${resource}`);
    if (/^[a-z][a-z\d+.-]*:/i.test(resource) || /^[?#]/.test(resource) || !resource) continue;
    const decoded = decodeURIComponent(resource.split(/[?#]/)[0]);
    if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(part => part === '..')) throw new Error(`Unsafe resource path: ${resource}`);
    const pathname = new URL(decoded, `${origin}${prefix}${pagePath}`).pathname;
    if (!pathname.startsWith(prefix)) throw new Error(`Asset escapes case path: ${resource}`);
    const path = resolve(directory, pathname.slice(prefix.length));
    if (path !== resolve(directory) && !path.startsWith(resolve(directory) + sep)) throw new Error(`Asset escapes output: ${resource}`);
    const info = await stat(path);
    await access(info.isDirectory() ? join(path, 'index.html') : path);
  }
}

export async function validateExport(directory, site) {
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  if (!html.includes(`${origin}/${site.slug}/`)) throw new Error(`Invalid canonical URL: ${site.slug}`);
  if (site.framework === 'vite') {
    const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map(match => attributes(match[0]));
    const assetPrefix = `/${site.slug}/assets/`;
    if (!tags.some(tag => tag.type === 'module' && tag.src?.startsWith(assetPrefix) && /\.js(?:\?|$)/.test(tag.src)) || !tags.some(tag => tag.rel === 'stylesheet' && tag.href?.startsWith(assetPrefix) && /\.css(?:\?|$)/.test(tag.href))) throw new Error(`Invalid Vite assets: ${site.slug}`);
    await access(join(directory, '404.html'));
  } else if (!html.includes(`/${site.slug}/_next/static/`)) {
    throw new Error(`Invalid Next.js base path: ${site.slug}`);
  }

  const files = site.framework === 'vite' || site.indexable === false ? await htmlFiles(directory) : [join(directory, 'index.html')];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    await validateLocalReferences(content, directory, site.slug, relative(directory, file).split(sep).join('/'));
    if (site.indexable === false) {
      const robots = [...content.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).filter(tag => tag.name?.toLowerCase() === 'robots');
      if (!robots.length || robots.some(tag => {
        const tokens = (tag.content || '').toLowerCase().split(/[\s,]+/);
        return !tokens.includes('noindex') || !tokens.includes('nofollow') || tokens.includes('index') || tokens.includes('follow');
      })) throw new Error(`Missing noindex,nofollow in ${site.slug}/${relative(directory, file)}`);
    }
  }
  if (site.indexable === false) {
    try {
      await access(join(directory, 'sitemap.xml'));
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    throw new Error(`Non-indexable proposal must not export sitemap.xml: ${site.slug}`);
  }
  await access(join(directory, 'sitemap.xml'));
}

export function buildRobots(sites) {
  const blocked = sites.filter(site => site.indexable === false).map(site => `Disallow: /${site.slug}/`);
  const sitemaps = sites.filter(site => site.indexable !== false).map(site => `Sitemap: ${origin}/${site.slug}/sitemap.xml`);
  return ['User-agent: *', 'Allow: /', ...blocked, ...sitemaps, ''].join('\n');
}

export function renderCards(sites) {
  return sites.filter(site => site.listed !== false).map(site => `<a class="card" href="./${site.slug}/"><small>${escape(site.category)}</small><h2>${escape(site.name)}</h2><span>瀏覽展示案例 →</span></a>`).join('\n');
}

export function renderNotFound(sites) {
  const fallbacks = sites.filter(site => site.framework === 'vite').map(site => [`/${site.slug}/`, `/${site.slug}/404.html`]);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>找不到頁面｜XK SYSTEM</title></head><body><main><h1>找不到頁面 / Page not found</h1><p>請使用網站導覽返回。Return to the showcase to continue.</p><a href="/">XK SYSTEM Showcase</a></main><script>const fallbacks=${JSON.stringify(fallbacks)};const match=fallbacks.find(([prefix])=>location.pathname.startsWith(prefix));if(match){const language=new URLSearchParams(location.search).get('lang')==='en'?'?lang=en':'';location.replace(match[1]+language);}</script></body></html>\n`;
}

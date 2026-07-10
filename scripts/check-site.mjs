import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const errors = [];
const warnings = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function fail(file, message) {
  errors.push(`${rel(file)}: ${message}`);
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, ' ');
}

function localTarget(fromFile, rawValue) {
  let value = rawValue.trim();
  if (!value || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|about:)/i.test(value)) return null;
  if (/[{}<>]/.test(value)) return null;
  if (/^[A-Z][A-Z0-9_-]*$/.test(value)) return null;
  value = value.split('#')[0].split('?')[0];
  if (!value) return null;
  try { value = decodeURIComponent(value); } catch {}
  const candidate = value.startsWith('/')
    ? path.join(root, value.replace(/^\/+/, ''))
    : path.resolve(path.dirname(fromFile), value);
  return candidate;
}

function targetExists(candidate, rawValue) {
  if (fs.existsSync(candidate)) return true;
  if (rawValue.split(/[?#]/)[0].endsWith('/')) return fs.existsSync(path.join(candidate, 'index.html'));
  if (!path.extname(candidate)) {
    return fs.existsSync(`${candidate}.html`) || fs.existsSync(path.join(candidate, 'index.html'));
  }
  return false;
}

const files = walk(root);
const htmlFiles = files.filter(file => file.toLowerCase().endsWith('.html'));

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (!/^\s*<!doctype html>/i.test(html)) fail(file, 'missing HTML5 doctype');
  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) fail(file, 'missing html lang attribute');
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, 'missing non-empty title');
  if (!/<meta\b[^>]*\bname=["']viewport["']/i.test(html)) fail(file, 'missing viewport metadata');
  const cspMatch = /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"[^>]*>/i.exec(html);
  if (!cspMatch) fail(file, 'missing Content Security Policy');
  else {
    const firstScript = html.search(/<script\b/i);
    if (firstScript !== -1 && cspMatch.index > firstScript) fail(file, 'Content Security Policy appears after a script');
    for (const script of html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(script.groups.attrs)) continue;
      const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(script.groups.attrs)?.[1]?.toLowerCase() || '';
      if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
      const normalized = script.groups.body.replace(/\r\n?/g, '\n');
      const hash = `sha256-${crypto.createHash('sha256').update(normalized, 'utf8').digest('base64')}`;
      if (!cspMatch[1].includes(`'${hash}'`) && !cspMatch[1].includes("'unsafe-inline'")) {
        fail(file, `inline script is not authorized by CSP hash ${hash}`);
      }
    }
  }

  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(script[1]); }
    catch (error) { fail(file, `invalid JSON-LD: ${error.message}`); }
  }

  const ids = new Map();
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    const count = (ids.get(match[1]) || 0) + 1;
    ids.set(match[1], count);
  }
  for (const [id, count] of ids) if (count > 1) fail(file, `duplicate id "${id}"`);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=/i.test(match[0])) fail(file, `image missing alt text: ${stripTags(match[0]).trim().slice(0, 80)}`);
  }
  for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
    if (!/\btitle\s*=/i.test(match[0])) fail(file, 'iframe missing title');
  }
  for (const match of html.matchAll(/<a\b[^>]*\btarget=["']_blank["'][^>]*>/gi)) {
    if (!/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(match[0])) fail(file, 'target=_blank link missing rel=noopener');
  }
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) fail(file, 'inline event handler found');

  if (/class=["'][^"']*\bskip-link\b/i.test(html) && !/id=["']main-content["']/i.test(html) && !/href=["']#desktop["']/i.test(html)) {
    fail(file, 'skip link has no main-content target');
  }

  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    if (/^http:\/\//i.test(match[1]) && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(match[1])) {
      fail(file, `insecure external reference "${match[1]}"`);
    }
    const candidate = localTarget(file, match[1]);
    if (candidate && !targetExists(candidate, match[1])) fail(file, `broken local reference "${match[1]}"`);
  }
}

const sitemapFile = path.join(root, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) errors.push('sitemap.xml: missing');
else {
  const xml = fs.readFileSync(sitemapFile, 'utf8');
  const seen = new Set();
  for (const match of xml.matchAll(/<loc>(https:\/\/ikandy\.app\/[^<]*)<\/loc>/g)) {
    const url = new URL(match[1]);
    if (seen.has(url.href)) fail(sitemapFile, `duplicate URL ${url.href}`);
    seen.add(url.href);
    const localPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const resolved = url.pathname.endsWith('/')
      ? path.join(root, localPath, 'index.html')
      : path.join(root, localPath);
    if (!fs.existsSync(resolved)) fail(sitemapFile, `URL has no local file: ${url.href}`);
    else {
      const page = fs.readFileSync(resolved, 'utf8');
      if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(page)) {
        fail(sitemapFile, `URL points to a noindex page: ${url.href}`);
      }
      if (!/<meta\b[^>]*name=["']description["']/i.test(page)) fail(resolved, 'sitemap page is missing a meta description');
      if (!/<link\b[^>]*rel=["']canonical["']/i.test(page)) fail(resolved, 'sitemap page is missing a canonical URL');
    }
  }
  if (seen.size === 0) fail(sitemapFile, 'contains no ikandy.app URLs');
  for (const match of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(match[1])) fail(sitemapFile, `invalid lastmod date ${match[1]}`);
  }
}

const robotsFile = path.join(root, 'robots.txt');
if (!fs.existsSync(robotsFile)) errors.push('robots.txt: missing');
else {
  const robots = fs.readFileSync(robotsFile, 'utf8');
  if (!/^Sitemap:\s*https:\/\/ikandy\.app\/sitemap\.xml\s*$/im.test(robots)) fail(robotsFile, 'missing canonical sitemap directive');
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gim)].map(match => match[1]);
  for (const file of htmlFiles) {
    const page = fs.readFileSync(file, 'utf8');
    if (!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(page)) continue;
    const urlPath = `/${rel(file).replace(/\\/g, '/')}`;
    if (disallowed.some(rule => rule !== '/' && urlPath.startsWith(rule))) {
      fail(robotsFile, `blocks noindex page ${urlPath}; crawlers must access the page to read noindex`);
    }
  }
}

const securityTxt = path.join(root, '.well-known', 'security.txt');
if (!fs.existsSync(securityTxt)) errors.push('.well-known/security.txt: missing');
else {
  const contents = fs.readFileSync(securityTxt, 'utf8');
  if (!/^Contact:\s*mailto:/im.test(contents)) fail(securityTxt, 'missing mailto Contact');
  if (!/^Canonical:\s*https:\/\/ikandy\.app\/\.well-known\/security\.txt\s*$/im.test(contents)) fail(securityTxt, 'missing canonical URL');
  if (!/^Policy:\s*https:\/\/ikandy\.app\/security\.html\s*$/im.test(contents)) fail(securityTxt, 'missing security policy URL');
  const expiry = /^Expires:\s*(\S+)\s*$/im.exec(contents)?.[1];
  if (!expiry || Number.isNaN(Date.parse(expiry))) fail(securityTxt, 'missing or invalid Expires value');
  else if (Date.parse(expiry) <= Date.now()) fail(securityTxt, `expired on ${expiry}`);
}

const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.md', '.txt', '.json', '.xml', '.yml', '.yaml']);
for (const file of files) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const name = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) fail(file, 'private key material found');
  if (/\bsk_live_[A-Za-z0-9_-]{16,}\b/.test(text)) fail(file, 'live payment secret found');
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') fail(file, 'Supabase service_role JWT found');
    } catch {}
  }
  if (/^(?:admin\.html)$/i.test(name)) fail(file, 'admin.html must never be committed');
}

const mojibakeFiles = files.filter(file => /\.(?:html|css|js)$/i.test(file) && !/webamp\.bundle|min\.js$/i.test(file));
for (const file of mojibakeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/â(?:€|˜|–|—|€¦)|Ã—|Â·|ðŸ/.test(text)) fail(file, 'probable UTF-8 mojibake found');
}

if (warnings.length) {
  console.warn(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error(`Site checks failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site checks passed: ${htmlFiles.length} HTML files, local links, sitemap/indexing, CSP hashes, JSON-LD, security.txt, encoding, and secret scan.`);

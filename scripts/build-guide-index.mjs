#!/usr/bin/env node
// Rebuild assets/guide-index.json — the deep-search index behind guide.html's search box.
// Run from the repo root after editing ANY guide/*.html page:
//   node scripts/build-guide-index.mjs
// The index does not update itself; a stale index keeps serving text from retired
// page versions (this bit us: retired Spotify Client ID / LRCLIB / DPAPI claims kept
// surfacing in search results long after the pages were rewritten).
//
// Format (consumed by assets/guide-page.js): a JSON array of
//   { slug, title, desc, hue, text }
// where `text` is the lowercased, whitespace-collapsed visible text of the page's
// <main> element (crumb + headings + body + prev/next labels, matching the
// original index's behavior).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const guideDir = join(root, 'guide');
const outPath = join(root, 'assets', 'guide-index.json');

// Canonical display order (search results surface in array order). New pages
// not listed here are appended alphabetically.
const ORDER = [
  'getting-started', 'audio-sources', 'visualizers', 'library', 'scenes', 'fx',
  'spout', 'wallpaper', 'lyrics', 'stage', 'logo', 'remote-control',
  'ai-generation', 'controls', 'troubleshooting',
];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  rarr: '→', larr: '←', middot: '·', hellip: '…',
  mdash: '—', ndash: '–', times: '×', deg: '°',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m);
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function textOf(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[1] : '';
}

const files = readdirSync(guideDir).filter(f => f.endsWith('.html'));
const bySlug = new Map();

for (const f of files) {
  const slug = basename(f, '.html');
  if (slug === 'index') continue; // redirect stub, not a content page
  const html = readFileSync(join(guideDir, f), 'utf8');
  const main = firstMatch(html, /<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  if (!main) {
    console.error(`SKIP ${f}: no <main> element`);
    continue;
  }
  const mainTag = firstMatch(html, /(<main[^>]*>)/i);
  bySlug.set(slug, {
    slug,
    title: textOf(firstMatch(main, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
    desc: textOf(firstMatch(main, /<p class="wiki-lead"[^>]*>([\s\S]*?)<\/p>/i)),
    hue: firstMatch(mainTag, /--hue:\s*(#[0-9a-fA-F]{3,8})/) || '#33e0ff',
    text: textOf(main).toLowerCase(),
  });
}

const ordered = [
  ...ORDER.filter(s => bySlug.has(s)),
  ...[...bySlug.keys()].filter(s => !ORDER.includes(s)).sort(),
].map(s => bySlug.get(s));

writeFileSync(outPath, JSON.stringify(ordered), 'utf8');
console.log(`Wrote ${outPath}: ${ordered.length} entries (${ordered.map(e => e.slug).join(', ')})`);

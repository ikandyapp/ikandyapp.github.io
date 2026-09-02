#!/usr/bin/env node
/* Build a passphrase-protected page for GitHub Pages.
 *
 * Pages is static, so "password protected" here means the page body is
 * encrypted CLIENT-SIDE: PBKDF2-SHA256 (600,000 iterations, OWASP 2023 figure)
 * derives an AES-256-GCM key from the passphrase, the body is encrypted with a
 * random salt and IV, and the published HTML carries only the ciphertext. The
 * browser derives the key and decrypts in place (see the unlock.js next to the
 * generated page). Without the passphrase the payload is opaque. The plaintext
 * source and the passphrase are NEVER written into this repo: the source lives
 * outside it (the private app repo is the natural home) and the passphrase
 * comes from the LOCAL registry or the environment.
 *
 * Registry mode (the normal way, driven from admin.html's Partner Sites section):
 *   node scripts/build-protected-page.mjs --site mbxhub
 *   node scripts/build-protected-page.mjs --all
 *   Reads C:\ikandy-admin\partner-sites.json (override with IKANDY_PARTNER_SITES),
 *   one entry per site: { id, url, passphrase, source, out, title, label, heading, lead }.
 *
 * Explicit mode:
 *   set IKANDY_PAGE_PASSPHRASE=...   (PowerShell: $env:IKANDY_PAGE_PASSPHRASE='...')
 *   node scripts/build-protected-page.mjs --source <plaintext .html fragment>
 *        --out partners/<id>/index.html [--title "..."] [--label "..."] [--heading "..."] [--lead "..."]
 *
 * IKANDY_PAGE_PASSPHRASE, when set, wins over the registry passphrase in both modes.
 * A generated page is noindex and must never be added to sitemap.xml
 * (scripts/check-site.mjs fails a sitemap entry that points at a noindex page).
 * Every output directory also needs the shared unlock.js beside its index.html;
 * this script copies partners/mbxhub/unlock.js there if it is missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';

const args = process.argv.slice(2);
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
}
const flag = (name) => args.includes(`--${name}`);

const REGISTRY = process.env.IKANDY_PARTNER_SITES || 'C:\\ikandy-admin\\partner-sites.json';
const TEMPLATE = opt('template', path.join('scripts', 'protected-page.template.txt'));
const UNLOCK_JS = path.join('partners', 'mbxhub', 'unlock.js');
const ITERATIONS = 600000;

function loadRegistry() {
  if (!fs.existsSync(REGISTRY)) { console.error(`registry not found: ${REGISTRY}`); process.exit(2); }
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (!Array.isArray(reg.sites)) { console.error('registry has no "sites" array'); process.exit(2); }
  return reg.sites;
}

let jobs = [];
if (flag('all')) {
  jobs = loadRegistry();
} else if (opt('site')) {
  const id = opt('site');
  const site = loadRegistry().find((s) => s.id === id);
  if (!site) { console.error(`site "${id}" is not in ${REGISTRY}`); process.exit(2); }
  jobs = [site];
} else {
  jobs = [{
    id: 'explicit', source: opt('source'), out: opt('out'), title: opt('title', 'IKANDY partner kit'),
    label: opt('label', 'Partners'), heading: opt('heading', 'Partner kit'),
    lead: opt('lead', 'This page is shared by passphrase. Enter it to open the kit.'),
  }];
}

const subtle = webcrypto.subtle;
const b64 = (u8) => Buffer.from(u8).toString('base64');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const job of jobs) {
  const passphrase = process.env.IKANDY_PAGE_PASSPHRASE || job.passphrase;
  if (!job.source || !job.out) { console.error(`[${job.id}] needs source and out (usage: --site <id> | --all | --source <file> --out <file>)`); process.exit(2); }
  if (!passphrase || passphrase.length < 8) { console.error(`[${job.id}] passphrase is missing or shorter than 8 characters (registry entry or IKANDY_PAGE_PASSPHRASE)`); process.exit(2); }
  if (!fs.existsSync(job.source)) { console.error(`[${job.id}] source not found: ${job.source}`); process.exit(2); }

  const plaintext = fs.readFileSync(job.source, 'utf8');
  if (/[\u2013\u2014]/.test(plaintext)) { console.error(`[${job.id}] source contains an em-dash or en-dash; house style forbids them in customer-facing copy`); process.exit(2); }

  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const base = await subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)));
  const payload = JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), ct: b64(ct) });

  const html = fs.readFileSync(TEMPLATE, 'utf8')
    .replace(/\{\{TITLE\}\}/g, esc(job.title || 'IKANDY partner kit'))
    .replace(/\{\{LABEL\}\}/g, esc(job.label || 'Partners'))
    .replace(/\{\{HEADING\}\}/g, esc(job.heading || 'Partner kit'))
    .replace(/\{\{LEAD\}\}/g, esc(job.lead || 'This page is shared by passphrase. Enter it to open the kit.'))
    .replace(/\{\{UPDATED\}\}/g, new Date().toISOString().slice(0, 10))
    .replace('{{PAYLOAD}}', payload);

  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  fs.writeFileSync(job.out, html);
  const unlockHere = path.join(path.dirname(job.out), 'unlock.js');
  if (!fs.existsSync(unlockHere) && fs.existsSync(UNLOCK_JS)) fs.copyFileSync(UNLOCK_JS, unlockHere);
  console.log(`[${job.id}] wrote ${job.out} (${plaintext.length} chars plaintext, ${ct.length} bytes ciphertext, ${ITERATIONS} PBKDF2 iterations)`);
}
console.log('Next: node scripts/check-site.mjs, then commit the partners/ output and push when ready.');

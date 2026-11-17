// check-app: the browser gateway's pages hold the Google token, so their rules are checked on
// every build (abp/cell-email v1.1.0: N1, N17, N18, C5). For every HTML page under _site/app/:
//   - a Content-Security-Policy meta tag, first thing after the charset;
//   - default-src 'none', script-src 'self' only, base-uri 'none', form-action 'none';
//   - connect-src only Google's Gmail and token-revocation services, the vault service and pki.sgit.ai;
//   - no inline script, no script from another site, a no-referrer policy;
// for every script under _site/app/ outside vendor/: no persistent storage (no localStorage, no
// IndexedDB, no cookies), and fetch only to the allowed hosts; and every file under
// _site/app/vendor/ must match its pin in VENDOR.json (unedited third-party code).
// Prints OK or each problem. By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const DIR = '_site/app';
// Google's Gmail and token-revocation services, the user's vault service, and pki.sgit.ai's public
// register for "Sign in with pki.sgit.ai" (abp/cell-email N17).
const CONNECT = new Set(['https://gmail.googleapis.com', 'https://oauth2.googleapis.com', 'https://dev.send.sgraph.ai', 'https://pki.sgit.ai']);
const problems = [];
const fail = (m) => problems.push(m);

if (!existsSync(DIR)) { console.error('check-app: _site/app/ is not built'); process.exit(1); }
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(DIR).map((p) => relative(DIR, p).split(sep).join('/'));
const files = all.filter((f) => !f.startsWith('vendor/'));

for (const f of files.filter((n) => n.endsWith('.html'))) {
  const s = readFileSync(join(DIR, f), 'utf8');
  const head = s.slice(0, s.indexOf('</head>'));
  const m = head.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if (!m) { fail(`${f}: no Content-Security-Policy meta tag`); continue; }
  if (head.indexOf(m[0]) > head.indexOf('<meta charset') + 40) fail(`${f}: the policy must come straight after the charset`);
  const csp = Object.fromEntries(m[1].split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));
  const is = (k, v) => JSON.stringify(csp[k] || []) === JSON.stringify(v);
  if (!is('default-src', ["'none'"])) fail(`${f}: default-src must be 'none'`);
  if (!is('script-src', ["'self'"])) fail(`${f}: script-src must be 'self' only`);
  if (!is('base-uri', ["'none'"])) fail(`${f}: base-uri must be 'none'`);
  if (!is('form-action', ["'none'"])) fail(`${f}: form-action must be 'none'`);
  for (const h of csp['connect-src'] || []) if (!CONNECT.has(h)) fail(`${f}: connect-src allows ${h}, which is not Google's Gmail or token-revocation service, the vault service or pki.sgit.ai`);
  if (!head.includes('<meta name="referrer" content="no-referrer">')) fail(`${f}: no no-referrer policy`);
  for (const t of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = t[1].match(/\bsrc="([^"]+)"/);
    if (!src) fail(`${f}: an inline script`);
    else if (/^(https?:)?\/\//.test(src[1])) fail(`${f}: a script from another site (${src[1]})`);
    if (t[2].trim()) fail(`${f}: a script with inline code`);
  }
  if (/\son[a-z]+\s*=/.test(s)) fail(`${f}: an inline event handler`);
}

for (const f of files.filter((n) => n.endsWith('.js'))) {
  const s = readFileSync(join(DIR, f), 'utf8');
  // Persistent storage: never localStorage or cookies. IndexedDB only in pki.js, for the page's
  // non-extractable key pair and secrets sealed to it (approved by Dinis, 16 November 2026).
  if (/\blocalStorage\b|document\.cookie/.test(s)) fail(`${f}: uses persistent storage; tokens and keys stay in memory or sealed in pki.js`);
  if (/\bindexedDB\b/.test(s) && f !== 'pki.js') fail(`${f}: uses IndexedDB, which only pki.js may use`);
  if (f === 'pki.js' && /generateKey\([^)]*,\s*true\s*,/.test(s)) fail(`${f}: makes an extractable key pair; the page's private keys must not be extractable`);
  if (f === 'pki.js' && !/generateKey\(RSA_GEN, false,/.test(s)) fail(`${f}: the encryption key pair must be made with extractable false`);
  for (const u of s.matchAll(/fetch\(\s*[`'"](https:\/\/[^/`'"]+)/g)) if (!CONNECT.has(u[1])) fail(`${f}: fetches ${u[1]}, which is not allowed`);
  if (/sessionStorage\.setItem\(\s*[^,]+,\s*token/.test(s)) fail(`${f}: stores the token`);
}

// Vendored code: every file pinned, every pin present, nothing edited.
for (const pinFile of all.filter((f) => /^vendor\/[^/]+\/VENDOR\.json$/.test(f))) {
  const base = pinFile.replace(/VENDOR\.json$/, '');
  const pins = JSON.parse(readFileSync(join(DIR, pinFile), 'utf8'));
  const pinned = new Map(pins.files.map((x) => [base + x.path, x.sha256_prefix]));
  for (const [path, want] of pinned) {
    if (!existsSync(join(DIR, path))) { fail(`${path}: pinned in ${pinFile} but missing`); continue; }
    const got = createHash('sha256').update(readFileSync(join(DIR, path))).digest('hex').slice(0, 40);
    if (got !== want) fail(`${path}: does not match its pin: vendored code must not be edited`);
  }
  for (const f of all.filter((x) => x.startsWith(base) && /\.m?js$/.test(x))) if (!pinned.has(f)) fail(`${f}: vendored but not pinned in ${pinFile}`);
}
for (const f of all.filter((x) => x.startsWith('vendor/') && /\.m?js$/.test(x))) if (!all.some((p) => /VENDOR\.json$/.test(p) && f.startsWith(p.replace(/VENDOR\.json$/, '')))) fail(`${f}: vendored with no VENDOR.json`);

if (problems.length) { console.error(problems.join('\n')); console.error(`FAILED: ${problems.length} problem(s)`); process.exit(1); }
console.log(`OK (${files.filter((n) => n.endsWith('.html')).length} app pages, ${files.filter((n) => n.endsWith('.js')).length} scripts, ${all.filter((n) => n.startsWith('vendor/') && n.endsWith('.js')).length} vendored scripts pinned)`);

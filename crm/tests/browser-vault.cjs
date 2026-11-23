// Browser check of the CRM site's vault mode against the real vault service, with SYNTHETIC vaults only.
// Keys are read at run time from two files outside the repository and never printed:
//   node crm/tests/browser-vault.cjs <folder holding .crm-read and .twin-read>
// Needs the built site served at http://localhost:8765 (node crm/scripts/build-site.mjs, then serve crm/_build/site).
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
const { chromium } = require('playwright');
const fs = require('fs');
const S = process.argv[2];
const crmKey = fs.readFileSync(S + '/.crm-read', 'utf8').trim(), twinKey = fs.readFileSync(S + '/.twin-read', 'utf8').trim();
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage(); const errs = [], hosts = new Set();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('request', (r) => hosts.add(new URL(r.url()).host));
  await p.goto('http://localhost:8765/'); await p.waitForSelector('h1');
  console.log('default mode:', await p.textContent('#mode'));
  await p.goto('http://localhost:8765/#/open'); await p.waitForSelector('#k-crm');
  // wrong key shape
  await p.fill('#k-crm', 'not a key'); await p.click('button[type=submit]'); console.log('bad key:', await p.textContent('#status'));
  // CRM vault without the twin it points at
  await p.fill('#k-crm', crmKey); await p.click('button[type=submit]');
  await p.waitForFunction(() => /Could not open/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 60000 });
  console.log('crm only:', await p.textContent('#status'));
  // both, remembered
  await p.fill('#k-crm', crmKey); await p.fill('#k-twin', twinKey); await p.check('#remember'); await p.click('button[type=submit]');
  await p.waitForFunction(() => location.hash === '#/board' && document.querySelector('h1')?.textContent === 'Lead board', null, { timeout: 120000 });
  console.log('mode:', await p.textContent('#mode'), '| banner:', await p.textContent('#banner'));
  console.log('rows:', await p.$$eval('tbody tr', (r) => r.length), '| first send link:', await p.$eval('a.badge', (a) => a.href.replace(/^.*\?/, '?')));
  await p.screenshot({ path: S + '/vault-board.png' });
  // stored form is sealed: no key text in IndexedDB
  const leaked = await p.evaluate(async (k) => new Promise((res) => { const r = indexedDB.open('email-cell', 1); r.onsuccess = () => { const tx = r.result.transaction('keys'); const all = tx.objectStore('keys').getAll(); all.onsuccess = () => res(JSON.stringify(all.result, (key, v) => (v instanceof CryptoKey ? '[key]' : v)).includes(k.split(':')[0].slice(-20))); }; }), crmKey);
  console.log('key text in IndexedDB:', leaked);
  // reload: back to demo by default; recall opens the remembered vault
  await p.goto('http://localhost:8765/#/board'); await p.reload(); await p.waitForSelector('h1');
  console.log('after reload:', await p.textContent('#mode'));
  await p.goto('http://localhost:8765/#/open'); await p.waitForSelector('#recall'); await p.click('#recall');
  await p.waitForFunction(() => /Your vault/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  console.log('recalled:', await p.textContent('#mode'));
  await p.goto('http://localhost:8765/#/open'); await p.waitForSelector('#to-demo'); await p.click('#to-demo'); await p.waitForSelector('tbody tr');
  console.log('back to demo:', await p.textContent('#mode'));
  await p.goto('http://localhost:8765/#/open'); await p.waitForSelector('#forget'); await p.click('#forget'); await p.waitForSelector('#recall', { state: 'detached' });
  console.log('forgot; recall button present:', !!(await p.$('#recall')));
  console.log('hosts:', [...hosts].sort().join(' '));
  console.log('errors:', errs);
  await b.close();
})().catch((e) => { console.log('FAILED', e.message.replace(/sgit_\w+_[0-9a-f]{20,}/g, '[MASKED]')); process.exit(1); });

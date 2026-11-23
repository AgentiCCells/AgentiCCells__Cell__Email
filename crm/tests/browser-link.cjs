// Browser check of hand-made links against the real vault service, on a SYNTHETIC CRM vault only.
// It links thread t-004, checks with the sgit CLI that one file arrived, removes it, and checks it went.
// Keys are read at run time from files outside the repository and never printed:
//   node crm/tests/browser-link.cjs <folder holding .crm-read, .crm-vault, .twin-read and a crm-vault/ clone>
// Needs the built site served at http://localhost:8765. By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
const { chromium } = require('playwright');
const fs = require('fs'), { execSync } = require('child_process');
const S = process.argv[2], R = (f) => fs.readFileSync(S + '/' + f, 'utf8').trim();
const pulled = () => { execSync('sgit-ai pull', { cwd: S + '/crm-vault', stdio: 'ignore' }); return fs.existsSync(S + '/crm-vault/crm/links/t-004.json'); };
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage(); const errs = [], hosts = new Set();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('request', (r) => hosts.add(new URL(r.url()).host));
  p.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); });
  const T = 'http://localhost:8765/';
  // demo
  await p.goto(T + '#/threads'); await p.waitForSelector('[data-link="t-004"]');
  await p.click('[data-link="t-004"]'); await p.waitForSelector('#pending');
  console.log('demo preview:', (await p.textContent('#pending')).replace(/\s+/g, ' ').slice(0, 170));
  await p.screenshot({ path: S + '/link-preview.png' });
  await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
  console.log('demo: t-004 still unlinked?', !!(await p.$('[data-link="t-004"]')));
  // read key: refused
  await p.goto(T + '#/open'); await p.fill('#k-crm', R('.crm-read')); await p.fill('#k-twin', R('.twin-read')); await p.click('button[type=submit]');
  await p.waitForFunction(() => /Your vault/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  await p.goto(T + '#/threads'); await p.waitForSelector('[data-link="t-004"]'); await p.click('[data-link="t-004"]'); await p.waitForSelector('#pending');
  console.log('read key:', (await p.textContent('#pending .warn')).trim(), '| button disabled:', await p.$eval('#w-go', (x) => x.disabled));
  await p.click('#w-cancel');
  // full key: write, check with the CLI, then remove
  console.log('before: t-004 in vault?', pulled());
  await p.goto(T + '#/open'); await p.waitForSelector('#to-demo'); await p.click('#to-demo'); await p.waitForSelector('tbody tr');
  await p.goto(T + '#/open'); await p.fill('#k-crm', R('.crm-vault')); await p.fill('#k-twin', R('.twin-read')); await p.fill('#k-token', 'placeholder-proxy-injects'); await p.click('button[type=submit]');
  await p.waitForFunction(() => /Your vault/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  await p.goto(T + '#/threads'); await p.waitForSelector('[data-link="t-004"]'); await p.click('[data-link="t-004"]'); await p.waitForSelector('#pending');
  console.log('vault preview:', (await p.textContent('#pending')).replace(/\s+/g, ' ').slice(0, 120));
  await p.click('#w-go');
  await p.waitForFunction(() => !document.querySelector('#pending') || /Not written/.test(document.querySelector('#w-status')?.textContent || ''), null, { timeout: 120000 });
  console.log('write status:', (await p.$('#w-status')) ? await p.textContent('#w-status') : 'done');
  console.log('after write: t-004 in vault?', pulled());
  await p.goto(T + '#/company/' + JSON.parse(fs.readFileSync(S + '/crm-vault/crm/links/t-004.json')).org);
  await p.waitForSelector('[data-unlink="t-004"]'); await p.click('[data-unlink="t-004"]'); await p.waitForSelector('#pending');
  await p.click('#w-go'); await p.waitForFunction(() => !document.querySelector('#pending') || /Not written/.test(document.querySelector('#w-status')?.textContent || ''), null, { timeout: 120000 });
  console.log('remove status:', (await p.$('#w-status')) ? await p.textContent('#w-status') : 'done');
  console.log('after remove: t-004 in vault?', pulled());
  console.log('hosts:', [...hosts].sort().join(' ')); console.log('errors:', errs);
  await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).replace(/sgit_\w+?_[0-9a-z]{16,}/g, '[MASKED]').slice(0, 400)); process.exit(1); });

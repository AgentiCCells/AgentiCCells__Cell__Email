// Browser check of adding companies and people, and of creating a CRM vault from the page, against
// the real vault service with made-up data only. It creates a NEW test vault each run and saves its
// key to <folder>/.testcrm-vault (mode 600); nothing is printed. Needs the built site at http://localhost:8765.
//   node crm/tests/browser-add.cjs <folder>     By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })).newPage(); const errs = [], hosts = new Set();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('request', (r) => hosts.add(new URL(r.url()).host));
  p.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); });
  const T = 'http://localhost:8765/';
  const addOrg = async (name, domain) => { await p.click('details.add summary'); await p.fill('#o-name', name); await p.fill('#o-domain', domain); await p.selectOption('#o-kind', 'prospect'); await p.fill('#o-next', 'Say hello'); await p.click('#add-org button[type=submit]'); };
  // demo
  await p.goto(T + '#/board'); await p.waitForSelector('h1');
  await addOrg('Example Analytics (demo)', 'x.example.com'); console.log('duplicate refused:', await p.textContent('#form-error'));
  await p.fill('#o-name', 'Example Newco (demo)'); await p.click('#add-org button[type=submit]'); await p.waitForSelector('#pending');
  console.log('demo preview:', (await p.textContent('#pending h2')), '|', (await p.$$eval('#pending code', (c) => c.map((x) => x.textContent))).join(' '));
  await p.screenshot({ path: S + '/shots/7-add-company-preview.png' });
  await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
  console.log('demo rows:', await p.$$eval('tbody tr', (r) => r.length));
  // create a real CRM vault (test data only)
  await p.goto(T + '#/open'); await p.waitForSelector('#create');
  await p.fill('#c-owner', 'crm.dev.a test'); await p.fill('#c-token', 'placeholder-proxy-injects'); await p.click('#create button[type=submit]');
  await p.waitForSelector('#newkey', { timeout: 120000 });
  const key = await p.inputValue('#nk'); fs.writeFileSync(S + '/.testcrm-vault', key, { mode: 0o600 });
  console.log('new vault:', key.split(':')[1], '| mode:', await p.textContent('#mode'), '| rows:', await p.$$eval('tbody tr', (r) => r.length));
  await p.screenshot({ path: S + '/shots/8-new-vault-key.png' });
  await p.click('#nk-done');
  await addOrg('Example Testco (demo)', 'testco.example.com'); await p.waitForSelector('#pending');
  console.log('vault preview:', (await p.textContent('#pending')).replace(/\s+/g, ' ').slice(0, 110));
  await p.click('#w-go'); await p.waitForFunction(() => !document.querySelector('#pending') || /Not written/.test(document.querySelector('#w-status')?.textContent || ''), null, { timeout: 120000 });
  console.log('company write:', (await p.$('#w-status')) ? await p.textContent('#w-status') : 'done');
  const org = await p.$eval('tbody tr a', (a) => a.getAttribute('href')); await p.goto(T + org); await p.waitForSelector('details.add summary');
  await p.click('details.add summary'); await p.fill('#p-name', 'Tess Example'); await p.fill('#p-email', 'tess@testco.example.com'); await p.fill('#p-role', 'CTO'); await p.click('#add-person button[type=submit]');
  await p.waitForSelector('#pending'); await p.click('#w-go'); await p.waitForFunction(() => !document.querySelector('#pending') || /Not written/.test(document.querySelector('#w-status')?.textContent || ''), null, { timeout: 120000 });
  console.log('person write:', (await p.$('#w-status')) ? await p.textContent('#w-status') : 'done', '| people listed:', await p.$$eval('.list li', (l) => l.filter((x) => /tess@/.test(x.textContent)).length));
  console.log('hosts:', [...hosts].sort().join(' ')); console.log('errors:', errs);
  await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).replace(/sgit_\w+?_[0-9a-z]{16,}/g, '[MASKED]').slice(0, 400)); process.exit(1); });

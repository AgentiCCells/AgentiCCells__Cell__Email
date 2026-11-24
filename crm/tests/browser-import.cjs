// Browser check of the CSV import: in the demo, and as one real write to a TEST vault of made-up data.
//   node crm/tests/browser-import.cjs <folder holding .testcrm-vault> crm/site/template.csv  (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept('Owner A'));
  const T = 'http://localhost:8765/', csv = fs.readFileSync(process.argv[3], 'utf8');
  await p.goto(T + '#/import'); await p.waitForSelector('#import'); await p.click('#me');
  await p.fill('#i-text', csv); await p.click('#import button[type=submit]'); await p.waitForSelector('#pending');
  console.log('demo note:', await p.textContent('#pending p:nth-of-type(2)'));
  await p.screenshot({ path: S + '/shots/14-import-preview.png' });
  await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
  await p.goto(T + '#/board'); await p.waitForSelector('tbody tr'); console.log('demo rows after:', await p.$$eval('tbody tr', (r) => r.length));
  // test vault (made-up data only)
  await p.goto(T + '#/open'); await p.fill('#k-crm', fs.readFileSync(S + '/.testcrm-vault', 'utf8')); await p.fill('#k-token', 'placeholder-proxy-injects'); await p.click('#open button[type=submit]');
  await p.waitForFunction(() => /Your vault/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  await p.goto(T + '#/import'); await p.waitForSelector('#import'); await p.fill('#i-text', csv); await p.click('#import button[type=submit]'); await p.waitForSelector('#pending');
  console.log('vault note:', await p.textContent('#pending p:nth-of-type(2)'));
  await p.click('#w-go'); await p.waitForFunction(() => !document.querySelector('#pending') || /Not written/.test(document.querySelector('#w-status')?.textContent || ''), null, { timeout: 120000 });
  console.log('vault write:', (await p.$('#w-status')) ? await p.textContent('#w-status') : 'done');
  await p.goto(T + '#/board'); await p.waitForSelector('tbody tr'); console.log('vault rows after:', await p.$$eval('tbody tr', (r) => r.length));
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', e.message.slice(0, 300)); process.exit(1); });

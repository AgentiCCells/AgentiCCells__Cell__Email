// Browser check of the outbox (demo): log in, write an email to a demo person from their company page, sign it off
// with this browser's key for a batch, and see "Signed off by you". Nothing is written anywhere and nothing is sent.
//   node crm/tests/browser-outbox.cjs <folder for shots>   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const T = 'http://localhost:8765/', errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept());
  await p.goto(T + '#/me'); await p.fill('#li-name', 'Owner A'); await p.click('#login button[type=submit]'); await p.waitForSelector('#mykey', { timeout: 60000 });
  await p.goto(T + '#/board'); await p.waitForSelector('table a[href^="#/company/"]'); await p.click('table a[href^="#/company/"]');
  await p.waitForSelector('#write-email', { state: 'attached' }); await p.evaluate(() => { document.querySelector('details:has(#write-email)').open = true; });
  await p.fill('#e-subject', 'About the book'); await p.fill('#e-text', 'Hi,\n\nA short note about the book.\n');
  await p.click('#write-email button[type=submit]'); await p.waitForSelector('#w-go'); console.log('write:', await p.textContent('#pending h2'));
  await p.click('#w-go'); await p.waitForTimeout(300);
  await p.goto(T + '#/outbox'); await p.waitForSelector('[data-approve]'); console.log('before:', await p.textContent('[data-apcheck]'));
  await p.click('[data-approve]'); await p.waitForSelector('#w-go', { timeout: 20000 }); console.log('sign:', await p.textContent('#pending h2'));
  await p.click('#w-go'); await p.waitForFunction(() => /by you|another|Changed/.test(document.querySelector('[data-apcheck]')?.textContent || ''), null, { timeout: 20000 });
  console.log('after:', await p.textContent('[data-apcheck]'));
  await p.screenshot({ path: S + '/outbox.png' });
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).slice(0, 400)); process.exit(1); });

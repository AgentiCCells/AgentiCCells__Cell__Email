// Browser check of verified keys: one browser logs in and gives its key text; another logs in, adds that key to a demo
// person on their company page, writes it (demo: this tab only), and sees "Verified key ✓". The same key given for a
// second person, by QR picture, is refused.
//   node crm/tests/browser-keys.cjs <folder for shots>   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const T = 'http://localhost:8765/', errs = [];
  const page = async () => { const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept()); return p; };
  const login = async (p, name) => { await p.goto(T + '#/me'); await p.fill('#li-name', name); await p.click('#login button[type=submit]'); await p.waitForSelector('#mykey', { timeout: 60000 }); };
  const them = await page(); await login(them, 'Test Contact'); const theirKey = await them.inputValue('#mykey');
  const theirQr = await them.getAttribute('img.qr', 'src');
  const me = await page(); await login(me, 'Test Verifier');
  await me.goto(T + '#/board'); await me.waitForSelector('table a[href^="#/company/"]'); await me.click('table a[href^="#/company/"]');
  await me.waitForSelector('.badge.key-none'); console.log('before:', await me.textContent('.badge.key-none'));
  const forms = await me.$$('form.add-key'); const pid = await forms[0].getAttribute('data-person'); const pid2 = forms.length > 1 ? await forms[1].getAttribute('data-person') : null;
  await me.$$eval('details.add.inline', (ds) => ds.forEach((d) => (d.open = true)));
  await me.fill(`[data-keytext="${pid}"]`, theirKey); await me.selectOption(`[data-keyhow="${pid}"]`, 'text');
  await me.click(`form.add-key[data-person="${pid}"] button[type=submit]`); await me.waitForSelector('#w-go', { timeout: 30000 });
  console.log('pending:', await me.textContent('#pending h2'), '|', (await me.textContent('#pending pre')).includes('"schema": "crm.key/1"'));
  await me.click('#w-go'); await me.waitForSelector('.badge.key-ok', { timeout: 30000 }); console.log('after:', await me.textContent('.badge.key-ok'), '|', await me.getAttribute('.badge.key-ok', 'title'));
  await me.screenshot({ path: S + '/shots/30-verified-key.png' });
  if (pid2) {
    fs.writeFileSync(S + '/.their-qr.gif', Buffer.from(theirQr.split(',')[1], 'base64'));
    await me.$$eval('details.add.inline', (ds) => ds.forEach((d) => (d.open = true)));
    await me.setInputFiles(`[data-keyfile="${pid2}"]`, S + '/.their-qr.gif');
    await me.waitForFunction((id) => document.querySelector(`[data-keytext="${id}"]`).value.length > 50 || document.querySelector(`[data-keyerr="${id}"]`).textContent, pid2, { timeout: 20000 }); console.log("err:", await me.textContent(`[data-keyerr="${pid2}"]`));
    console.log('QR picture read:', (await me.inputValue(`[data-keytext="${pid2}"]`)).slice(0, 40));
    await me.click(`form.add-key[data-person="${pid2}"] button[type=submit]`);
    await me.waitForFunction((id) => /Not added/.test(document.querySelector(`[data-keyerr="${id}"]`).textContent), pid2, { timeout: 20000 });
    console.log('same key, another person:', await me.textContent(`[data-keyerr="${pid2}"]`));
  }
  await me.goto(T + '#/contacts'); await me.waitForSelector('.badge.key-ok'); console.log('contacts:', await me.textContent('.badge.key-ok'));
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).slice(0, 400)); process.exit(1); });

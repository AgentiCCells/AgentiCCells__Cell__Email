// Browser check of the two-halves You page: log in (the QR copied by itself), seal a TEST vault key to it as a QR
// picture (crm/tools/seal-for.mjs --qr), drop the picture, and open the vault; the chip then names it.
//   node crm/tests/browser-handover.cjs <folder with .testcrm-vault and .sign.pkcs8>   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const { execFileSync } = require('child_process'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8765' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept());
  const T = 'http://localhost:8765/';
  await p.goto(T); await p.waitForSelector('h1'); console.log('first page:', await p.textContent('h1'), '| chip:', await p.textContent('#mode'));
  await p.goto(T + '#/me'); await p.fill('#li-name', 'Test Person'); await p.click('#login button[type=submit]'); await p.waitForSelector('#drop', { timeout: 60000 });
  await p.waitForTimeout(800); console.log('auto copy:', await p.textContent('#copy-status'));
  await p.screenshot({ path: S + '/shots/16-you-two-halves.png' });
  const keyText = await p.inputValue('#mykey'); fs.writeFileSync(S + '/.tp-key.txt', keyText);
  const sealed = execFileSync('node', ['crm/tools/seal-for.mjs', '--to', S + '/.tp-key.txt', '--vault-key-file', S + '/.testcrm-vault', '--sign-key', S + '/.sign.pkcs8', '--from-bundle', 'team/keys/crm-dev-a-agenticcells.json', '--for', 'Test Person', '--vault-name', 'Test CRM', '--qr', S + '/.sealed-qr.png'], { encoding: 'utf8' }).trim();
  await p.setInputFiles('#qrfile', S + '/.sealed-qr.png');
  await p.waitForFunction(() => /From|Not opened/.test(document.querySelector('#rc-status').textContent), null, { timeout: 120000 });
  console.log('from picture:', (await p.textContent('#rc-status')).slice(0, 90));
  await p.waitForSelector('[data-openv]', { timeout: 10000 }); console.log('vaults:', (await p.textContent('#main ul.list')).replace(/\s+/g, ' ').trim());
  await p.click('[data-openv]'); await p.waitForFunction(() => /Vault: (?!Demo)/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  console.log('chip after open:', await p.textContent('#mode'), '| page:', await p.textContent('h1'));
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).slice(0, 300)); process.exit(1); });

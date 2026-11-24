// Browser check of logging in and the QR handover: the page makes its key, the agent seals a TEST vault key to it
// with crm/tools/seal-for.mjs, the page opens it, lists the vault and opens it; a code with a changed signer is refused.
//   node crm/tests/browser-handover.cjs <folder with .testcrm-vault and .sign.pkcs8>   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const { execFileSync } = require('child_process'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept());
  const T = 'http://localhost:8765/';
  await p.goto(T + '#/me'); await p.waitForSelector('#login'); console.log('login page:', (await p.textContent('#main p.muted.small')).trim());
  await p.fill('#li-name', 'Test Person'); await p.click('#login button[type=submit]');
  await p.waitForSelector('#mykey', { timeout: 60000 }); const keyText = await p.inputValue('#mykey'); console.log('key shown:', keyText.slice(0, 50) + '…');
  await p.screenshot({ path: S + '/shots/15-you-page.png', fullPage: true });
  fs.writeFileSync(S + '/.test-person-key.txt', keyText);
  const sealed = execFileSync('node', ['crm/tools/seal-for.mjs', '--to', S + '/.test-person-key.txt', '--vault-key-file', S + '/.testcrm-vault', '--sign-key', S + '/.sign.pkcs8', '--from-bundle', 'team/keys/crm-dev-a-agenticcells.json', '--for', 'Test Person', '--vault-name', 'Test CRM (made-up data)'], { encoding: 'utf8' }).trim();
  console.log('sealed code made:', sealed.slice(0, 60) + '…', '| vault key in it as plain text?', /sgit_private_vault_|[a-z0-9]{24}:[a-z0-9]{8}/.test(sealed));
  await p.fill('#rc-text', sealed); await p.click('#receive button[type=submit]');
  await p.waitForFunction(() => /From|Not opened/.test(document.querySelector('#rc-status').textContent), null, { timeout: 120000 });
  console.log('receive:', await p.textContent('#rc-status'));
  await p.waitForSelector('[data-openv]', { timeout: 10000 }); console.log('vault list:', (await p.textContent('#main ul.list')).replace(/\s+/g, ' ').trim());
  await p.click('[data-openv]'); await p.waitForFunction(() => /Your vault/.test(document.querySelector('#mode').textContent), null, { timeout: 120000 });
  console.log('opened:', await p.textContent('#mode'), '| rows', await p.$$eval('tbody tr', (r) => r.length));
  // a code signed by someone else is refused: tamper the signer
  await p.goto(T + '#/me'); await p.waitForSelector('#rc-text'); await p.fill('#rc-text', sealed.replace(/"from":"sha256:[0-9a-f]{16}"/, '"from":"sha256:0000000000000000"'));
  await p.click('#receive button[type=submit]'); await p.waitForFunction(() => /From|Not opened/.test(document.querySelector('#rc-status').textContent), null, { timeout: 60000 });
  console.log('tampered:', await p.textContent('#rc-status'));
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).replace(/sgit_\w+?_[0-9a-z]{16,}/g, '[MASKED]').slice(0, 400)); process.exit(1); });

// Browser check of several vaults at once on the You page: two TEST vault keys sealed as QR pictures, put in one zip and
// chosen together; then the Paste QR code button with a QR picture on the clipboard.
//   node crm/tests/browser-zip.cjs <folder with .testcrm-vault, .crm-vault and .sign.pkcs8>   (built site at :8765)
// By crm.dev.a@AgentiCCells.dinis, 2026-11-25. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const S = process.argv[2], T = 'http://localhost:8765/', TMP = fs.mkdtempSync(path.join(S, 'zip-'));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8765' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept());
  await p.goto(T + '#/me'); await p.fill('#li-name', 'Test Person'); await p.click('#login button[type=submit]'); await p.waitForSelector('#drop', { timeout: 60000 });
  fs.writeFileSync(path.join(TMP, 'key.txt'), await p.inputValue('#mykey'));
  const seal = (vault, name, png) => execFileSync('node', ['crm/tools/seal-for.mjs', '--to', path.join(TMP, 'key.txt'), '--vault-key-file', path.join(S, vault), '--sign-key', path.join(S, '.sign.pkcs8'), '--from-bundle', 'team/keys/crm-dev-a-agenticcells.json', '--for', 'Test Person', '--vault-name', name, '--qr', path.join(TMP, png)], { cwd: path.join(__dirname, '../..') });
  seal('.testcrm-vault', 'Test CRM', 'one.png'); seal('.crm-vault', 'Demo CRM', 'two.png');
  execFileSync('python3', ['-c', 'import sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED)\nfor f in sys.argv[2:]: z.write(f, "codes/"+f.split("/")[-1])\nz.close()', path.join(TMP, 'codes.zip'), path.join(TMP, 'one.png'), path.join(TMP, 'two.png')]);
  await p.setInputFiles('#qrfile', path.join(TMP, 'codes.zip'));
  await p.waitForSelector('section.added', { timeout: 180000 }).catch(() => {});
  console.log('zip:', ((await p.textContent('section.added').catch(() => '')) || (await p.textContent('#rc-status'))).replace(/\s+/g, ' ').trim().slice(0, 200));
  console.log('vaults listed:', (await p.$$('[data-forgetv]')).length);
  // The Paste button: put the first QR picture on the clipboard, then click.
  const png = fs.readFileSync(path.join(TMP, 'one.png')).toString('base64');
  await p.evaluate(async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([u], { type: 'image/png' }) })]); }, png);
  await p.click('details.add summary'); await p.click('#pasteqr'); await p.waitForFunction(() => document.querySelector('section.added') && /Test CRM added/.test(document.querySelector('section.added h2').textContent), null, { timeout: 120000 }).catch(() => {});
  console.log('paste:', ((await p.textContent('section.added h2').catch(() => '')) || (await p.textContent('#rc-status'))).trim());
  await p.screenshot({ path: path.join(S, 'shots', 'you-zip.png') }).catch(() => {});
  console.log('errors:', errs); await b.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch((e) => { console.log('FAILED', String(e.message).slice(0, 300)); fs.rmSync(TMP, { recursive: true, force: true }); process.exit(1); });

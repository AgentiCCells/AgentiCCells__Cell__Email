// Browser check of "For you": log in, seal a made-up decision to this browser's key with crm/tools/seal-decision.mjs
// (signed by the agent key in <folder>/.sign.pkcs8), see "1 decision for you" on Today, open it, pick and send. The
// answer lane is faked in the test (no real inbox is written to): the captured append is checked to be sealed.
//   node crm/tests/browser-foryou.cjs <folder with .sign.pkcs8>   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const S = process.argv[2], T = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text())); p.on('dialog', (d) => d.accept());
  await p.goto(T + '#/me'); await p.fill('#li-name', 'Test Person'); await p.click('#login button[type=submit]'); await p.waitForSelector('#mykey', { timeout: 60000 });
  const tmp = fs.mkdtempSync(path.join(S, 'fy-')); fs.writeFileSync(path.join(tmp, 'key.txt'), await p.inputValue('#mykey'));
  fs.writeFileSync(path.join(tmp, 'd.json'), JSON.stringify({ v: 1, id: 'test-pick', agent: 'test agent', asked_at: '2026-11-24T17:00:00Z', title: 'Pick a colour and a shape (made up)', why: 'A test of the For you page.',
    options: ['colour a) Green', 'colour b) Blue', 'shape a) Round', 'shape b) Square'], recommendation: 'colour a, shape a', needed_by: '2026-11-30T18:00:00Z', links: ['https://crm.tool.sovereignweb.site/'] }));
  console.log(execFileSync('node', ['crm/tools/seal-decision.mjs', '--to', path.join(tmp, 'key.txt'), '--decision', path.join(tmp, 'd.json'), '--sign-key', path.join(S, '.sign.pkcs8'), '--from-bundle', 'team/keys/crm-dev-a-agenticcells.json', '--site', tmp], { encoding: 'utf8' }).trim().replace(tmp, '<tmp>'));
  const fp = (await p.textContent('main')).match(/sha256:[0-9a-f]{16}/)[0].replace(':', '-');
  const idx = fs.readFileSync(path.join(tmp, 'site/app/for', fp, 'index.json'), 'utf8');
  const recipient = JSON.parse(fs.readFileSync('team/keys/crm-dev-a-agenticcells.json', 'utf8'));
  let appended = null;
  await p.route('**/for/' + fp + '/index.json', (r) => r.fulfill({ contentType: 'application/json', body: idx }));
  await p.route('**/send/inbox.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ agent: 'crm.dev.a', endpoint: 'https://dev.send.sgraph.ai', vault_id: 'testlane', append_token: 'test', recipient: { encrypt: recipient.bundle ? recipient.bundle.encrypt : recipient.encrypt } }) }));
  await p.route('https://dev.send.sgraph.ai/api/vault/append/write/testlane', (r) => { appended = r.request().postDataJSON(); r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await p.goto(T + '#/today'); await p.waitForSelector('#for-you-note:not([hidden])', { timeout: 30000 }); console.log('today:', (await p.textContent('#for-you-note')).trim());
  await p.click('#for-you-note a'); await p.waitForSelector('form.decide', { timeout: 30000 }); console.log('page:', await p.textContent('main h2'));
  await p.check('input[name="g-colour"][value="b"]'); await p.check('input[name="g-shape"][value="a"]');
  await p.click('form.decide button[type=submit]'); await p.waitForFunction(() => /Sent|Not sent/.test(document.querySelector('[data-decst]').textContent), null, { timeout: 30000 });
  console.log('answer:', await p.textContent('[data-decst]'));
  const sealedOk = appended && typeof appended.payload === 'string' && !/colour|shape|test-pick/.test(atob(appended.payload));
  console.log('appended and sealed (no plain text in it):', sealedOk);
  await p.screenshot({ path: path.join(S, 'shots', 'for-you.png') }); fs.rmSync(tmp, { recursive: true, force: true });
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', String(e.message).slice(0, 400)); process.exit(1); });

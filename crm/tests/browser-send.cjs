// Browser check of the Requests page with no network: log in on You, send a request, catch the append, and save the
// sealed request for the keeper key to open (sgit pki decrypt) and check (the signature against the bundle in it).
//   node crm/tests/browser-send.cjs <out-folder> team/keys/<keeper public key>.json   (built site at :8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const { webcrypto: C } = require('crypto');
const S = process.argv[2], pub = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
(async () => {
  const inbox = { agent: 'crm.dev.a@AgentiCCells.dinis (TEST)', endpoint: 'https://dev.send.sgraph.ai', vault_id: 'testtest', append_token: 'test-append-token', recipient: { fingerprint: pub.fingerprint, encrypt: pub.encrypt } };
  const b = await chromium.launch(); const ctx = await b.newContext(); const errs = []; let posted = null;
  await ctx.route('**/send/inbox.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(inbox) }));
  await ctx.route('https://dev.send.sgraph.ai/**', async (r) => { posted = r.request().postDataJSON(); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  const p = await ctx.newPage(); p.on('pageerror', (x) => errs.push(x.message)); p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:8765/send/'); await p.waitForSelector('#who'); await p.waitForTimeout(300); console.log('before login:', (await p.textContent('#who')).trim());
  await p.goto('http://localhost:8765/#/me'); await p.waitForSelector('#login'); await p.fill('#li-name', 'Test Person'); await p.click('#login button[type=submit]'); await p.waitForSelector('#mykey', { timeout: 60000 });
  await p.goto('http://localhost:8765/send/'); await p.waitForSelector('#form:not([hidden])'); console.log('after login:', await p.textContent('#who'));
  await p.selectOption('#kind', 'feature'); await p.fill('#text', 'Test request: a vault switcher in the top bar.'); await p.click('#send');
  await p.waitForFunction(() => /Sent|Not sent/.test(document.querySelector('#status').textContent)); console.log('status:', await p.textContent('#status'));
  fs.writeFileSync(S + '/req.enc', Buffer.from(posted.payload, 'base64').toString()); console.log('token sent:', posted.append_token);
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });

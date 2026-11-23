// Browser check of the request page (crm/site/send/), with no network: a test inbox is served to the page, the append
// call is caught before it leaves, and the sealed request is saved for the keeper key to open with sgit pki decrypt.
//   node crm/tests/browser-send.cjs <out-folder> team/keys/<keeper public key>.json   (built site at http://localhost:8765)
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
const { chromium } = require('playwright'); const fs = require('fs'); const { webcrypto: C } = require('crypto');
const S = process.argv[2], pub = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
(async () => {
  // a test person key, in the shape person-key.mjs issues: {p, f, e:[d,x,y], s:[d,x,y]}
  const e = await C.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const s = await C.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const je = await C.subtle.exportKey('jwk', e.privateKey), js = await C.subtle.exportKey('jwk', s.privateKey);
  const packed = Buffer.from(JSON.stringify({ p: 'test-person', f: 'sha256:0000test0000', e: [je.d, je.x, je.y], s: [js.d, js.x, js.y] })).toString('base64url');
  const inbox = { agent: 'crm.dev.a@AgentiCCells.dinis (TEST)', site: 'crm', endpoint: 'https://dev.send.sgraph.ai', vault_id: 'testtest', append_token: 'test-append-token', recipient: { fingerprint: pub.fingerprint, encrypt: pub.encrypt } };
  const b = await chromium.launch(); const ctx = await b.newContext(); const errs = []; let posted = null;
  await ctx.route('**/send/inbox.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(inbox) }));
  await ctx.route('https://dev.send.sgraph.ai/**', async (r) => { posted = { url: r.request().url(), body: r.request().postDataJSON() }; await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  const p = await ctx.newPage(); p.on('pageerror', (x) => errs.push(x.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8765/send/#key=' + packed); await p.waitForFunction(() => /Signed in/.test(document.querySelector('#who').textContent));
  console.log('who:', await p.textContent('#who'), '| key left the address bar:', !/key=/.test(p.url()));
  await p.selectOption('#kind', 'contacts'); await p.fill('#text', 'Test request: please add Example Testco (demo).'); await p.click('#send');
  await p.waitForFunction(() => /Sent|Not sent/.test(document.querySelector('#status').textContent));
  console.log('status:', await p.textContent('#status'), '| posted to:', posted && posted.url.replace(/^https:\/\/[^/]+/, ''), '| token:', posted && posted.body.append_token);
  fs.writeFileSync(S + '/req.enc', Buffer.from(posted.body.payload, 'base64').toString());
  fs.writeFileSync(S + '/req.sigpub.json', JSON.stringify(await C.subtle.exportKey('jwk', s.publicKey)));
  // not set up: no inbox.json
  await ctx.unroute('**/send/inbox.json'); await ctx.route('**/send/inbox.json', (r) => r.fulfill({ status: 404, body: '' }));
  const q = await ctx.newPage(); await q.goto('http://localhost:8765/send/'); await q.waitForTimeout(500);
  console.log('no inbox:', (await q.isVisible('#notready')) ? await q.textContent('#notready') : 'NOT SHOWN', '| form hidden:', !(await q.isVisible('#req')));
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });

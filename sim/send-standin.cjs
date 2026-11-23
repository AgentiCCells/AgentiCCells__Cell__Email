// The send screen's real mode in Chromium against a stand-in for Gmail. MADE-UP token and addresses;
// every request to Google is answered here and nothing reaches it. Checks: the real banner, a send,
// the day's count surviving a reload (send-only token), the cap at 20, a reading token's Sent count,
// and an expired token falling back to demo mode.
// Use: node scripts/build.mjs; (cd _site && python3 -m http.server 8766 &); node sim/send-standin.cjs <out-folder>
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2], b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const log = [], outside = [];
  let canReadSentCount = 5;
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (!u.startsWith('https://gmail.googleapis.com/')) { outside.push(u); return r.abort(); }
    log.push(r.request().method() + ' ' + u.replace('https://gmail.googleapis.com/gmail/v1/users/me/', '') + ' auth=' + (r.request().headers().authorization === 'Bearer made-up-token'));
    const j = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' , 'access-control-allow-headers': '*'}, body: JSON.stringify(o) });
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.endsWith('/profile')) return j({ emailAddress: 'tester@stand-in.example.org' });
    if (u.includes('/messages/send')) return j({ id: 'standin-1', threadId: 'standin-t1' });
    if (u.includes('/messages?')) return j({ messages: Array.from({ length: canReadSentCount }, (_, i) => ({ id: 'x' + i })) });
    return r.fulfill({ status: 404 });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('dialog', d => { console.log('confirm:', d.message()); d.accept(); });
  await p.goto('http://localhost:8766/app/send.html?demo');
  const plant = (t) => p.evaluate(async ([t, v]) => { const m = await import('/app/' + v); const id = await m.identity(); await m.keep(id, 'google:token', JSON.stringify(t)); }, [t, 'pki.js?v=dev']);
  const setCount = (n) => p.evaluate(async ([n, v]) => { const m = await import('/app/' + v); const id = await m.existingIdentity(); await m.keep(id, 'send:count:' + new Date().toISOString().slice(0, 10), String(n)); }, [n, 'pki.js?v=dev']);
  const state = async (label) => console.log(label, '| mode:', await p.textContent('#mode'), '| real banner:', await p.isVisible('#real-banner'), '| demo banner:', await p.isVisible('#demo-banner'), '| contacts:', await p.isVisible('#contacts-box'), '| today:', await p.textContent('#today'), '| send disabled:', await p.isDisabled('#send'), '| problems:', await p.textContent('#problems'));

  // 1. A send-only token (gmail.metadata + gmail.send): cannot search Sent.
  await plant({ token: 'made-up-token', can_send: true, can_read: false, can_manage: false, expires_at: Date.now() + 3600e3 });
  await p.goto('http://localhost:8766/app/send.html'); await p.waitForFunction(() => !document.getElementById('mode').hidden);
  await state('send-only, open');
  await p.fill('#to', 'friend@example.com'); await p.fill('#subject', 'Hello from the send screen'); await p.fill('#text', 'Hi,\n\nA test on a stand-in.\n');
  await p.dispatchEvent('#text', 'input');
  await p.screenshot({ path: out + '/send-real.png', fullPage: true });
  await p.click('#send'); await p.waitForFunction(() => /Sent/.test(document.getElementById('status').textContent));
  console.log('status:', await p.textContent('#status'));
  await p.reload(); await p.waitForFunction(() => !document.getElementById('mode').hidden);
  await state('send-only, after reload');
  await setCount(20); await p.reload(); await p.waitForFunction(() => !document.getElementById('mode').hidden);
  await p.fill('#to', 'friend@example.com'); await p.fill('#subject', 'x'); await p.fill('#text', 'y'); await p.dispatchEvent('#text', 'input');
  await state('send-only, stored count 20, after reload');
  await setCount(0);

  // 2. A reading token: Gmail's Sent count (5) is larger than the stored one.
  await plant({ token: 'made-up-token', can_send: true, can_read: true, can_manage: false, expires_at: Date.now() + 3600e3 });
  await p.reload(); await p.waitForFunction(() => !document.getElementById('mode').hidden);
  await state('reading token');
  // 3. An expired token: demo mode.
  await plant({ token: 'made-up-token', can_send: true, can_read: true, expires_at: Date.now() - 1 });
  await p.reload(); await p.waitForFunction(() => !document.getElementById('mode').hidden);
  await state('expired token'); console.log('why:', await p.textContent('#why'));
  console.log('gmail calls:\n  ' + log.join('\n  '));
  console.log('other outside requests:', outside.length ? outside : 'none');
  await b.close();
})();

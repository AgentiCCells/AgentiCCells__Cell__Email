// The mail client in Chromium against a stand-in for Gmail: MADE-UP mail only, a made-up token, no
// real account. It opens the inbox and a conversation, stars, archives and undoes, labels, moves to
// Bin, and logs each request the page sends to Gmail; it writes screenshots to the folder given.
// Use: node scripts/build.mjs; (cd _site && python3 -m http.server 8765 &); node sim/mail-standin.cjs <out-folder>
// By cell.email.b@AgentiCCells.dinis, 2026-11-21. Apache-2.0.
const { chromium } = require('playwright');
const b64u = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const now = Date.now(), H = 3600e3;
const people = [['Ana Silva','ana@example.com'],['Bo Chen','bo@example.net'],['Project updates','updates@example.org'],['Cy Patel','cy@example.com'],['Dee Okafor','dee@example.com'],['Travel desk','travel@example.net'],['Eli Moreau','eli@example.com'],['Finance team','finance@example.org']];
const subjects = ['Plans for the pilot','Re: Draft agreement','Weekly summary: 12 changes','Lunch on Thursday?','Slides for Monday','Your trip to Lisbon','Notes from the call','Invoice 2026-114'];
const threads = people.map(([n,a],i) => {
  const t = { id: 't'+i, historyId: '1', messages: [] };
  const count = i === 1 ? 3 : 1;
  for (let k = 0; k < count; k++) {
    const from = k === 1 ? 'me@example.org' : `"${n}" <${a}>`;
    t.messages.push({ id: `m${i}${k}`, threadId: t.id, internalDate: String(now - i*7*H - (count-k)*H), labelIds: ['INBOX', ...(i < 3 && k === count-1 ? ['UNREAD'] : [])],
      snippet: k ? 'Thanks, that works for me. I will send the signed copy tomorrow.' : `Hi, here is the latest on ${subjects[i].toLowerCase()}. Let me know what you think before Friday.`,
      payload: { mimeType: i === 0 ? 'multipart/mixed' : 'multipart/alternative', headers: [{name:'From',value:from},{name:'To',value:'me@example.org'},{name:'Subject',value:subjects[i]},{name:'Message-ID',value:`<m${i}${k}@example.com>`}],
        parts: [{ mimeType: 'text/plain', body: { data: b64u('plain') } }, { mimeType: 'text/html', body: { data: b64u(`<p>Hi,</p><p>Here is the latest on <b>${subjects[i].toLowerCase()}</b>. The short version: we are on track, and the open questions are listed below.</p><ul><li>Dates for the first week</li><li>Who signs off the budget</li></ul><p>Let me know what you think before Friday.</p><p>Best,<br>${n}</p><img src="https://tracker.example.com/pixel.gif">`) } },
          ...(i === 0 ? [{ mimeType: 'application/pdf', filename: 'pilot-plan.pdf', body: { attachmentId: 'a1', size: 183000 } }] : [])] } });
  }
  return t;
});
(async () => {
  const b = await chromium.launch(); const out = process.argv[2];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const blocked = [];
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 160)); });
  await ctx.route('https://tracker.example.com/**', r => { blocked.push(r.request().url()); r.abort(); });
  await ctx.route('https://gmail.googleapis.com/**', async (r) => {
    const u = new URL(r.request().url()), path = u.pathname.replace('/gmail/v1/users/me/', '');
    const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path === 'profile') return json({ emailAddress: 'me@example.org', messagesTotal: 1010, threadsTotal: 673 });
    if (path === 'labels') return json({ labels: [{ id: 'INBOX', name: 'INBOX', type: 'system' }, { id: 'L1', name: 'Clients', type: 'user', color: { backgroundColor: '#16a765' } }, { id: 'L2', name: 'Receipts', type: 'user' }, { id: 'L3', name: 'Travel', type: 'user', color: { backgroundColor: '#4a86e8' } }] });
    if (path === 'labels/INBOX') return json({ id: 'INBOX', messagesUnread: 3 });
    if (path === 'threads') return json({ threads: threads.map(t => ({ id: t.id })) });
    const m = path.match(/^threads\/(t\d+)$/); if (m) return json(threads.find(t => t.id === m[1]));
    const mm = path.match(/^threads\/(t\d+)\/(modify|trash|untrash)$/); if (mm) { console.log('ACTION', mm[1], mm[2], r.request().postData() || ''); return json({ id: mm[1] }); }
    if (path === 'messages/send') { console.log('SEND', r.request().postData().slice(0, 80)); return json({ id: 'sent1', threadId: 't1' }); }
    return r.fulfill({ status: 404, body: '{}' });
  });
  await p.goto('http://localhost:8765/app/connect.html'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const k = await import('/app/pki.js'); await k.keep(await k.identity(), 'google:token', JSON.stringify({ token: 'made-up', can_send: true, can_read: true, can_manage: true, expires_at: Date.now() + 3600e3 })); });
  await p.goto('http://localhost:8765/app/mail.html'); await p.waitForTimeout(2000);
  await p.screenshot({ path: out + '/mail-1-inbox.png' });
  await p.locator('.threads .row').first().click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/mail-2-reading.png' });
  await p.keyboard.press('s'); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/mail-8-manage.png' });
  await p.keyboard.press('e'); await p.waitForTimeout(600);
  console.log('rows after archive:', await p.locator('.threads .row').count(), 'toast:', await p.locator('#toast').textContent());
  await p.locator('#toast button').click(); await p.waitForTimeout(800);
  await p.locator('.threads .row').nth(1).click(); await p.waitForTimeout(800);
  await p.locator('#t-labels summary').click(); await p.waitForTimeout(300);
  await p.locator('#label-list input').first().check(); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/mail-9-labels.png' });
  await p.locator('#t-bin').click(); await p.waitForTimeout(500);
  console.log('toast:', await p.locator('#toast').textContent());
  console.log('tracker requests reaching the network:', blocked.length);
  await b.close();
})();

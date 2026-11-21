// The mail client's pure parts (src/app/mailparse.js), run in Node with made-up messages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partsOf, header, parseAddress, splitAddresses, displayName, respond, frameDoc, htmlToText, shortDate } from '../src/app/mailparse.js';

const b64u = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const msg = {
  id: 'm1', threadId: 't1', internalDate: String(Date.UTC(2026, 10, 20, 9, 30)), snippet: 'Hello',
  payload: { mimeType: 'multipart/mixed', headers: [
    { name: 'From', value: '"Ana Silva" <ana@example.com>' }, { name: 'To', value: 'me@example.org, Bo <bo@example.net>' },
    { name: 'Cc', value: 'cy@example.com' }, { name: 'Subject', value: 'Plans' }, { name: 'Message-ID', value: '<a1@example.com>' }],
    parts: [
      { mimeType: 'multipart/alternative', parts: [
        { mimeType: 'text/plain', headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }], body: { data: b64u('Olá,\nsee you.') } },
        { mimeType: 'text/html', body: { data: b64u('<p>Olá,<br>see you.</p>') } }] },
      { mimeType: 'application/pdf', filename: 'plan.pdf', headers: [], body: { attachmentId: 'att1', size: 2048 } }] },
};

test('the text, the HTML and the attachments are found', () => {
  const p = partsOf(msg);
  assert.equal(p.text, 'Olá,\nsee you.');
  assert.equal(p.html, '<p>Olá,<br>see you.</p>');
  assert.deepEqual(p.attachments.map((a) => [a.name, a.size, a.id]), [['plan.pdf', 2048, 'att1']]);
  assert.equal(header(msg, 'subject'), 'Plans');
});

test('addresses: names, lists with commas in quotes, display names', () => {
  assert.deepEqual(parseAddress('"Ana Silva" <ana@example.com>'), { name: 'Ana Silva', address: 'ana@example.com' });
  assert.deepEqual(parseAddress('bo@example.net'), { name: '', address: 'bo@example.net' });
  assert.deepEqual(splitAddresses('"Silva, Ana" <ana@example.com>, bo@example.net'), ['"Silva, Ana" <ana@example.com>', 'bo@example.net']);
  assert.equal(displayName('bo@example.net'), 'bo');
});

test('reply goes to the sender, in the thread, quoting the text', () => {
  const r = respond('reply', msg, 'me@example.org');
  assert.equal(r.to, '"Ana Silva" <ana@example.com>');
  assert.equal(r.cc, '');
  assert.equal(r.subject, 'Re: Plans');
  assert.equal(r.threadId, 't1');
  assert.equal(r.inReplyTo, '<a1@example.com>');
  assert.match(r.text, /> Olá,\n> see you\./);
});

test('reply all adds the others but never me', () => {
  const r = respond('replyAll', msg, 'me@example.org');
  assert.deepEqual(splitAddresses(r.cc).map((a) => parseAddress(a).address), ['bo@example.net', 'cy@example.com']);
});

test('a reply to my own message goes to its recipients', () => {
  const mine = { ...msg, payload: { ...msg.payload, headers: msg.payload.headers.map((h) => (h.name === 'From' ? { name: 'From', value: 'me@example.org' } : h)) } };
  assert.equal(respond('reply', mine, 'me@example.org').to, 'me@example.org, Bo <bo@example.net>');
});

test('forward starts a new thread with the original below', () => {
  const f = respond('forward', msg, 'me@example.org');
  assert.equal(f.subject, 'Fwd: Plans'); assert.equal(f.to, ''); assert.equal(f.threadId, '');
  assert.match(f.text, /Forwarded message[\s\S]*From: "Ana Silva" <ana@example.com>[\s\S]*see you/);
});

test('the frame shows HTML as given, and text escaped', () => {
  assert.match(frameDoc({ html: '<b>x</b>' }), /<body><b>x<\/b><\/body>/);
  assert.match(frameDoc({ text: '<script>alert(1)</script>' }), /&lt;script&gt;/);
  assert.match(frameDoc({ text: 'x' }), /<base target="_blank">/);
});

test('HTML to text for quoting, and list dates', () => {
  assert.equal(htmlToText('<style>p{}</style><p>a &amp; b</p><div>c<br>d</div>'), 'a & b\nc\nd');
  const now = Date.UTC(2026, 10, 21, 12);
  assert.match(shortDate(Date.UTC(2026, 10, 21, 9, 5), now), /^\d\d:\d\d$/);
  assert.equal(shortDate(Date.UTC(2026, 0, 3), now), '3 Jan');
  assert.equal(shortDate(Date.UTC(2025, 0, 3, 12), now), '03/01/2025');
});

test('yesterday says Yesterday; plain text follows the dark theme, HTML stays on paper', () => {
  const now = Date.UTC(2026, 10, 21, 12);
  assert.equal(shortDate(Date.UTC(2026, 10, 20, 12), now), 'Yesterday');
  assert.match(frameDoc({ text: 'x' }, { dark: true }), /background:#1c1915/);
  assert.doesNotMatch(frameDoc({ html: '<p>x</p>' }, { dark: true }), /background:#1c1915/);
});

test('the frame paints its own backdrop: paper for HTML, the theme for plain text in dark', () => {
  assert.match(frameDoc({ html: '<p>x</p>' }, { dark: true }), /html\{background:#f4efe6\}/);
  assert.match(frameDoc({ html: '<p>x</p>' }), /html\{background:#fffdf9\}/);
  assert.match(frameDoc({ text: 'x' }, { dark: true }), /html,body\{background:#1c1915/);
});

test('each mail action asks for the right label change, and none deletes', async () => {
  const { labelChange, threadLabels } = await import('../src/app/mailparse.js');
  assert.deepEqual(labelChange('archive'), { addLabelIds: [], removeLabelIds: ['INBOX'] });
  assert.deepEqual(labelChange('read'), { addLabelIds: [], removeLabelIds: ['UNREAD'] });
  assert.deepEqual(labelChange('unread'), { addLabelIds: ['UNREAD'], removeLabelIds: [] });
  assert.deepEqual(labelChange('star'), { addLabelIds: ['STARRED'], removeLabelIds: [] });
  assert.deepEqual(labelChange('unlabel', 'L1'), { addLabelIds: [], removeLabelIds: ['L1'] });
  assert.throws(() => labelChange('delete'));
  assert.deepEqual([...threadLabels({ messages: [{ labelIds: ['INBOX'] }, { labelIds: ['UNREAD', 'L1'] }] })].sort(), ['INBOX', 'L1', 'UNREAD']);
});

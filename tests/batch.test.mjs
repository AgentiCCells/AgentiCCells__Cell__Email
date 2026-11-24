// Signed batches (src/app/batch.js), with a fresh test key each run and made-up mail only. Nothing is sent.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signEntry, verifyEntry, planBatch, fingerprint, attachmentProblems, rawWithAttachments, MAX_ATTACH_BYTES } from '../src/app/batch.js';
import { messageOf, MAX_PER_DAY } from '../src/app/send.js';

const subtle = globalThis.crypto.subtle;
const newKey = async () => {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const spki = new Uint8Array(await subtle.exportKey('spki', k.publicKey));
  return { k, spki, fp: await fingerprint(spki) };
};
const pdf = { filename: 'one-pager.pdf', mime: 'application/pdf', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 10, 1, 2, 3]) };
const entry = (n, extra = {}) => ({ id: `e${n}`, meta: { to: [`reader${n}@example.com`], subject: `Book note ${n}`, status: 'draft' }, text: `Hi,\n\nNote ${n}.\n`, attachments: [], ...extra });
async function signed(key, e) { const m = messageOf(e.meta, e.text); return { ...e, signoff: await signEntry(key.k.privateKey, key.spki, m, e.attachments) }; }

test('a signed entry verifies against the pinned key; one changed byte, or another key, is refused', async () => {
  const a = await newKey(), b = await newKey();
  const e = await signed(a, entry(1, { attachments: [pdf] }));
  const m = messageOf(e.meta, e.text);
  assert.equal((await verifyEntry(e.signoff, m, e.attachments, [{ fingerprint: a.fp, spki: a.spki, name: 'Dinis' }])).ok, true);
  assert.match((await verifyEntry(e.signoff, messageOf(e.meta, e.text + '!'), e.attachments, [{ fingerprint: a.fp, spki: a.spki }])).reason, /does not match/);
  const changed = { ...pdf, bytes: Uint8Array.from(pdf.bytes, (x, i) => (i === 9 ? x ^ 1 : x)) };
  assert.match((await verifyEntry(e.signoff, m, [changed], [{ fingerprint: a.fp, spki: a.spki }])).reason, /does not match/);
  assert.match((await verifyEntry(e.signoff, m, e.attachments, [{ fingerprint: b.fp, spki: b.spki }])).reason, /not pinned/);
  assert.match((await verifyEntry(e.signoff, m, e.attachments, [{ fingerprint: a.fp, spki: b.spki }])).reason, /does not match its fingerprint/);
  assert.match((await verifyEntry(null, m, [], [])).reason, /not signed/);
});

test('the batch sends only verified entries, in order, within the daily limit', async () => {
  const a = await newKey(), other = await newKey();
  const pinned = [{ fingerprint: a.fp, spki: a.spki, name: 'Dinis' }];
  const entries = [await signed(a, entry(1)), entry(2), await signed(other, entry(3)), await signed(a, entry(4, { meta: { to: ['x@example.com'], bcc: ['y@example.com'], subject: 's', status: 'draft' } })), await signed(a, entry(5))];
  const plan = await planBatch(entries, { pinned, sentToday: 0 });
  assert.deepEqual(plan.rows.map((r) => r.send), [true, false, false, false, true]);
  assert.match(plan.rows[1].why.join(), /not signed/);
  assert.match(plan.rows[2].why.join(), /not pinned/);
  assert.match(plan.rows[3].why.join(), /Bcc/);
  const late = await planBatch(entries, { pinned, sentToday: MAX_PER_DAY - 1 });
  assert.equal(late.toSend, 1);
  assert.match(late.rows[4].why.join(), /daily limit/);
});

test('attachments: PDF, PNG and JPEG only, by their content, at most 10 MB together', () => {
  assert.deepEqual(attachmentProblems([pdf]), []);
  assert.match(attachmentProblems([{ filename: 'x.pdf', mime: 'application/pdf', bytes: new Uint8Array([1, 2, 3, 4]) }]).join(), /not a application\/pdf/);
  assert.match(attachmentProblems([{ filename: 'x.exe', mime: 'application/octet-stream', bytes: new Uint8Array(4) }]).join(), /only PDF, PNG and JPEG/);
  const big = new Uint8Array(MAX_ATTACH_BYTES + 1); big.set([0x25, 0x50, 0x44, 0x46]);
  assert.match(attachmentProblems([{ filename: 'big.pdf', mime: 'application/pdf', bytes: big }]).join(), /at most 10 MB/);
  assert.match(attachmentProblems([{ filename: 'a"b.pdf', mime: 'application/pdf', bytes: pdf.bytes }]).join(), /bad file name/);
});

test('the raw message carries the text and each attachment as a MIME part', () => {
  const m = messageOf({ to: ['reader@example.com'], subject: 'Olá', status: 'draft' }, 'Hi');
  const raw = Buffer.from(rawWithAttachments(m, [pdf], 'B'), 'base64url').toString('utf8');
  assert.match(raw, /^To: reader@example.com\r\n/);
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
  assert.match(raw, /Content-Type: multipart\/mixed; boundary="B"/);
  assert.match(raw, /Content-Disposition: attachment; filename="one-pager.pdf"/);
  assert.doesNotMatch(raw, /^Bcc:/m);
  const part = raw.split('--B')[2].split('\r\n\r\n')[1].replace(/\s/g, '');
  assert.deepEqual([...Buffer.from(part, 'base64')], [...pdf.bytes]);
});

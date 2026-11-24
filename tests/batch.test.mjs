// Signed batches (src/app/batch.js), in the format agreed on 24 Nov 2026, with a fresh test key each run
// and made-up mail only. Nothing is sent.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { approve, verifyApproval, planBatch, fingerprint, draftHash, attachmentProblems, rawWithAttachments, attachmentsFor, messageOfDraft, sentRecord, newBatchId, MAX_ATTACH_BYTES } from '../src/app/batch.js';
import { canon } from '../src/app/vendor/pki/v0.2.28/keys.js';
import { MAX_PER_DAY } from '../src/app/send.js';

const subtle = globalThis.crypto.subtle;
const NOW = new Date(Date.UTC(2026, 10, 24, 16, 0, 0));
const newKey = async () => {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const spki = new Uint8Array(await subtle.exportKey('spki', k.publicKey));
  return { k, spki, fp: await fingerprint(spki) };
};
const sha = (b) => createHash('sha256').update(b).digest('hex');
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 10, 1, 2, 3]);
const draft = (n, extra = {}) => ({ v: 1, id: `d-${n}`, crm: { org: 'o01', person: `p0${n}` }, to: [`reader${n}@example.com`], subject: `Book note ${n}`, text: `Hi,\n\nNote ${n}.\n`, attachments: [], created_at: '2026-11-24T15:00:00Z', created_by: 'crm.dev.a (demo)', ...extra });
const withPdf = (d) => ({ ...d, attachments: [{ path: `drafts/${d.id}/att/one-pager.pdf`, type: 'application/pdf', bytes: PDF.length, sha256: sha(PDF) }] });
const filesOf = (d) => Object.fromEntries((d.attachments || []).map((a) => [a.path, PDF]));

test('draft_sha256 is SHA-256 hex of canon(draft), no newline; the signature covers draft_sha256 + batch_id', async () => {
  const d = draft(1), key = await newKey(), batch = 'b-20261124T160000Z-ab12';
  assert.equal(await draftHash(d), sha(Buffer.from(canon(d), 'utf8')));
  const a = await approve(key.k.privateKey, key.spki, d, batch, NOW);
  assert.deepEqual(Object.keys(a).sort(), ['batch_id', 'draft_id', 'draft_sha256', 'key_fingerprint', 'sig', 'signed_at']);
  const pub = await subtle.importKey('spki', key.spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, Buffer.from(a.sig, 'base64'), Buffer.from(a.draft_sha256 + batch, 'utf8')));
  assert.match(newBatchId(NOW, new Uint8Array([0xab, 0x12])), /^b-20261124T160000Z-ab12$/);
});

test('a sign-off verifies against the pinned key; a changed draft, another batch or another key is refused', async () => {
  const a = await newKey(), b = await newKey(), batch = 'b-1';
  const d = withPdf(draft(1));
  const ok = await approve(a.k.privateKey, a.spki, d, batch, NOW);
  const pins = [{ fingerprint: a.fp, spki: a.spki, name: 'Dinis' }];
  assert.equal((await verifyApproval(d, ok, pins, batch)).ok, true);
  assert.match((await verifyApproval({ ...d, text: d.text + '!' }, ok, pins, batch)).reason, /changed after/);
  assert.match((await verifyApproval(d, ok, pins, 'b-2')).reason, /not this one/);
  assert.match((await verifyApproval(d, ok, [{ fingerprint: b.fp, spki: b.spki }], batch)).reason, /not pinned/);
  assert.match((await verifyApproval(d, ok, [{ fingerprint: a.fp, spki: b.spki }], batch)).reason, /does not match its fingerprint/);
  assert.match((await verifyApproval(d, { ...ok, batch_id: 'b-x' }, pins, '')).reason, /signature does not match/);
  assert.match((await verifyApproval(d, null, pins, batch)).reason, /not signed off/);
});

test('the batch sends only verified drafts, in order, within the daily limit and after send_after', async () => {
  const a = await newKey(), other = await newKey(), batch = 'b-1';
  const pins = [{ fingerprint: a.fp, spki: a.spki }];
  const item = async (d, k = a) => ({ draft: d, approved: k ? await approve(k.k.privateKey, k.spki, d, batch, NOW) : null, files: filesOf(d) });
  const items = [await item(withPdf(draft(1))), await item(draft(2), null), await item(draft(3), other), await item(draft(4, { to: ['a@example.com', 'b@example.com'] })), await item(draft(5, { send_after: '2026-11-25T09:00:00Z' })), await item(draft(6))];
  const plan = await planBatch(items, { pinned: pins, batchId: batch, now: NOW });
  assert.deepEqual(plan.rows.map((r) => r.send), [true, false, false, false, false, true]);
  assert.match(plan.rows[1].why.join(), /not signed off/);
  assert.match(plan.rows[2].why.join(), /not pinned/);
  assert.match(plan.rows[3].why.join(), /exactly one address/);
  assert.match(plan.rows[4].why.join(), /not before/);
  const late = await planBatch(items, { pinned: pins, batchId: batch, now: NOW, sentToday: MAX_PER_DAY - 1 });
  assert.equal(late.toSend, 1);
  assert.match(late.rows[5].why.join(), /daily limit/);
  const done = await planBatch([{ ...items[0], sent: true }], { pinned: pins, batchId: batch, now: NOW });
  assert.match(done.rows[0].why.join(), /already sent/);
});

test('attachments: signed size and hash, PDF/PNG/JPEG by content, at most 10 MB together', async () => {
  const d = withPdf(draft(1)), path = d.attachments[0].path;
  assert.deepEqual(await attachmentProblems(d.attachments, { [path]: PDF }), []);
  assert.match((await attachmentProblems(d.attachments, {})).join(), /missing/);
  const changed = Uint8Array.from(PDF, (x, i) => (i === 9 ? x ^ 1 : x));
  assert.match((await attachmentProblems(d.attachments, { [path]: changed })).join(), /not the one signed/);
  const exe = new Uint8Array([1, 2, 3, 4]);
  assert.match((await attachmentProblems([{ path: 'x/a.exe', type: 'application/octet-stream', bytes: 4, sha256: sha(exe) }], { 'x/a.exe': exe })).join(), /only PDF, PNG and JPEG/);
  const big = new Uint8Array(MAX_ATTACH_BYTES + 1); big.set([0x25, 0x50, 0x44, 0x46]);
  assert.match((await attachmentProblems([{ path: 'x/big.pdf', type: 'application/pdf', bytes: big.length, sha256: sha(big) }], { 'x/big.pdf': big })).join(), /at most 10 MB/);
});

test('the raw message carries the text and each attachment; the sent record names the batch and the key', async () => {
  const d = withPdf(draft(1, { subject: 'Olá' }));
  const raw = Buffer.from(rawWithAttachments(messageOfDraft(d), attachmentsFor(d, filesOf(d)), 'B'), 'base64url').toString('utf8');
  assert.match(raw, /^To: reader1@example.com\r\n/);
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
  assert.match(raw, /Content-Disposition: attachment; filename="one-pager.pdf"/);
  assert.doesNotMatch(raw, /^(Cc|Bcc):/m);
  const part = raw.split('--B')[2].split('\r\n\r\n')[1].replace(/\s/g, '');
  assert.deepEqual([...Buffer.from(part, 'base64')], [...PDF]);
  const a = await newKey();
  const ap = await approve(a.k.privateKey, a.spki, d, 'b-1', NOW);
  const rec = sentRecord(d, ap, { id: 'sim-1', threadId: 'sim-t1', simulation: true }, NOW);
  assert.deepEqual(rec, { draft_id: 'd-1', draft_sha256: ap.draft_sha256, batch_id: 'b-1', gmail_id: 'sim-1', gmail_thread_id: 'sim-t1', sent_at: '2026-11-24T16:00:00Z', approved_by_key: a.fp, simulation: true });
});

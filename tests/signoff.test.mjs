// The shared sign-off (src/app/signoff.mjs) against its test vector, and its format checks. Fresh test keys
// each run; no private key is stored. By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { draftHash, draftProblems, approve, verifyApproval, fingerprint } from '../src/app/signoff.mjs';
import { canon } from '../src/app/vendor/pki/v0.2.28/keys.js';

const vector = JSON.parse(readFileSync(new URL('./fixtures/signoff-vector.json', import.meta.url), 'utf8'));

test('the test vector: canon bytes, and draft_sha256 is SHA-256 of exactly them', async () => {
  for (const c of vector.cases) {
    assert.equal(canon(c.draft), c.canon);
    assert.equal(await draftHash(c.draft), createHash('sha256').update(c.canon, 'utf8').digest('hex'));
    assert.deepEqual(draftProblems(c.draft), []);
  }
});

test('a sign-off over the vector verifies; key order in the stored JSON does not matter', async () => {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', k.publicKey));
  const pins = [{ fingerprint: await fingerprint(spki), spki }];
  const d = vector.cases[1].draft;
  const ap = await approve(k.privateKey, spki, d, vector.batch_id);
  assert.equal(ap.draft_sha256, createHash('sha256').update(vector.cases[1].canon, 'utf8').digest('hex'));
  const reordered = Object.fromEntries(Object.entries(d).reverse());
  assert.equal((await verifyApproval(reordered, ap, pins, vector.batch_id)).ok, true);
});

test('the draft shape: one To, no Cc or Bcc, attachments under the draft, ISO times', () => {
  const d = vector.cases[0].draft;
  assert.match(draftProblems({ ...d, to: ['a@example.com', 'b@example.com'] }).join(), /exactly one/);
  assert.match(draftProblems({ ...d, cc: ['a@example.com'] }).join(), /unknown field cc/);
  assert.match(draftProblems({ ...d, bcc: ['a@example.com'] }).join(), /unknown field bcc/);
  assert.match(draftProblems({ ...d, attachments: [{ path: 'elsewhere/x.pdf', type: 'application/pdf', bytes: 1, sha256: '0'.repeat(64) }] }).join(), /under drafts\/d-1\/att/);
  assert.match(draftProblems({ ...d, send_after: 'tomorrow' }).join(), /ISO UTC/);
  assert.match(draftProblems({ ...d, in_reply_to: 'not-a-message-id' }).join(), /Message-ID/);
  assert.match(draftProblems({ ...d, subject: 'a\r\nBcc: x@example.com' }).join(), /one non-empty line/);
});

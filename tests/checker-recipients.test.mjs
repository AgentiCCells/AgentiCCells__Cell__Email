// recipients.allow_cc and recipients.one_domain in the email policy checker (Dinis's outreach
// defaults of 16 November 2026: "one recipient (up to three from one organisation, no cc or bcc)").
// SIMULATION: the simulated twin and made-up addresses. By email.dev.d@AgentiCCells.dinis, 2026-11-22.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../cell/policy/checker.mjs';
import { simTwin, policy } from './helpers.mjs';

const D = 'drafter.email@AgentiCCells.dinis';
const ctx = (recipients = {}) => { const p = policy(); return { policy: { ...p, recipients: { ...p.recipients, ...recipients } }, twin: simTwin(), outbox: [], stopped: false, now: '2026-11-16T12:00:00Z' }; };
const email = (over = {}) => ({
  author: D, kind: 'send', to: ['jo@example.net'], cc: [], bcc: [], language: 'en', attachments: [],
  subject: 'Next week', text: 'Hi Jo,\n\nThank you for the note. We can meet next week, please.\n\nBest regards,\nAlex', ...over,
});
const recipientRules = (r) => r.reasons.filter((x) => x.rule === 'recipients').map((x) => x.detail);

test('a policy that names neither rule checks as before: cc and two domains are allowed', () => {
  assert.deepEqual(recipientRules(check(email({ cc: ['rui@example.com'] }), ctx())), []);
});

test('allow_cc false denies any cc; allow_cc true or unset allows it', () => {
  assert.ok(recipientRules(check(email({ cc: ['ana@example.net'] }), ctx({ allow_cc: false }))).some((d) => /cc is not allowed/.test(d)));
  assert.deepEqual(recipientRules(check(email(), ctx({ allow_cc: false }))), []);
  assert.deepEqual(recipientRules(check(email({ cc: ['ana@example.net'] }), ctx({ allow_cc: true }))), []);
});

test('one_domain true denies recipients across two domains, counting to and cc', () => {
  assert.ok(recipientRules(check(email({ to: ['jo@example.net', 'rui@example.com'] }), ctx({ one_domain: true }))).some((d) => /2 domains/.test(d)));
  assert.ok(recipientRules(check(email({ cc: ['rui@example.com'] }), ctx({ one_domain: true }))).some((d) => /2 domains/.test(d)));
  assert.deepEqual(recipientRules(check(email({ to: ['jo@example.net', 'ana@EXAMPLE.net'] }), ctx({ one_domain: true }))), []);
});

test('the outreach defaults together: up to three from one organisation, no cc', () => {
  const c = ctx({ max: 3, allow_cc: false, one_domain: true });
  assert.deepEqual(recipientRules(check(email({ to: ['jo@example.net', 'ana@example.net', 'bo@example.net'] }), c)), []);
  assert.ok(recipientRules(check(email({ to: ['jo@example.net', 'ana@example.net', 'bo@example.net', 'cy@example.net'] }), c)).length);
});

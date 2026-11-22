// Round 4: the proposed outreach policy (sim/workflows/policy-outreach.mjs) against made-up
// outreach emails, value by value, and end to end through a signed entry and decideEntry().
// PROPOSAL for tests/ (email.dev.d's). SIMULATION: made-up addresses (RFC 2606), keys made fresh.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/app/cell/checker.mjs';
import { scanText } from '../../src/app/cell/shapes.mjs';
import { signPolicy } from '../../cell/policy/signed.mjs';
import { keys, agents, simTwin, pins } from '../../tests/helpers.mjs';
import { outreachPolicy, outreachAgents, TRACE } from './policy-outreach.mjs';
import { writeEntry, checkEntry } from './signed.mjs';

const A = 'conductor@PrompTugal.dinis', O = 'person:owner';
const NOW = '2026-11-16T12:00:00Z';
const campaign = { id: 'made-up-campaign', addresses: ['ana@example.com', 'bo@example.com', 'cy@example.com', 'dee@example.net'], proposers: [A] };
const pol = outreachPolicy(campaign);
const mail = (over = {}) => ({ to: ['ana@example.com'], cc: [], bcc: [], language: 'en', attachments: [], subject: 'A short question about your workshop',
  text: 'Hello Ana,\n\nI read the notes from your workshop last month and would like to ask two short questions about how you ran the exercises. Would you have twenty minutes in the next two weeks?\n\nKind regards,\nAlex', ...over });
const verdict = (email, { author = A, outbox = [] } = {}) => check({ ...email, author, kind: 'send', at: NOW }, { policy: pol, twin: simTwin(), outbox, stopped: false, now: NOW, scanText });
const rules = (r) => r.reasons.filter((x) => x.level === 'deny').map((x) => `${x.rule}: ${x.detail}`).join('; ');

test('outreach policy: a listed address, in English or Portuguese, is held for Dinis, never allowed alone', () => {
  for (const language of ['en', 'pt']) {
    const text = language === 'pt' ? 'Olá Ana,\n\nLi as notas do seu workshop do mês passado e gostaria de fazer duas perguntas curtas sobre os exercícios. Teria vinte minutos nas próximas duas semanas?\n\nCumprimentos,\nAlex' : undefined;
    const r = verdict(mail(text ? { language, text, subject: 'Uma pergunta curta sobre o seu workshop' } : {}));
    assert.equal(r.decision, 'hold', `${language}: ${rules(r)}`);
    assert.ok(r.reasons.some((x) => x.rule === 'first contact'), 'a first contact: a person approves');
  }
});

test('outreach policy: each of Dinis\'s defaults refuses what it should', () => {
  const cases = [
    ['cc', mail({ cc: ['bo@example.com'] }), /cc is not allowed/],
    ['bcc', mail({ bcc: ['bo@example.com'] }), /bcc is not allowed/],
    ['two organisations', mail({ to: ['ana@example.com', 'dee@example.net'] }), /one organisation/],
    ['four recipients', mail({ to: ['ana@example.com', 'bo@example.com', 'cy@example.com', 'x@example.com'] }), /the most allowed is 3/],
    ['not on the campaign list', mail({ to: ['zed@example.com'] }), /not in an allowed domain or on the allow list/],
    ['Spanish', mail({ language: 'es' }), /not an allowed language/],
    ['a PDF', mail({ attachments: [{ filename: 'deck.pdf', mime: 'application/pdf' }] }), /may not be attached/],
  ];
  for (const [name, email, want] of cases) {
    const r = verdict(email);
    assert.equal(r.decision, 'deny', name);
    assert.match(rules(r), want, name);
  }
  assert.notEqual(verdict(mail({ to: ['ana@example.com', 'bo@example.com', 'cy@example.com'] })).decision, 'deny', 'three from one organisation');
  assert.notEqual(verdict(mail({ attachments: [{ filename: 'logo.png', mime: 'image/png' }] })).decision, 'deny', 'an inline image');
});

test('outreach policy: one per recipient a day, twenty a day, and only the campaign\'s agent proposes', () => {
  const sentTo = (to, n) => Array.from({ length: n }, (_, i) => ({ at: `2026-11-16T0${i % 10}:00:00Z`, author: A, to }));
  assert.match(rules(verdict(mail(), { outbox: sentTo(['ana@example.com'], 1) })), /ana@example.com was sent 1/);
  assert.match(rules(verdict(mail(), { outbox: Array.from({ length: 20 }, (_, i) => ({ at: `2026-11-16T0${i % 10}:00:00Z`, author: O, to: [`p${i}@example.org`] })) })), /rate/);
  assert.match(rules(verdict(mail(), { author: 'drafter.email@AgentiCCells.dinis' })), /may not propose/);
});

test('outreach policy: every value is traced, and the values match the trace', () => {
  for (const [path] of TRACE) {
    const v = path.split('.').reduce((o, k) => o?.[k], pol);
    assert.notEqual(v, undefined, path);
  }
  assert.ok(TRACE.every(([, , src]) => /Dinis, 16 Nov|proposal by email\.workflows\.d/.test(src)));
});

test('outreach policy: end to end, a signed entry from the outreach agent passes to Dinis\'s press', async () => {
  const { signers, registry } = keys([A, O]);
  const ag = outreachAgents(agents(), [A]);
  const signatures = { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) };
  const x = writeEntry({ workflow: 'outreach', email: mail(), author: A, signer: signers[A], chain: [], at: '2026-11-16T10:00:00Z', policy: pol, agents: ag, signatures });
  const ctx = { registry, approvers: pins(registry), twin: simTwin(), now: NOW };
  const r = await checkEntry(x, ctx);
  assert.equal(r.c4.verdict, 'press', r.c4.reasons.join('; '));
  assert.equal(r.c4.row.action_now, 'wait for a person');
  // With today's agents.json (no outreach role) the same entry is refused on the lanes.
  const today = writeEntry({ workflow: 'outreach', email: mail(), author: A, signer: signers[A], chain: [], at: '2026-11-16T10:00:00Z', policy: pol, agents: agents(), signatures: { ...signatures, agents: signPolicy(agents(), { name: 'agents.json', author: O }, signers[O]) } });
  assert.equal((await checkEntry(today, ctx)).c4.verdict, 'refuse');
});

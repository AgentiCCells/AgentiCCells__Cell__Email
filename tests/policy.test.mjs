// The email policy checker, run against the simulated mailbox (SIMULATION: made-up mail only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../cell/policy/checker.mjs';
import { simulate } from '../cell/policy/simulate.mjs';
import { guessLanguage } from '../cell/policy/language.mjs';
import { simTwin, policy } from './helpers.mjs';

const D = 'drafter.email@AgentiCCells.dinis';
const NOW = '2026-11-16T12:00:00Z';
const ctx = (over = {}) => ({ policy: policy(), twin: simTwin(), outbox: [], stopped: false, now: NOW, ...over });
const rules = (r) => r.reasons.map((x) => `${x.level}:${x.rule}`);

// The article's example: a reply in Portuguese to an existing correspondent, using this template.
const ruiReply = (over = {}) => ({
  author: D, kind: 'reply', in_reply_to: 'm-0012', to: ['rui@example.com'], language: 'pt', attachments: [],
  subject: 'Re: Reunião sobre o projeto',
  text: 'Olá Rui,\n\nObrigado pela mensagem. Até quinta-feira de manhã, então.\n\nCumprimentos,\nAlex',
  template: { id: 'reply-pt-confirm', slots: { subject: 'Reunião sobre o projeto', name: 'Rui', message: 'Até quinta-feira de manhã, então.', signer: 'Alex' } },
  ...over,
});
const joReply = (over = {}) => ({
  author: D, kind: 'reply', in_reply_to: 'm-0003', to: ['jo@example.net'], language: 'en', attachments: [],
  subject: 'Re: Introduction: Jo Park', text: 'Hi Jo,\n\nWednesday at 15:00 is good for me. Thank you, and see you then.\n\nBest regards,\nAlex',
  ...over,
});

test('allow: a templated Portuguese reply to an existing correspondent, under the automation', () => {
  const r = check(ruiReply(), ctx());
  assert.equal(r.decision, 'allow', JSON.stringify(r.reasons));
  assert.equal(r.automation, 'auto-reply-pt-confirm');
});

test('hold: the same template as a first contact is never automatic', () => {
  const r = check(ruiReply({ kind: 'send', in_reply_to: null, to: ['new.person@example.com'], subject: 'Re: Reunião sobre o projeto' }), ctx());
  assert.equal(r.decision, 'hold');
  assert.ok(rules(r).includes('hold:first contact'));
  assert.deepEqual(r.first_contact, ['new.person@example.com']);
});

test('hold: a follow-up to someone who never answered is still a first contact', () => {
  const r = check({ author: D, kind: 'send', to: ['kim@example.com'], language: 'en', subject: 'Re: A question about your talk',
    text: 'Hello Kim,\n\nI am following up on my email of 10 November. Would you have fifteen minutes this month?\n\nKind regards,\nAlex' }, ctx());
  assert.equal(r.decision, 'hold');
  assert.ok(rules(r).includes('hold:first contact'));
});

test('hold: a free-text English reply has no automation, so a person approves', () => {
  const r = check(joReply(), ctx());
  assert.equal(r.decision, 'hold');
  assert.deepEqual(rules(r), ['hold:approval']);
});

test('hold: adding someone new to a reply', () => {
  const r = check(joReply({ cc: ['lucia@example.net'] }), ctx());
  assert.equal(r.decision, 'hold');
  assert.ok(r.reasons.some((x) => x.rule === 'reply' && x.detail.includes('lucia@example.net')));
});

test('deny: declared Portuguese but written in English', () => {
  const r = check(joReply({ language: 'pt' }), ctx());
  assert.equal(r.decision, 'deny');
  assert.ok(r.reasons.some((x) => x.rule === 'language' && x.detail.includes('reads as en')));
});

test('deny: French is not an allowed language', () => {
  const r = check({ author: D, kind: 'reply', in_reply_to: 'm-0011', to: ['camille@example.net'], language: 'fr', subject: 'Re: Demande de rendez-vous',
    text: 'Bonjour Camille,\n\nMerci pour votre message. Je suis disponible mardi.\n\nCordialement,\nAlex' }, ctx());
  assert.equal(r.decision, 'deny');
  assert.ok(rules(r).includes('deny:language'));
});

test('deny: replying to the phishing sender (a denied domain)', () => {
  const r = check(joReply({ in_reply_to: 'm-0006', to: ['support@helpdesk.invalid'], subject: 'Re: Action required: your mailbox will be closed' }), ctx());
  assert.equal(r.decision, 'deny');
  assert.ok(r.reasons.some((x) => x.detail.includes('denied domain')));
});

test('deny: a domain that is not on the allow list, too many recipients, and bcc', () => {
  const r = check(joReply({ to: ['jo@example.net', 'a@other.invalid', 'b@example.com', 'c@example.com'], bcc: ['sam@example.com'] }), ctx());
  assert.equal(r.decision, 'deny');
  const d = r.reasons.map((x) => x.detail).join('\n');
  assert.match(d, /not in an allowed domain/);
  assert.match(d, /the most allowed is 3/);
  assert.match(d, /bcc is not allowed/);
});

test('deny: rates, per recipient and per agent', () => {
  const sent = (n, to, author = D) => Array.from({ length: n }, (_, i) => ({ at: `2026-11-16T0${i % 10}:00:00Z`, author, to: [to] }));
  let r = check(ruiReply(), ctx({ outbox: sent(2, 'rui@example.com') }));
  assert.equal(r.decision, 'deny');
  assert.ok(r.reasons.some((x) => x.rule === 'rate' && x.detail.includes('rui@example.com')));
  r = check(ruiReply(), ctx({ outbox: sent(10, 'x@example.com') }));
  assert.ok(r.reasons.some((x) => x.rule === 'rate' && x.detail.includes(D)));
  r = check(ruiReply(), ctx({ outbox: sent(10, 'x@example.com').map((o) => ({ ...o, at: '2026-11-14T10:00:00Z' })) }));
  assert.equal(r.decision, 'allow', 'sends older than 24 hours do not count');
});

test('deny: data-loss checks catch a token shape and a private note', () => {
  // Built from parts so this test file does not trip the repository's leak scan.
  const fake = 'gh' + 'p_' + 'Ab1'.repeat(12);
  let r = check(joReply({ text: joReply().text.replace('see you then.', `the token is ${fake}`) }), ctx());
  assert.equal(r.decision, 'deny');
  assert.ok(r.reasons.some((x) => x.rule === 'data loss' && x.detail.includes('GitHub token')));
  r = check(joReply({ text: joReply().text + '\n[private] do not share the fee' }), ctx());
  assert.ok(r.reasons.some((x) => x.rule === 'data loss' && x.detail.includes('private note')));
});

test('deny: a template with its text changed, or a link in a slot', () => {
  let r = check(ruiReply({ text: ruiReply().text.replace('Obrigado pela mensagem.', 'Obrigado.') }), ctx());
  assert.ok(r.reasons.some((x) => x.rule === 'template' && x.detail.includes('not the template')));
  const slots = { ...ruiReply().template.slots, message: 'Veja https://example.com/x' };
  r = check(ruiReply({ template: { id: 'reply-pt-confirm', slots }, text: ruiReply().text.replace('Até quinta-feira de manhã, então.', slots.message) }), ctx());
  assert.ok(r.reasons.some((x) => x.rule === 'template' && x.detail.includes('holds a link')));
});

test('deny: attachments go as vault links', () => {
  const r = check(joReply({ attachments: [{ filename: 'plan.pdf', mime: 'application/pdf' }] }), ctx());
  assert.ok(r.reasons.some((x) => x.rule === 'attachments'));
});

test('deny: an agent that is not a sender, and the kill switch', () => {
  let r = check(ruiReply({ author: 'triage.email@AgentiCCells.dinis' }), ctx());
  assert.ok(rules(r).includes('deny:sender'));
  r = check(ruiReply(), ctx({ stopped: true }));
  assert.equal(r.decision, 'deny');
  assert.ok(rules(r).includes('deny:kill switch'));
});

test('deny by default: an empty policy allows nothing', () => {
  const r = check(ruiReply(), ctx({ policy: { schema: 'email.policy/1' } }));
  assert.equal(r.decision, 'deny');
});

test('the language guesser tells en, pt, es and fr apart', () => {
  const t = simTwin();
  for (const id of ['m-0001', 'm-0004', 'm-0008', 'm-0011']) {
    const m = t.messages.get(id);
    assert.equal(guessLanguage(m.body.text).language, m.language, id);
  }
  assert.equal(guessLanguage('ok').language, null);
});

test('the policy simulator over the simulated outbound mail', () => {
  const out = simulate(simTwin(), policy(), 'person:assistant');
  const by = Object.fromEntries(out.rows.map((r) => [r.id, r.decision]));
  assert.equal(by['m-0002'], 'hold'); // reply to an introduction, no automation
  assert.equal(by['m-0005'], 'hold'); // Portuguese reply, free text
  assert.equal(by['m-0009'], 'hold'); // first contact
  assert.equal(out.counts.allow + out.counts.hold + out.counts.deny, 3);
});

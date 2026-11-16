import { test } from 'node:test';
import assert from 'node:assert/strict';
import { append, verifyChain, mergeLanes, refOf, gatewayStopped, canonical } from '../cell/lanes/entry.mjs';
import { decide } from '../cell/gateway/decide.mjs';
import { keys, agents, policy, simTwin } from './helpers.mjs';

const D = 'drafter.email@AgentiCCells.dinis', G = 'gateway.email@AgentiCCells.dinis', T = 'triage.email@AgentiCCells.dinis', O = 'person:owner';

const ruiReply = () => ({
  in_reply_to: 'm-0012', to: ['rui@example.com'], cc: [], bcc: [], language: 'pt', attachments: [],
  subject: 'Re: Reunião sobre o projeto',
  text: 'Olá Rui,\n\nObrigado pela mensagem. Até quinta-feira de manhã, então.\n\nCumprimentos,\nAlex',
  template: { id: 'reply-pt-confirm', slots: { subject: 'Reunião sobre o projeto', name: 'Rui', message: 'Até quinta-feira de manhã, então.', signer: 'Alex' } },
});
const jo = () => ({
  in_reply_to: 'm-0003', to: ['jo@example.net'], cc: [], bcc: [], language: 'en', attachments: [],
  subject: 'Re: Introduction: Jo Park', text: 'Hi Jo,\n\nWednesday at 15:00 is good for me. Thank you, and see you then.\n\nBest regards,\nAlex',
});

function flow() {
  const { signers, registry } = keys([D, G, T, O]);
  const lanes = { dA: [], oP: [], gO: [], tA: [], gR: [] };
  const a1 = append(lanes.dA, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, signers[D]);
  const ap = append(lanes.oP, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(a1)], at: '2026-11-16T10:05:00Z' }, signers[O]);
  append(lanes.gO, { lane: 'outbox', author: G, type: 'sent', refs: [refOf(ap), refOf(a1)], body: { proposed_by: D, to: ['jo@example.net'], result: 'SIMULATED' }, at: '2026-11-16T10:06:00Z' }, signers[G]);
  append(lanes.gR, { lane: 'reads', author: G, type: 'read', body: { message: 'm-0003', view: 'raw' }, at: '2026-11-16T09:00:00Z' }, signers[G]);
  return { signers, registry, lanes, a1, ap };
}

test('canonical JSON sorts keys and drops undefined', () => {
  assert.equal(canonical({ b: 1, a: [true, null, 's'], c: undefined }), '{"a":[true,null,"s"],"b":1}');
  assert.throws(() => canonical({ x: 1.5 }));
});

test('a full flow verifies: propose, approve, send, read', () => {
  const { registry, lanes } = flow();
  const r = mergeLanes(Object.values(lanes), registry, agents());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.order.map((e) => e.type), ['read', 'propose.reply', 'approve', 'sent']);
});

test('a changed body breaks the signature', () => {
  const { registry, lanes } = flow();
  lanes.dA[0].body.email.to = ['someone@example.com'];
  assert.ok(verifyChain(lanes.dA, registry).some((e) => e.includes('bad signature')));
});

test('a deleted or reordered entry breaks the chain', () => {
  const { signers, registry } = keys([D]);
  const c = [];
  for (let i = 0; i < 3; i++) append(c, { lane: 'actions', author: D, type: 'propose.label', body: { n: i }, at: `2026-11-16T10:0${i}:00Z` }, signers[D]);
  assert.deepEqual(verifyChain(c, registry), []);
  assert.ok(verifyChain([c[0], c[2]], registry).some((e) => e.includes('seq')));
  assert.ok(verifyChain([c[1], c[0], c[2]], registry).length > 0);
});

test('an entry signed with a key that is not the author\'s is rejected', () => {
  const { signers, registry } = keys([D, 'intruder']);
  const c = [];
  append(c, { lane: 'actions', author: D, type: 'propose.send', body: {} }, signers.intruder);
  assert.ok(verifyChain(c, registry).some((e) => e.includes('not the author')));
});

test('altitude 3: triage may not propose a reply, the gateway may not approve', () => {
  const { signers, registry } = keys([T, G]);
  const t = [], g = [];
  append(t, { lane: 'actions', author: T, type: 'propose.reply', body: {} }, signers[T]);
  append(g, { lane: 'approvals', author: G, type: 'gateway.start' }, signers[G]);
  const errors = mergeLanes([t, g], registry, agents()).errors;
  assert.ok(errors.some((e) => e.includes('may not write propose.reply')));
  assert.ok(errors.some((e) => e.includes('may not write gateway.start')));
});

test('a proposer may not approve its own action', () => {
  const { signers, registry } = keys([O]);
  const a = [], p = [];
  const x = append(a, { lane: 'actions', author: O, type: 'propose.send', body: {}, at: '2026-11-16T10:00:00Z' }, signers[O]);
  append(p, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(x)], at: '2026-11-16T10:01:00Z' }, signers[O]);
  assert.ok(mergeLanes([a, p], registry, agents()).errors.some((e) => e.includes('own action')));
});

test('sent with no approval and no policy allow is rejected', () => {
  const { signers, registry } = keys([G]);
  const g = [];
  append(g, { lane: 'outbox', author: G, type: 'sent', body: {} }, signers[G]);
  assert.ok(mergeLanes([g], registry, agents()).errors.some((e) => e.includes('without an approval')));
});

test('an approval dated before its action is rejected', () => {
  const { signers, registry } = keys([D, O]);
  const a = [], p = [];
  const x = append(a, { lane: 'actions', author: D, type: 'propose.send', body: {}, at: '2026-11-16T10:00:00Z' }, signers[D]);
  append(p, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(x)], at: '2026-11-16T09:00:00Z' }, signers[O]);
  assert.ok(mergeLanes([a, p], registry, agents()).errors.some((e) => e.includes('does not come before')));
});

test('the kill switch: the last stop or start wins', () => {
  const { signers, registry } = keys([O]);
  const p = [];
  append(p, { lane: 'approvals', author: O, type: 'gateway.stop', at: '2026-11-16T10:00:00Z' }, signers[O]);
  assert.equal(gatewayStopped(mergeLanes([p], registry).order), true);
  append(p, { lane: 'approvals', author: O, type: 'gateway.start', at: '2026-11-16T11:00:00Z' }, signers[O]);
  assert.equal(gatewayStopped(mergeLanes([p], registry).order), false);
});

test('the gateway decides: auto-send under policy, wait for a person, refuse', () => {
  const { signers, registry } = keys([D, O]);
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: ruiReply() }, at: '2026-11-16T10:00:00Z' }, signers[D]);
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:01:00Z' }, signers[D]);
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: { ...jo(), bcc: ['sam@example.com'] } }, at: '2026-11-16T10:02:00Z' }, signers[D]);
  const { order } = mergeLanes([a], registry, agents());
  const out = decide(order, { policy: policy(), twin: simTwin(), now: '2026-11-16T12:00:00Z' });
  assert.deepEqual(out.rows.map((r) => r.action_now), ['send', 'wait for a person', 'refuse']);
  assert.equal(out.rows[0].policy.automation, 'auto-reply-pt-confirm');
});

test('the gateway sends a held email once a person approves, and nothing while stopped', () => {
  const { signers, registry } = keys([D, O]);
  const a = [], p = [];
  const x = append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, signers[D]);
  append(p, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(x)], at: '2026-11-16T10:05:00Z' }, signers[O]);
  let out = decide(mergeLanes([a, p], registry, agents()).order, { policy: policy(), twin: simTwin(), now: '2026-11-16T12:00:00Z' });
  assert.equal(out.rows[0].action_now, 'send');
  append(p, { lane: 'approvals', author: O, type: 'gateway.stop', at: '2026-11-16T10:06:00Z' }, signers[O]);
  out = decide(mergeLanes([a, p], registry, agents()).order, { policy: policy(), twin: simTwin(), now: '2026-11-16T12:00:00Z' });
  assert.equal(out.stopped, true);
  assert.equal(out.rows[0].action_now, 'refuse');
});

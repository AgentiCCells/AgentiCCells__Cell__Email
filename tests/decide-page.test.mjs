// decide() in the page (abp/cell-email C4): the browser's WebCrypto port must accept and refuse
// exactly what the Node gateway code accepts and refuses, and the page's per-entry check must
// refuse anything that is not the exact email an agent signed under a signed policy.
// SIMULATION: made-up mail, the simulated twin, and keys made fresh for each run.
// By cell.email.d@AgentiCCells.dinis, 2026-11-22.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { append, mergeLanes as nodeMerge, refOf, keyId as nodeKeyId } from '../cell/lanes/entry.mjs';
import { decide as nodeDecide } from '../cell/gateway/decide.mjs';
import { signPolicy, verifyPolicy as nodeVerifyPolicy } from '../cell/policy/signed.mjs';
import { scanText as leakScan } from '../scripts/leak-scan.mjs';
import * as B from '../src/app/cell/lanes.mjs';
import { decide as pageDecide, decideEntry, emptyTwin } from '../src/app/cell/decide.mjs';
import { scanText as pageScan } from '../src/app/cell/shapes.mjs';
import { check as pureCheck } from '../src/app/cell/checker.mjs';
import { check as nodeCheck } from '../cell/policy/checker.mjs';
import { keys, agents, policy, simTwin, pins } from './helpers.mjs';

const D = 'drafter.email@AgentiCCells.dinis', G = 'gateway.email@AgentiCCells.dinis', T = 'triage.email@AgentiCCells.dinis', O = 'person:owner';
const NOW = '2026-11-16T12:00:00Z';

const ruiReply = () => ({
  in_reply_to: 'm-0012', to: ['rui@example.com'], cc: [], bcc: [], language: 'pt', attachments: [],
  subject: 'Re: Reunião sobre o projeto',
  text: 'Olá Rui,\n\nObrigado pela mensagem. Respondo com mais detalhe em breve.\n\nCumprimentos,\nAlex',
  template: { id: 'reply-pt-thanks', slots: { subject: 'Reunião sobre o projeto', name: 'Rui', signer: 'Alex' } },
});
const jo = () => ({
  in_reply_to: 'm-0003', to: ['jo@example.net'], cc: [], bcc: [], language: 'en', attachments: [],
  subject: 'Re: Introduction: Jo Park', text: 'Hi Jo,\n\nWednesday at 15:00 is good for me. Thank you, and see you then.\n\nBest regards,\nAlex',
});
const shown = (email) => ({ to: email.to, cc: email.cc, bcc: email.bcc, subject: email.subject, text: email.text });

function world() {
  const { signers, registry } = keys([D, G, T, O]);
  const pol = policy(), ag = agents();
  const signatures = {
    policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]),
    agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]),
  };
  return { signers, registry, approvers: pins(registry), pol, ag, signatures };
}
const evidenceOf = (w, chains, over = {}) => ({ chains, policy: w.pol, agents: w.ag, signatures: w.signatures, ...over });
const ctxOf = (w, over = {}) => ({ registry: w.registry, approvers: w.approvers, twin: simTwin(), now: NOW, ...over });

// ------------------------------------------------------------ the same answers as the Node code

test('page lanes: the key id matches the Node key id', async () => {
  const { registry } = keys([D]);
  assert.equal(await B.keyId(registry[D]), nodeKeyId(registry[D]));
  assert.equal(await B.entryHash({ b: 1, a: 'x' }), (await B.entryHash({ a: 'x', b: 1 })));
});

test('page lanes: every merge case gives the same verdict and errors as the Node merge', async () => {
  const cases = {
    'full flow': (w) => {
      const a = [], p = [], o = [], r = [];
      const a1 = append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
      const ap = append(p, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(a1)], at: '2026-11-16T10:05:00Z' }, w.signers[O]);
      append(o, { lane: 'outbox', author: G, type: 'sent', refs: [refOf(ap), refOf(a1)], body: { proposed_by: D, to: ['jo@example.net'] }, at: '2026-11-16T10:06:00Z' }, w.signers[G]);
      append(r, { lane: 'reads', author: G, type: 'read', body: { message: 'm-0003' }, at: '2026-11-16T09:00:00Z' }, w.signers[G]);
      return [a, p, o, r];
    },
    'changed body': (w) => { const a = []; append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: jo() }, at: NOW }, w.signers[D]); a[0].body.email.to = ['x@example.com']; return [a]; },
    'wrong key': (w) => { const a = []; append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: jo() }, at: NOW }, w.signers[T]); return [a]; },
    'cut chain': (w) => { const a = []; append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: jo() }, at: NOW }, w.signers[D]); append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: ruiReply() }, at: NOW }, w.signers[D]); return [a.slice(1)]; },
    'triage proposes': (w) => { const a = []; append(a, { lane: 'actions', author: T, type: 'propose.reply', body: { email: jo() }, at: NOW }, w.signers[T]); return [a]; },
    'self approval': (w) => {
      const a = [], p = [];
      const a1 = append(a, { lane: 'actions', author: O, type: 'propose.send', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[O]);
      append(p, { lane: 'approvals', author: O, type: 'approve', refs: [refOf(a1)], at: '2026-11-16T10:01:00Z' }, w.signers[O]);
      return [a, p];
    },
    'sent without approval': (w) => { const o = []; append(o, { lane: 'outbox', author: G, type: 'sent', body: { to: ['jo@example.net'] }, at: NOW }, w.signers[G]); return [o]; },
  };
  for (const [name, make] of Object.entries(cases)) {
    const w = world();
    const chains = make(w);
    const n = nodeMerge(chains, w.registry, w.ag, w.approvers);
    const b = await B.mergeLanes(chains, w.registry, w.ag, w.approvers);
    assert.equal(b.ok, n.ok, `${name}: ok`);
    assert.deepEqual([...b.errors], [...n.errors], `${name}: errors`);
    assert.equal(B.isVerifiedMerge(b), n.ok, `${name}: verified`);
  }
});

test('page lanes: signed policy files give the same problems as the Node check', async () => {
  const w = world();
  const other = keys([O]);
  const cases = {
    good: [w.pol, w.signatures.policy, w.registry, w.approvers],
    changed: [{ ...w.pol, languages: ['en'] }, w.signatures.policy, w.registry, w.approvers],
    unsigned: [w.pol, undefined, w.registry, w.approvers],
    unpinned: [w.pol, w.signatures.policy, w.registry, {}],
    'swapped key': [w.pol, w.signatures.policy, { ...w.registry, [O]: other.registry[O] }, w.approvers],
  };
  for (const [name, [obj, sig, registry, approvers]] of Object.entries(cases)) {
    const opts = { name: 'email-policy.json', registry, approvers };
    assert.deepEqual(await B.verifyPolicy(obj, sig, opts), nodeVerifyPolicy(obj, sig, opts), name);
  }
});

test('page decide: the same action for every proposal as the Node decide', async () => {
  const w = world();
  const a = [], p = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: ruiReply() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:01:00Z' }, w.signers[D]);
  const denied = append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: { ...jo(), in_reply_to: undefined, to: ['someone@helpdesk.invalid'] } }, at: '2026-11-16T10:02:00Z' }, w.signers[D]);
  append(p, { lane: 'approvals', author: O, type: 'reject', refs: [refOf(denied)], at: '2026-11-16T10:03:00Z' }, w.signers[O]);
  const base = { policy: w.pol, agents: w.ag, registry: w.registry, approvers: w.approvers, signatures: w.signatures, twin: simTwin(), now: NOW };
  for (const over of [{}, { signatures: {} }]) {
    const n = nodeDecide(nodeMerge([a, p], w.registry, w.ag, w.approvers), { ...base, ...over });
    const b = await pageDecide(await B.mergeLanes([a, p], w.registry, w.ag, w.approvers), { ...base, ...over });
    assert.deepEqual(b.rows.map((r) => [r.action_now, r.policy.decision, r.policy.reasons.map((x) => x.rule)]), n.rows.map((r) => [r.action_now, r.policy.decision, r.policy.reasons.map((x) => x.rule)]));
    assert.deepEqual(b.rows.map((r) => r.action), n.rows.map((r) => r.action));
    if (!over.signatures) assert.deepEqual(b.rows.map((r) => r.action_now), ['send', 'wait for a person', 'drop']);
    else assert.ok(b.rows.every((r) => r.action_now === 'refuse' || r.action_now === 'drop'));
  }
  await assert.rejects(() => pageDecide({ ok: true, errors: [], order: [] }, base), /not verified/);
});

test('page scanner: finds what the leak scan finds in outbound email', () => {
  const dash = '-'.repeat(5);
  const corpus = [
    'Hi Jo,\n\nWednesday at 15:00 is good for me.\n\nBest regards,\nAlex',
    'see https://newsroom.sgit.ai/articles/the-email-agentic-cell.html for the article',
    `${dash}BEGIN ${'PRIVATE'} KEY${dash}`,
    `${dash}BEGIN PUBLIC KEY${dash}`,
    'token: ' + 'ya29.' + 'a'.repeat(30),
    'the key is ' + 'gh' + 'p_' + 'A1'.repeat(20),
    'password = ' + randomBytes(18).toString('base64url'),
    randomBytes(40).toString('base64'),
    'commit ' + 'a'.repeat(40) + ' and fingerprint sha256:40ff743093f2ecd5',
    'mixed ' + randomBytes(16).toString('hex') + 'q1:' + 'abcd1234',
    'AKIA' + 'ABCDEFGHIJKLMNOP',
  ];
  for (const s of corpus) assert.deepEqual(pageScan('outbound-email', s), leakScan('outbound-email', s), s.slice(0, 20));
});

test('the checker denies every email when no data-loss scanner is given; the Node wrapper gives one', () => {
  const ctx = { policy: policy(), twin: simTwin(), outbox: [], stopped: false, now: NOW };
  const p = { ...ruiReply(), author: D, kind: 'reply' };
  assert.ok(pureCheck(p, ctx).reasons.some((r) => r.rule === 'data loss' && /no data-loss scanner/.test(r.detail)));
  assert.equal(nodeCheck(p, ctx).decision, 'allow');
  assert.equal(pureCheck(p, { ...ctx, scanText: pageScan }).decision, 'allow');
});

// ------------------------------------------------------------ the page's question for one entry

test('entry: with no signed proposal the check does not run and the press decides (ABP 1.1.4)', async () => {
  const r = await decideEntry(shown(jo()), null, ctxOf(world()));
  assert.equal(r.ran, false);
  assert.equal(r.verdict, 'press');
});

test('entry: a held proposal, signed under a signed policy, passes to the person\'s press', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const r = await decideEntry(shown(jo()), evidenceOf(w, [a]), ctxOf(w));
  assert.equal(r.ran, true);
  assert.equal(r.verdict, 'press', r.reasons.join('; '));
  assert.equal(r.row.action_now, 'wait for a person');
});

test('entry: an approval on the lanes or a signed automation also passes', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: ruiReply() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const r = await decideEntry(shown(ruiReply()), evidenceOf(w, [a]), ctxOf(w));
  assert.equal(r.verdict, 'press');
  assert.match(r.reasons[0], /auto-reply-pt-thanks/);
});

test('entry: refused when the email shown differs from the one the agent signed', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  for (const change of [{ to: ['jo@example.com'] }, { subject: 'Re: something else' }, { text: jo().text + '\nP.S.' }, { cc: ['rui@example.com'] }]) {
    const r = await decideEntry({ ...shown(jo()), ...change }, evidenceOf(w, [a]), ctxOf(w));
    assert.equal(r.verdict, 'refuse', JSON.stringify(change));
    assert.match(r.reasons[0], /not one that an agent proposed and signed/);
  }
});

test('entry: refused when the lanes do not verify (changed entry, unknown author, unpinned approver)', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const tampered = structuredClone(a); tampered[0].body.email.subject = 'Re: changed';
  let r = await decideEntry({ ...shown(jo()), subject: 'Re: changed' }, evidenceOf(w, [tampered]), ctxOf(w));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /bad signature/.test(x)));
  r = await decideEntry(shown(jo()), evidenceOf(w, [a]), ctxOf(w, { registry: {} }));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /no registered key/.test(x)));
  r = await decideEntry(shown(jo()), evidenceOf(w, [a]), ctxOf(w, { approvers: undefined }));
  assert.equal(r.verdict, 'refuse');
});

test('entry: keys or approvers carried inside the evidence are ignored', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const r = await decideEntry(shown(jo()), evidenceOf(w, [a], { registry: w.registry, approvers: w.approvers }), ctxOf(w, { registry: {}, approvers: {} }));
  assert.equal(r.verdict, 'refuse');
});

test('entry: refused when a policy file is unsigned, changed, or missing', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  for (const over of [{ signatures: {} }, { policy: { ...w.pol, recipients: { ...w.pol.recipients, max: 50 } } }, { agents: undefined }]) {
    const r = await decideEntry(shown(jo()), evidenceOf(w, [a], over), ctxOf(w));
    assert.equal(r.verdict, 'refuse', Object.keys(over).join());
  }
});

test('entry: refused when the policy denies it, a person rejected it, it was withdrawn, or the gateway is stopped', async () => {
  const w = world();
  const bad = { ...jo(), in_reply_to: undefined, to: ['someone@helpdesk.invalid'] };
  let a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.send', body: { email: bad }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  let r = await decideEntry(shown(bad), evidenceOf(w, [a]), ctxOf(w));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /denied domain/.test(x)));

  a = []; const p = [];
  const a1 = append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  append(p, { lane: 'approvals', author: O, type: 'reject', refs: [refOf(a1)], at: '2026-11-16T10:01:00Z' }, w.signers[O]);
  r = await decideEntry(shown(jo()), evidenceOf(w, [a, p]), ctxOf(w));
  assert.equal(r.verdict, 'refuse'); assert.match(r.reasons[0], /rejected/);

  const wd = [...a];
  append(wd, { lane: 'actions', author: D, type: 'withdraw', refs: [refOf(a1)], at: '2026-11-16T10:02:00Z' }, w.signers[D]);
  r = await decideEntry(shown(jo()), evidenceOf(w, [wd]), ctxOf(w));
  assert.equal(r.verdict, 'refuse');

  const s = [];
  append(s, { lane: 'approvals', author: G, type: 'gateway.stop', at: '2026-11-16T10:03:00Z' }, w.signers[G]);
  r = await decideEntry(shown(jo()), evidenceOf(w, [a.slice(0, 1), s]), ctxOf(w));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /kill switch/.test(x)));
});

test('entry: sends the page already records count towards the rates', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const sent = Array.from({ length: 20 }, (_, i) => ({ at: `2026-11-16T0${i % 10}:00:00Z`, author: 'person:owner', to: [`p${i}@example.com`] }));
  const r = await decideEntry(shown(jo()), evidenceOf(w, [a]), ctxOf(w, { sent }));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /^rate:/.test(x)));
});

test('entry: with no twin loaded the check fails closed (a reply finds no parent)', async () => {
  const w = world();
  const a = [];
  append(a, { lane: 'actions', author: D, type: 'propose.reply', body: { email: jo() }, at: '2026-11-16T10:00:00Z' }, w.signers[D]);
  const r = await decideEntry(shown(jo()), evidenceOf(w, [a]), ctxOf(w, { twin: emptyTwin('owner@example.org') }));
  assert.equal(r.verdict, 'refuse'); assert.ok(r.reasons.some((x) => /not a message in the twin/.test(x)));
});

test('entry: unreadable evidence is refused, never thrown', async () => {
  const w = world();
  for (const ev of [{ chains: 'x' }, { chains: [[{ lane: 'actions' }]], policy: w.pol, agents: w.ag }, { chains: [] }]) {
    const r = await decideEntry(shown(jo()), ev, ctxOf(w));
    assert.equal(r.verdict, 'refuse');
  }
});

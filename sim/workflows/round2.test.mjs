// Round 2 experiments (backlog: workflow experiments): the new machines driven by the real code on
// made-up mail. The machine's next event is what the code decides, so the drawn path is the one
// the code takes. PROPOSAL for tests/ (email.dev.d's). SIMULATION: keys made fresh for each run.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { append } from '../../cell/lanes/entry.mjs';
import { signPolicy } from '../../cell/policy/signed.mjs';
import * as B from '../../src/app/cell/lanes.mjs';
import { messageOf, problems } from '../../src/app/send.js';
import { keys, agents, policy, simTwin, pins } from '../../tests/helpers.mjs';
import { byId, run, checkMachines, PRIMITIVES, MACHINES } from './machines.mjs';
import { writeEntry, checkEntry } from './signed.mjs';
import * as F from './fixtures.mjs';

const D = 'drafter.email@AgentiCCells.dinis', G = 'gateway.email@AgentiCCells.dinis', O = 'person:owner';
const NOW = '2026-11-16T12:00:00Z';

function world() {
  const { signers, registry } = keys([D, G, O]);
  const pol = policy(), ag = agents();
  const signatures = { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) };
  return { signers, registry, approvers: pins(registry), pol, ag, signatures, ctx: { registry, approvers: pins(registry), twin: simTwin(), now: NOW } };
}
const outreach = (w) => writeEntry({ workflow: 'outreach', email: F.outreach(), author: D, signer: w.signers[D], chain: [], at: '2026-11-16T10:00:00Z', policy: w.pol, agents: w.ag, signatures: w.signatures });

test('round 2: every machine names an acceptance check, a bottleneck rank and known building blocks', () => {
  assert.deepEqual(checkMachines(), []);
  for (const m of MACHINES) {
    assert.ok(m.bottleneck >= 1 && m.bottleneck <= 5, m.id);
    for (const p of m.primitives) assert.ok(PRIMITIVES[p], `${m.id}: ${p}`);
  }
});

// Experiment 1: the kill switch. A signed gateway.stop, merged with the drafter's proposal, must
// move the machine to stopped and make the page refuse the entry; a tampered stop must not count.
test('round 2: gateway-stop, driven by mergeLanes and decideEntry', async () => {
  const w = world();
  const x = outreach(w);
  assert.equal((await checkEntry(x, w.ctx)).c4.verdict, 'press', 'before the stop');
  const stop = [];
  append(stop, { lane: 'approvals', author: G, type: 'gateway.stop', at: '2026-11-16T10:30:00Z' }, w.signers[G]);
  const chains = [...x.signed.chains, stop];
  const merged = await B.mergeLanes(chains, w.registry, w.ag, w.approvers);
  const m = byId('gateway-stop');
  let r = run(m, ['write gateway.stop', merged.ok ? 'the lanes verify' : 'the lanes do not verify']);
  assert.equal(r.state, 'stopped');
  assert.equal(B.gatewayStopped(merged.order), true);
  const after = await checkEntry({ ...x, signed: { ...x.signed, chains } }, w.ctx);
  assert.equal(after.c4.verdict, 'refuse');
  assert.ok(after.c4.reasons.some((s) => /kill switch/.test(s)), after.c4.reasons.join('; '));

  const forged = structuredClone(stop); forged[0].at = '2026-11-16T10:31:00Z';
  const bad = await B.mergeLanes([...x.signed.chains, forged], w.registry, w.ag, w.approvers);
  r = run(m, ['write gateway.stop', bad.ok ? 'the lanes verify' : 'the lanes do not verify']);
  assert.equal(r.state, 'not_signed');
});

// Experiment 2: approve-and-send's first move, decided by send.js's problems() and decideEntry().
test('round 2: approve-and-send opens to ready or not_sendable as the page decides', async () => {
  const w = world();
  const m = byId('approve-and-send');
  const decideOpen = async (written, sentToday = 0) => {
    const c = await checkEntry(written, w.ctx, { sentToday });
    return run(m, [c.sendable ? 'checks pass' : 'a check refuses']).state;
  };
  assert.equal(await decideOpen(outreach(w)), 'ready');
  assert.equal(await decideOpen(outreach(w), 20), 'not_sendable', 'the 21st send of the day');
  const withBcc = outreach(w); withBcc.meta.bcc = ['hidden@example.com'];
  assert.equal(await decideOpen(withBcc), 'not_sendable');
  assert.ok(problems(messageOf(withBcc.meta, withBcc.body)).some((s) => /Bcc/.test(s)));
});

// Experiment 3: the trust ladder can be walked rung by rung, and held at any rung.
test('round 2: the trust ladder goes one rung at a time and can stop on any', () => {
  const m = byId('trust-ladder');
  const all = ['pin approvers and lane keys', 'ABP change: approvals are signed', 'ABP change: signed automations may send', 'ABP change: sessions send under policy'];
  assert.equal(run(m, all).state, 'sessions_send');
  assert.match(run(m, [all[0], all[2]]).error, /no move/, 'no rung is skipped');
  assert.equal(run(m, [all[0], 'Dinis keeps this rung']).state, 'held');
});

// Experiment 4: the first real send, as far as made-up data can take it: its path is the one the
// page's own checks allow for an entry addressed to the owner.
test('round 2: first-send reaches done only through approve-and-send', () => {
  const m = byId('first-send');
  const r = run(m, ['paste the sealed code', 'press Open vault', 'open the entry to himself', 'press Allow sending', 'approve and send']);
  assert.equal(r.state, 'done');
  assert.ok(m.moves.find((x) => x.to === 'done').uses === 'approve-and-send');
});

// The workflow machines are well formed, the generated plan page is current, and the compose
// machines follow what the real code decides on made-up mail.
// PROPOSAL for tests/ (email.dev.d's); SIMULATION: made-up mail, keys made fresh for each run.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
// Moved from sim/workflows/ into tests/ by email.dev.d@AgentiCCells.dinis, 22 November 2026, so CI runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MACHINES, byId, checkMachines, run, paths } from '../sim/workflows/machines.mjs';
import { markdownPage, svg } from '../sim/workflows/render.mjs';
import { writeEntry, checkEntry } from '../sim/workflows/signed.mjs';
import { signPolicy } from '../cell/policy/signed.mjs';
import { keys, agents, policy, simTwin, pins } from './helpers.mjs';
import * as F from '../sim/workflows/fixtures.mjs';

const root = new URL('../', import.meta.url).pathname;

test('machines: well formed', () => {
  assert.deepEqual(checkMachines(), []);
  for (const m of MACHINES) assert.ok(paths(m).some((p) => p.kind === 'goal'), `${m.id}: a path to its goal`);
});

test('machines: the checker finds broken machines', () => {
  const bad = structuredClone(byId('connect'));
  bad.moves.push({ from: 'can_send', to: 'consent', on: 'again', by: 'person' });
  bad.states.lost = { about: 'nowhere' };
  bad.moves.push({ from: 'consent', to: 'nowhere', on: 'x', by: 'robot', uses: 'nothing' });
  const p = checkMachines([bad]).join('\n');
  for (const want of [/out of end state/, /lost cannot be reached/, /unknown state nowhere/, /unknown actor robot/, /unknown workflow nothing/]) assert.match(p, want);
  const a = { ...structuredClone(byId('reply')), id: 'a', moves: [...byId('reply').moves, { from: 'picked', to: 'drafted', on: 'b', by: 'agent', uses: 'b' }] };
  const b = { ...structuredClone(byId('reply')), id: 'b', moves: [...byId('reply').moves, { from: 'picked', to: 'drafted', on: 'a', by: 'agent', uses: 'a' }] };
  assert.match(checkMachines([a, b]).join('\n'), /workflow cycle/);
});

test('machines: docs/plan/workflow-machines.md is what render.mjs makes', () => {
  assert.equal(readFileSync(root + 'docs/plan/workflow-machines.md', 'utf8'), markdownPage(), 'run: node sim/workflows/render.mjs');
});

test('machines: every machine draws, with every state and every move', () => {
  for (const m of MACHINES) {
    const s = svg(m);
    assert.equal((s.match(/<rect /g) || []).length, Object.keys(m.states).length, m.id);
    assert.equal((s.match(/class="mv mv-/g) || []).length, m.moves.length, m.id);
  }
});

test('machines: approve-and-send runs to recorded, and a cancel goes back to ready', () => {
  const m = byId('approve-and-send');
  let r = run(m, ['checks pass', 'press Approve and send', 'confirm', '200 with an id', 'meta.json written and published']);
  assert.equal(r.state, 'recorded'); assert.equal(r.ended, 'goal');
  r = run(m, ['checks pass', 'press Approve and send', 'cancel']);
  assert.equal(r.state, 'ready'); assert.equal(r.ended, false);
  r = run(m, ['press Approve and send']);
  assert.match(r.error, /no move/);
});

// The compose machines driven by the real writer and checks: the machine's next event is what
// checkEntry() says, so the drawn path is the one the code takes.
async function compose(id, email, ctx, w) {
  const m = byId(id);
  const written = writeEntry({ workflow: id, email, author: w.D, signer: w.signers[w.D], chain: [], at: '2026-11-16T10:00:00Z', policy: w.pol, agents: w.ag, signatures: w.signatures });
  const c = await checkEntry(written, ctx);
  const events = ['write', c.sendable ? 'self-check passes' : 'self-check refuses', ...(c.sendable ? ['write the entry'] : [])];
  return run(m, events);
}

test('machines: outreach, reply and follow-up end in the outbox on made-up mail, or are dropped', async () => {
  const D = 'drafter.email@AgentiCCells.dinis', O = 'person:owner';
  const { signers, registry } = keys([D, O]);
  const pol = policy(), ag = agents();
  const w = { D, signers, pol, ag, signatures: { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) } };
  const ctx = { registry, approvers: pins(registry), twin: simTwin(), now: '2026-11-16T12:00:00Z' };
  for (const [id, email] of [['outreach', F.outreach()], ['reply', F.reply()], ['follow-up', F.followUp()]]) {
    const r = await compose(id, email, ctx, w);
    assert.equal(r.state, 'in_outbox', id); assert.deepEqual(r.path, ['picked', 'drafted', 'checked', 'in_outbox']);
  }
  const r = await compose('outreach', { ...F.outreach(), to: ['someone@helpdesk.invalid'] }, ctx, w);
  assert.equal(r.state, 'dropped');
});

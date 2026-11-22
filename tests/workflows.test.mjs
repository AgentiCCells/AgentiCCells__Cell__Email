// The three workflows end to end with made-up mail: a drafting agent writes an outbox entry
// with signed.json (sim/workflows/signed.mjs), and the page's own code (send.js's checks and
// decideEntry(), abp/cell-email C4) says whether the person's press may send it.
// Moved from sim/workflows/ into tests/ by email.dev.d@AgentiCCells.dinis, 22 November 2026, so CI runs it.
// SIMULATION: the simulated twin, made-up mail, keys made fresh for each run; nothing committed.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { signPolicy } from '../cell/policy/signed.mjs';
import { messageOf } from '../src/app/send.js';
import { decideEntry, emptyTwin } from '../src/app/cell/decide.mjs';
import { keys, agents, policy, simTwin, pins } from './helpers.mjs';
import { writeEntry, checkEntry, saveEntry, laneEmail } from '../sim/workflows/signed.mjs';
import { fromTeamKeys, fromRegister } from '../sim/workflows/pins.mjs';
import * as F from '../sim/workflows/fixtures.mjs';

const D = 'drafter.email@AgentiCCells.dinis', O = 'person:owner';
const NOW = '2026-11-16T12:00:00Z';

function world() {
  const { signers, registry } = keys([D, O]);
  const pol = policy(), ag = agents();
  const signatures = {
    policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]),
    agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]),
  };
  return { signers, registry, approvers: pins(registry), pol, ag, signatures, chain: [] };
}
const write = (w, workflow, email, at = '2026-11-16T10:00:00Z', over = {}) => writeEntry({
  workflow, email, author: D, signer: w.signers[D], chain: w.chain, at,
  policy: w.pol, agents: w.ag, signatures: w.signatures, thread_id: F.THREADS[workflow], ...over,
});
const ctxOf = (w, over = {}) => ({ registry: w.registry, approvers: w.approvers, twin: simTwin(), now: NOW, ...over });

test('workflows: each one writes an entry the page passes to the person\'s press', async () => {
  const w = world();
  const cases = [['outreach', F.outreach(), 'wait for a person'], ['reply', F.reply(), 'send'], ['follow-up', F.followUp(), 'wait for a person']];
  let minute = 0;
  for (const [wf, email, action] of cases) {
    const x = write(w, wf, email, `2026-11-16T10:0${minute++}:00Z`);
    const r = await checkEntry(x, ctxOf(w));
    assert.deepEqual(r.page, [], `${wf}: page checks`);
    assert.equal(r.c4.ran, true, wf);
    assert.equal(r.c4.verdict, 'press', `${wf}: ${r.c4.reasons.join('; ')}`);
    assert.equal(r.c4.row.action_now, action, wf);
    assert.equal(r.sendable, true, wf);
    assert.equal(x.meta.status, 'draft');
    assert.equal(x.meta.workflow, wf);
    assert.equal(x.meta.action, x.hash);
  }
  assert.deepEqual(w.chain.map((e) => e.seq), [1, 2, 3]);
});

test('workflows: what the holds say for outreach and follow-up', async () => {
  const w = world();
  const o = await checkEntry(write(w, 'outreach', F.outreach()), ctxOf(w));
  assert.ok(o.c4.reasons.some((x) => /^first contact:/.test(x)), o.c4.reasons.join('; '));
  const f = await checkEntry(write(w, 'follow-up', F.followUp(), '2026-11-16T10:01:00Z'), ctxOf(w));
  assert.ok(f.c4.reasons.some((x) => /^first contact: kim@example.com/.test(x)), f.c4.reasons.join('; '));
});

test('workflows: the files on disk read back as the same email', async () => {
  const w = world();
  const x = write(w, 'reply', F.reply());
  const dir = saveEntry(mkdtempSync(join(tmpdir(), 'outbox-')), x);
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  const signed = JSON.parse(readFileSync(join(dir, 'signed.json'), 'utf8'));
  const r = await decideEntry(messageOf(meta, readFileSync(join(dir, 'body.txt'), 'utf8')), signed, ctxOf(w));
  assert.equal(r.verdict, 'press', r.reasons.join('; '));
  for (const k of ['registry', 'approvers']) assert.equal(signed[k], undefined, `signed.json carries no ${k}`);
});

test('workflows: refused when the entry is changed after signing', async () => {
  const changes = [(x) => { x.meta.to = ['jo@example.net']; }, (x) => { x.meta.subject = 'Re: changed'; }, (x) => { x.body += '\nP.S.'; }, (x) => { x.meta.cc = ['sam@example.com']; }];
  for (const change of changes) {
    const w = world();
    const x = write(w, 'outreach', F.outreach());
    assert.equal((await checkEntry(x, ctxOf(w))).c4.verdict, 'press', 'unchanged');
    change(x);
    const r = await checkEntry(x, ctxOf(w));
    assert.equal(r.c4.verdict, 'refuse');
    assert.match(r.c4.reasons[0], /not one that an agent proposed and signed/);
  }
});

test('workflows: refused by the page as it is today (no lane keys or approvers pinned)', async () => {
  const w = world();
  const x = write(w, 'outreach', F.outreach());
  const r = await checkEntry(x, ctxOf(w, { registry: {}, approvers: {}, twin: emptyTwin('owner@example.org') }));
  assert.equal(r.c4.verdict, 'refuse');
  assert.equal(r.sendable, false);
});

test('workflows: with the page\'s empty twin, outreach passes and replies are refused', async () => {
  const w = world();
  const twin = emptyTwin('owner@example.org');
  assert.equal((await checkEntry(write(w, 'outreach', F.outreach()), ctxOf(w, { twin }))).c4.verdict, 'press');
  const rep = await checkEntry(write(w, 'reply', F.reply(), '2026-11-16T10:01:00Z'), ctxOf(w, { twin }));
  assert.equal(rep.c4.verdict, 'refuse');
  assert.ok(rep.c4.reasons.some((x) => /not a message in the twin/.test(x)));
});

test('workflows: the writer refuses what the page would show differently or what the workflow forbids', () => {
  const w = world();
  assert.throws(() => laneEmail({ ...F.outreach(), subject: ' padded ' }), /trims/);
  assert.throws(() => laneEmail({ ...F.outreach(), bcc: ['x@example.com'] }), /Bcc/);
  assert.throws(() => write(w, 'reply', { ...F.reply(), in_reply_to: undefined }), /needs in_reply_to/);
  assert.throws(() => write(w, 'outreach', { ...F.outreach(), in_reply_to: 'm-0001' }), /answers nothing/);
  assert.throws(() => write(w, 'newsletter', F.outreach()), /unknown workflow/);
  assert.throws(() => write(w, 'outreach', F.outreach(), undefined, { signatures: {} }), /signatures/);
  assert.equal(w.chain.length, 0, 'nothing appended when the writer refuses');
});

test('workflows: a second entry carries the whole chain, and both still pass', async () => {
  const w = world();
  const a = write(w, 'outreach', F.outreach());
  const b = write(w, 'follow-up', F.followUp(), '2026-11-16T10:01:00Z');
  assert.equal(a.signed.chains[0].length, 1);
  assert.equal(b.signed.chains[0].length, 2);
  for (const x of [a, b]) assert.equal((await checkEntry(x, ctxOf(w))).c4.verdict, 'press');
});

test('pins: either source gives decideEntry the same answer', async () => {
  const w = world();
  const x = write(w, 'outreach', F.outreach());
  const entries = [{ agent: D, lane_key: w.registry[D] }, { agent: O, lane_key: w.registry[O] }];
  const a = await fromTeamKeys(entries, { approvers: [O] });
  const register = { [O]: w.registry[O] };
  const b = await fromRegister([{ agent: D, lane_key: w.registry[D] }], [O], async (id) => register[id] || null);
  assert.deepEqual(a, b);
  assert.deepEqual(a.approvers, w.approvers);
  for (const src of [a, b]) assert.equal((await checkEntry(x, ctxOf(w, src))).c4.verdict, 'press');
  await assert.rejects(() => fromRegister(entries, ['person:nobody'], async () => null), /no lane key/);
  const other = keys([O]).registry[O];
  await assert.rejects(() => fromRegister(entries, [O], async () => other), /different key/);
});

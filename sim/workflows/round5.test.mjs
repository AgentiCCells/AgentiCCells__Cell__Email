// The level-2 machines driven by the real code on made-up mail: the firewall's verdicts, the
// follow-up timer, archive and Undo, and the vault-opening paths. PROPOSAL for tests/
// (email.dev.d's). SIMULATION. By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clean } from '../../src/app/cell/clean.mjs';
import { check } from '../../src/app/cell/checker.mjs';
import { scanText } from '../../src/app/cell/shapes.mjs';
import { labelChange } from '../../src/app/mailparse.js';
import { signPolicy } from '../../cell/policy/signed.mjs';
import { keys, agents, policy, simTwin, pins } from '../../tests/helpers.mjs';
import { byId, run, checkMachines } from './machines.mjs';
import { dueFollowUps } from './followups.mjs';
import { writeEntry, checkEntry } from './signed.mjs';

const NOW = '2026-11-16T12:00:00Z';
const D = 'drafter.email@AgentiCCells.dinis', O = 'person:owner';

test('level 2: the machines are well formed', () => assert.deepEqual(checkMachines(), []));

test('firewall-clean: each made-up message ends where clean() puts it, and hostile mail gets no agent reply', () => {
  const m = byId('firewall-clean'), twin = simTwin(), ends = {};
  for (const msg of twin.messages.values()) {
    if (msg.direction !== 'inbound') continue;
    const v = clean(msg).verdict;
    const r = run(m, ['clean()', `verdict ${v}`]);
    assert.equal(r.state, v, msg.id);
    (ends[v] ||= []).push(msg.id);
  }
  assert.deepEqual(ends.hostile.sort(), ['m-0006', 'm-0010']);
  const reply = { in_reply_to: 'm-0010', to: ['pat@example.com'], cc: [], bcc: [], language: 'en', attachments: [], subject: 'Re: Quick favour', text: 'Hi Pat,\n\nI will look at this and come back to you.\n\nBest regards,\nAlex', author: D, kind: 'reply', at: NOW };
  const r = check(reply, { policy: policy(), twin, outbox: [], stopped: false, now: NOW, scanText });
  assert.ok(r.reasons.some((x) => x.rule === 'firewall' && x.level === 'deny'), JSON.stringify(r.reasons));
});

test('follow-up-timer: on the made-up twin, only the thread to Kim is due, and its follow-up passes to the press', async () => {
  const due = dueFollowUps(simTwin(), NOW, 5);
  assert.deepEqual(due.map((d) => [d.thread, d.message, d.to[0], d.waited_days]), [['t-0006', 'm-0009', 'kim@example.com', 6]]);
  assert.deepEqual(dueFollowUps(simTwin(), NOW, 7), [], 'not yet due at seven days');
  const m = byId('follow-up-timer');
  assert.equal(run(m, ['N days, no answer', 'draft the follow-up']).state, 'drafted');
  const { signers, registry } = keys([D, O]);
  const pol = policy(), ag = agents();
  const d = due[0];
  const email = { in_reply_to: d.message, to: d.to, cc: [], bcc: [], language: 'en', attachments: [], subject: `Re: ${d.subject}`,
    text: 'Hello Kim,\n\nI am following up on my email of 10 November. Would a short call next week suit you?\n\nKind regards,\nAlex',
    template: { id: 'followup-en', slots: { subject: d.subject, name: 'Kim', date: '10 November', signer: 'Alex', message: 'Would a short call next week suit you?' } } };
  const x = writeEntry({ workflow: 'follow-up', email, author: D, signer: signers[D], chain: [], at: '2026-11-16T11:00:00Z', policy: pol, agents: ag,
    signatures: { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) } });
  const c = await checkEntry(x, { registry, approvers: pins(registry), twin: simTwin(), now: NOW });
  assert.equal(c.c4.verdict, 'press', c.c4.reasons.join('; '));
});

test('label-archive: archive then Undo puts the conversation back; nothing deletes for good', () => {
  const apply = (labels, ch) => new Set([...[...labels].filter((l) => !ch.removeLabelIds.includes(l)), ...ch.addLabelIds]);
  const m = byId('label-archive');
  let labels = new Set(['INBOX', 'UNREAD']);
  labels = apply(labels, labelChange('archive'));
  assert.ok(!labels.has('INBOX'));
  assert.equal(run(m, ['archive or bin']).state, 'moved');
  labels = apply(labels, labelChange('inbox'));
  assert.ok(labels.has('INBOX'));
  assert.equal(run(m, ['archive or bin', 'press Undo']).state, 'undone');
  for (const kind of ['archive', 'inbox', 'read', 'unread', 'star', 'unstar']) assert.ok(!JSON.stringify(labelChange(kind)).includes('TRASH'), kind);
  assert.ok(!m.moves.some((x) => /delete/i.test(x.on)), 'no move deletes for good');
});

test('open-vault: the paths the page takes, as the browser runs showed them', () => {
  const m = byId('open-vault');
  assert.equal(run(m, ['twin key kept, or token kept and a twin made', 'outbox key kept: open and list']).state, 'outbox_open');
  assert.equal(run(m, ['twin key kept, or token kept and a twin made', 'no outbox key']).state, 'twin_only');
  assert.equal(run(m, ['no key and no token']).state, 'nothing');
});

// How a drafting agent writes an outbox entry that carries its signed proposal (signed.json).
// PROPOSAL and SIMULATION: by email.workflows.d@AgentiCCells.dinis, 22 November 2026, scope
// approved by conductor.d@AgentiCCells.dinis at 04:04 UTC. Used with made-up mail only
// (sim/workflows/fixtures.mjs); no agent signs real outbox entries yet. Apache-2.0.
//
// An outbox entry is a folder in the outbox vault. The page (src/app/connect.js) reads:
//   meta.json    { to, cc, subject, status, in_reply_to, thread_id, ... } (src/app/send.js, messageOf)
//   body.txt     the exact text
//   signed.json  { chains, policy, agents, signatures } (src/app/cell/decide.mjs, decideEntry)
// The page sends only when the email it shows from meta.json and body.txt is exactly the one
// the agent signed on its actions lane, so this writer makes all three files from one email.
//
// What the agent needs: its own Ed25519 lane key (proposal: published in its team/keys entry),
// its whole chain on the actions lane (seq 1 onwards, so the page can verify prev links), and the
// two policy files with the signatures a pinned approver made. It never writes keys, the
// registry or approvers into the entry: the page ignores them and takes its own.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { append, entryHash } from '../../cell/lanes/entry.mjs';
import { messageOf, problems } from '../../src/app/send.js';
import { decideEntry } from '../../src/app/cell/decide.mjs';

// The three workflows (docs/plan/workflows.md) and the lane entry each one writes.
export const WORKFLOWS = {
  outreach: { type: 'propose.send', about: 'a first email to someone, drafted by an agent, approved by a person' },
  reply: { type: 'propose.reply', about: 'an answer to a message in the twin' },
  'follow-up': { type: 'propose.reply', about: 'a reply to our own unanswered email, in the same thread' },
};

const list = (v) => (Array.isArray(v) ? v.map(String) : []);

// The email as it goes on the lane: arrays for recipients, the exact subject and text.
// Refuses what the page would show differently from what was signed.
export function laneEmail(email) {
  const e = { ...email, to: list(email.to), cc: list(email.cc), bcc: list(email.bcc), subject: String(email.subject ?? ''), text: String(email.text ?? '') };
  const out = [];
  if (e.subject !== e.subject.trim()) out.push('the subject starts or ends with a space, which the page trims');
  if (e.to.some((a) => a !== a.trim()) || e.cc.some((a) => a !== a.trim())) out.push('an address has spaces around it, which the page trims');
  if (e.bcc.length) out.push('Bcc is never sent by the page');
  if (out.length) throw new Error(`laneEmail: ${out.join('; ')}`);
  return e;
}

// Write one outbox entry. Appends the proposal to the agent's actions chain (in place) and
// returns { folder, meta, body, signed, entry, hash }.
// opts: { workflow, email, author, signer: { keyId, privateKey }, chain, at, policy, agents,
//         signatures: { policy, agents }, client_ref, thread_id, folder }
export function writeEntry(opts) {
  const wf = WORKFLOWS[opts.workflow];
  if (!wf) throw new Error(`writeEntry: unknown workflow ${opts.workflow}`);
  const email = laneEmail(opts.email);
  if (wf.type === 'propose.reply' && !email.in_reply_to) throw new Error(`writeEntry: a ${opts.workflow} needs in_reply_to`);
  if (wf.type === 'propose.send' && email.in_reply_to) throw new Error('writeEntry: an outreach email answers nothing; use reply or follow-up');
  if (!opts.policy || !opts.agents || !opts.signatures?.policy || !opts.signatures?.agents) throw new Error('writeEntry: both policy files and their signatures are needed');
  const chain = opts.chain || [];
  if (chain.some((e) => e.author !== opts.author || e.lane !== 'actions')) throw new Error('writeEntry: the chain must be this author\'s actions lane');
  const body = { email };
  if (opts.client_ref) body.client_ref = String(opts.client_ref);
  const entry = append(chain, { lane: 'actions', author: opts.author, type: wf.type, body, at: opts.at }, opts.signer);
  const hash = entryHash(entry);
  const meta = {
    to: email.to, cc: email.cc, subject: email.subject, status: 'draft',
    workflow: opts.workflow, proposed_by: opts.author, proposed_at: entry.at, action: hash,
  };
  if (email.language) meta.language = email.language;
  if (email.in_reply_to) meta.in_reply_to = email.in_reply_to;
  if (opts.thread_id) meta.thread_id = opts.thread_id;
  if (email.template?.id) meta.template = email.template.id;
  if (opts.client_ref) meta.client_ref = String(opts.client_ref);
  const signed = { chains: [chain.map((e) => structuredClone(e))], policy: opts.policy, agents: opts.agents, signatures: opts.signatures };
  return { folder: opts.folder || `${entry.at.slice(0, 10)}-${opts.workflow}-${hash.slice(7, 15)}`, meta, body: email.text, signed, entry, hash };
}

// The drafting agent's own check before it writes: what the page will do with the entry.
// ctx is decideEntry's: { registry, approvers, twin, now, sent }. Returns
// { page: problems from send.js, c4: decideEntry's answer, sendable }.
export async function checkEntry(written, ctx, { sentToday = 0 } = {}) {
  const m = messageOf(written.meta, written.body);
  const page = problems(m, { sentToday });
  const c4 = await decideEntry(m, written.signed, ctx);
  return { page, c4, sendable: !page.length && c4.verdict === 'press' };
}

// Write the entry's three files into a folder (a temporary outbox in tests; never the repository).
export function saveEntry(outboxDir, written) {
  const dir = join(outboxDir, written.folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(written.meta, null, 2) + '\n');
  writeFileSync(join(dir, 'body.txt'), written.body);
  writeFileSync(join(dir, 'signed.json'), JSON.stringify(written.signed, null, 2) + '\n');
  return dir;
}

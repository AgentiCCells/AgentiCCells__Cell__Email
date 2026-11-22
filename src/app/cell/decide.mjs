// The gateway's decision in the browser: abp/cell-email C4, run by the page before Approve and
// send. A port of cell/gateway/decide.mjs onto WebCrypto (src/app/cell/lanes.mjs), with the same
// email policy checker (src/app/cell/checker.mjs) and the page's data-loss scanner
// (src/app/cell/shapes.mjs). It sends nothing and calls no service: the page passes in what it
// read from the outbox vault, and the keys and approvers it holds.
// Status: built and tested with fixtures only (tests/decide-page.test.mjs); no agent signs
// outbox entries yet, so on a real outbox every entry takes the person's-press path (ABP 1.1.4).
// By cell.email.d@AgentiCCells.dinis, 2026-11-22. Apache-2.0.
import { check } from './checker.mjs';
import { scanText } from './shapes.mjs';
import { entryHash, gatewayStopped, isVerifiedMerge, mergeLanes, verifyPolicy } from './lanes.mjs';

// decide(merged, ctx): as cell/gateway/decide.mjs. merged comes from lanes.mjs's mergeLanes.
// ctx: { policy, agents, registry, approvers, signatures: { policy, agents }, twin, now,
//        sent: [{ at, author, to }] sends the page already records (the outbox vault's meta.json) }.
export async function decide(merged, ctx) {
  if (!isVerifiedMerge(merged)) throw new Error('decide: the lanes were not verified by mergeLanes with the agents file; nothing may be sent');
  const policyProblems = [
    ...(await verifyPolicy(ctx.policy, ctx.signatures?.policy, { name: 'email-policy.json', registry: ctx.registry, approvers: ctx.approvers })),
    ...(await verifyPolicy(ctx.agents, ctx.signatures?.agents, { name: 'agents.json', registry: ctx.registry, approvers: ctx.approvers })),
  ];
  const order = merged.order;
  const hash = (e) => merged.hashes.get(e);
  const stopped = gatewayStopped(order);
  const personReads = new Set(order.filter((e) => e.lane === 'reads' && e.author.startsWith('person:')).map((e) => e.body.message));
  const done = new Set(order.filter((e) => e.lane === 'outbox').flatMap((e) => e.refs.map((r) => r.hash)));
  const withdrawn = new Set(order.filter((e) => e.type === 'withdraw').flatMap((e) => e.refs.map((r) => r.hash)));
  const outbox = [
    ...order.filter((e) => e.lane === 'outbox' && e.type === 'sent').map((e) => ({ at: e.at, author: e.body.proposed_by, to: e.body.to || [] })),
    ...(ctx.sent || []),
  ];
  const rows = [];
  for (const a of order.filter((e) => e.lane === 'actions' && (e.type === 'propose.reply' || e.type === 'propose.send'))) {
    const h = hash(a) || (await entryHash(a));
    if (done.has(h) || withdrawn.has(h)) continue;
    const approvals = order.filter((e) => e.lane === 'approvals' && e.refs.some((r) => r.hash === h));
    const rejected = approvals.some((e) => e.type === 'reject');
    const approved = approvals.find((e) => e.type === 'approve');
    const proposal = { ...a.body.email, author: a.author, kind: a.type === 'propose.reply' ? 'reply' : 'send', at: ctx.now };
    const result = check(proposal, { ...ctx, outbox, stopped, person_reads: personReads, scanText: ctx.scanText || scanText });
    for (const p of policyProblems) result.reasons.push({ level: 'deny', rule: 'signed policy', detail: p });
    if (policyProblems.length) result.decision = 'deny';
    let action;
    if (rejected) action = 'drop';
    else if (result.decision === 'deny') action = 'refuse';
    else if (result.decision === 'allow' || approved) action = 'send';
    else action = 'wait for a person';
    const clientRef = typeof a.body.client_ref === 'string' ? a.body.client_ref : null;
    rows.push({ action: h, client_ref: clientRef, by: a.author, approved_by: approved?.author || null, action_now: action, policy: result, email: a.body.email });
  }
  return { stopped, policy_problems: policyProblems, rows };
}

// A twin that knows nothing: every recipient is a first contact and no reply finds its parent,
// so the checker holds or refuses. Used when the page has no twin loaded (fail closed).
export function emptyTwin(address = '') {
  return { mailbox: { address, sync: {} }, messages: new Map(), threads: new Map(), clean: new Map(), correspondents: { correspondents: {} } };
}

const list = (v) => (Array.isArray(v) ? v : []).map(String);
// The parts of an email that must be exactly what the agent signed.
const shape = (x) => JSON.stringify({ to: list(x?.to), cc: list(x?.cc), bcc: list(x?.bcc), subject: String(x?.subject ?? ''), text: String(x?.text ?? '') });

// The page's question for one outbox entry: may the person's press send it?
// message: what the page shows and would send ({ to, cc, bcc, subject, text }, from send.js's messageOf).
// evidence: what the entry carries beside meta.json, or null:
//   { chains: [lane chains], policy, agents, signatures: { policy, agents } }.
// ctx: { registry: { author: Ed25519 public key PEM }, approvers: { author: keyId }, twin, now, sent }.
// The registry and approvers must come from outside the outbox vault (the person pins them);
// anything the vault carries about keys is ignored.
// Returns { ran, verdict, reasons, row }:
//   ran false    the entry carries no signed proposal; sending rests on the person's press
//                and the page's own checks (ABP 1.1.4, C4). Nothing about it was verified.
//   verdict 'refuse'  C4 refuses it: the page must not send it, whatever the person presses.
//   verdict 'press'   C4 passes; the person's press of Approve and send is the approval.
export async function decideEntry(message, evidence, ctx) {
  if (!evidence) return { ran: false, verdict: 'press', reasons: ['this entry carries no signed proposal, so the full check did not run; sending rests on your press and the page\'s checks'], row: null };
  const refuse = (reasons, row = null) => ({ ran: true, verdict: 'refuse', reasons, row });
  if (!Array.isArray(evidence.chains) || !evidence.chains.every(Array.isArray)) return refuse(['the signed lanes are not readable']);
  if (!evidence.policy || !evidence.agents) return refuse(['the policy files are missing']);
  const registry = ctx.registry || {}, approvers = ctx.approvers || {};
  let merged;
  try { merged = await mergeLanes(evidence.chains, registry, evidence.agents, approvers); } catch (e) { return refuse([`the signed lanes could not be checked: ${e.message}`]); }
  if (!merged.ok) return refuse(merged.errors.length ? [...merged.errors] : ['the lanes were not verified']);
  let result;
  try {
    result = await decide(merged, { policy: evidence.policy, agents: evidence.agents, signatures: evidence.signatures || {}, registry, approvers, twin: ctx.twin || emptyTwin(), now: ctx.now || new Date().toISOString(), sent: ctx.sent || [] });
  } catch (e) { return refuse([`the check could not run: ${e.message}`]); }
  const want = shape(message);
  const rows = result.rows.filter((r) => shape(r.email) === want);
  if (!rows.length) return refuse(['the email shown is not one that an agent proposed and signed on the lanes (or it was already sent or withdrawn)']);
  if (rows.length > 1) return refuse(['more than one signed proposal matches this email; the page sends only one']);
  const row = rows[0];
  const detail = row.policy.reasons.map((x) => `${x.rule}: ${x.detail}`);
  if (row.action_now === 'drop') return refuse(['a person rejected this proposal on the approvals lane'], row);
  if (row.action_now === 'refuse') return refuse(detail.length ? detail : ['the email policy refuses it'], row);
  const why = row.action_now === 'send' ? (row.approved_by ? [`approved on the lanes by ${row.approved_by}`] : [`allowed by the signed automation ${row.policy.automation}`]) : detail;
  return { ran: true, verdict: 'press', reasons: why, row };
}

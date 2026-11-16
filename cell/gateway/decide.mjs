// The gateway's decision, without Gmail: given the merged lanes, the twin and the email
// policy, which proposed emails may go out now, which wait for a person, and which are
// refused. It sends nothing. The part that calls Gmail is not built: it needs the Google
// OAuth app (docs/plan/needs.md).
import { check } from '../policy/checker.mjs';
import { entryHash, gatewayStopped } from '../lanes/entry.mjs';

// order: mergeLanes(...).order. Returns one row per proposal not yet in the outbox.
export function decide(order, ctx) {
  const stopped = gatewayStopped(order);
  const done = new Set(order.filter((e) => e.lane === 'outbox').flatMap((e) => e.refs.map((r) => r.hash)));
  const withdrawn = new Set(order.filter((e) => e.type === 'withdraw').flatMap((e) => e.refs.map((r) => r.hash)));
  const outbox = order.filter((e) => e.lane === 'outbox' && e.type === 'sent').map((e) => ({ at: e.at, author: e.body.proposed_by, to: e.body.to || [] }));
  const rows = [];
  for (const a of order.filter((e) => e.lane === 'actions' && (e.type === 'propose.reply' || e.type === 'propose.send'))) {
    const h = entryHash(a);
    if (done.has(h) || withdrawn.has(h)) continue;
    const approvals = order.filter((e) => e.lane === 'approvals' && e.refs.some((r) => r.hash === h));
    const rejected = approvals.some((e) => e.type === 'reject');
    const approved = approvals.find((e) => e.type === 'approve');
    const proposal = { ...a.body.email, author: a.author, kind: a.type === 'propose.reply' ? 'reply' : 'send', at: ctx.now };
    const result = check(proposal, { ...ctx, outbox, stopped });
    let action;
    if (rejected) action = 'drop';
    else if (result.decision === 'deny') action = 'refuse';
    else if (result.decision === 'allow' || approved) action = 'send';
    else action = 'wait for a person';
    // client_ref: an opaque string a client (the CRM: its draft id) puts on a proposal; the
    // gateway copies it into the outbox entry so the client can match the result.
    const clientRef = typeof a.body.client_ref === 'string' ? a.body.client_ref : null;
    rows.push({ action: h, client_ref: clientRef, by: a.author, approved_by: approved?.author || null, action_now: action, policy: result });
  }
  return { stopped, rows };
}

// The follow-up timer: which threads are waiting on the other side. PROPOSAL and SIMULATION, by
// email.workflows.d@AgentiCCells.dinis, 22 November 2026, for the follow-up workflow (feature 8,
// "no reply in five days"). Reads the twin only; writes nothing and sends nothing. Apache-2.0.
//
// A thread is due when its last message is ours (outbound), at least `days` days old at `now`,
// and nobody wrote after it. Threads whose last message is theirs are waiting on us (a reply,
// not a follow-up). Who sets `days` is a question for Dinis (docs/plan/workflows.md).
export function dueFollowUps(twin, now, days = 5) {
  const byThread = new Map();
  for (const m of twin.messages.values()) {
    const list = byThread.get(m.thread) || [];
    list.push(m); byThread.set(m.thread, list);
  }
  const cutoff = Date.parse(now) - days * 86400e3;
  const out = [];
  for (const [thread, list] of byThread) {
    list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const last = list[list.length - 1];
    if (last.direction !== 'outbound') continue;
    if (Date.parse(last.date) > cutoff) continue;
    out.push({ thread, message: last.id, to: last.to.map((x) => x.address), subject: last.subject, sent: last.date, waited_days: Math.floor((Date.parse(now) - Date.parse(last.date)) / 86400e3) });
  }
  return out.sort((a, b) => a.sent.localeCompare(b.sent));
}

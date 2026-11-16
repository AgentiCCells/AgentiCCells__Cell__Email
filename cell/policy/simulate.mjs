// The policy simulator, first cut: run a policy over the outbound mail already in the
// twin, as if each email were proposed again today by a given author, and count what it
// would have allowed, held or denied. Usage:
//   node cell/policy/simulate.mjs <twin-dir> <policy.json> [author]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadTwin } from '../twin/schema.mjs';
import { check } from './checker.mjs';

export function simulate(twin, policy, author) {
  const rows = [];
  const outbound = [...twin.messages.values()].filter((m) => m.direction === 'outbound').sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  for (const m of outbound) {
    // The twin as it was just before this email: only earlier messages count as correspondence.
    const before = [...twin.messages.values()].filter((x) => Date.parse(x.date) < Date.parse(m.date));
    const correspondents = { correspondents: {} };
    for (const x of before) if (x.direction === 'inbound') {
      const k = x.from.address.toLowerCase();
      (correspondents.correspondents[k] ||= { inbound: 0 }).inbound++;
    }
    const parent = m.headers.in_reply_to ? before.find((x) => x.headers.message_id === m.headers.in_reply_to) : null;
    const proposal = {
      author, kind: parent ? 'reply' : 'send', in_reply_to: parent?.id || null,
      to: m.to.map((p) => p.address), cc: m.cc.map((p) => p.address), bcc: m.bcc.map((p) => p.address),
      subject: m.subject, text: m.body.text, language: m.language, attachments: [], at: m.date,
    };
    const r = check(proposal, { policy, twin: { ...twin, correspondents }, outbox: [] });
    rows.push({ id: m.id, decision: r.decision, reasons: r.reasons.map((x) => `${x.level} ${x.rule}: ${x.detail}`) });
  }
  const counts = { allow: 0, hold: 0, deny: 0 };
  for (const r of rows) counts[r.decision]++;
  return { counts, rows };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, policyPath, author = 'person:assistant'] = process.argv.slice(2);
  const twin = loadTwin(dir);
  const out = simulate(twin, JSON.parse(readFileSync(policyPath, 'utf8')), author);
  for (const r of out.rows) console.log(`${r.id} ${r.decision}${r.reasons.length ? '\n  ' + r.reasons.join('\n  ') : ''}`);
  console.log(`SIMULATION: allow ${out.counts.allow}, hold ${out.counts.hold}, deny ${out.counts.deny}`);
}

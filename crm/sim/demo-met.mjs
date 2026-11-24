// Made-up "where we met" for the people in the CRM's own demo bundle (crm/site/demo/twin.json), so the demo shows it
// (a.crm.design, 24 Nov 2026). Only the CRM's bundle changes, never the shared twin vault. Deterministic: the same
// value for the same person id every run. By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
//   node crm/sim/demo-met.mjs crm/site/demo/twin.json
import { readFileSync, writeFileSync } from 'node:fs';
const PLACES = ['Web Summit 2026', 'an introduction from a friend', 'our website', 'a meetup in Lisbon', 'a conference talk', 'LinkedIn', null];
const file = process.argv[2]; if (!file) { console.error('use: node crm/sim/demo-met.mjs <bundle.json>'); process.exit(2); }
const b = JSON.parse(readFileSync(file, 'utf8'));
if (!b.synthetic) { console.error('refusing: not a synthetic bundle'); process.exit(1); }
let n = 0;
for (const [p, text] of Object.entries(b.files)) {
  if (!/^people\/[^/]+\.json$/.test(p)) continue;
  const o = JSON.parse(text), h = [...o.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), met = PLACES[h % PLACES.length];
  if (met) { o.met = met; n++; } else delete o.met;
  b.files[p] = JSON.stringify(o, null, 2) + '\n';
}
writeFileSync(file, JSON.stringify(b) + '\n');
console.log(`met set on ${n} people`);

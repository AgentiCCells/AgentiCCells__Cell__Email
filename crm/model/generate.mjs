// The CRM's synthetic records for a demo twin: crm/stages.json, crm/leads/, crm/links/. Deterministic
// from the twin's seed (read from its manifest) and its generated_at; writes nothing outside crm/.
// Everything it writes is marked synthetic. By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { STAGES, DAY } from './crm.mjs';

// mulberry32, the same small generator the shared demo twin uses (src/app/demo/mailbox.js on
// work/mail.dev.a); offset so the CRM's choices do not mirror the mail generator's.
function rng(seed) {
  let a = (seed ^ 0x43524d) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

export const DEMO_OWNERS = ['demo-owner-1', 'demo-owner-2', 'demo-owner-3'];
// Plausible stages by kind of company; the generator picks among them.
const BY_KIND = {
  investor: ['contacted', 'talking', 'proposal'],
  event: ['contacted', 'talking', 'won'],
  prospect: ['new', 'contacted', 'talking', 'proposal'],
  community: ['contacted', 'talking', 'parked'],
  customer: ['won', 'talking'],
  partner: ['talking', 'proposal'],
};
const NEXT = {
  new: ['Send the first email', 'Find the right person'],
  contacted: ['Follow up on the first email', 'Book a call'],
  talking: ['Send notes from the call', 'Book the demo', 'Agree dates'],
  proposal: ['Send the proposal', 'Answer questions on the proposal'],
  won: ['Check in after the first month', 'Ask for feedback'],
  parked: ['Look again next quarter'],
};

// orgs, people, threads: as in the twin. Returns { path: object } for crm/ only.
export function crmFiles({ seed, generatedAt, orgs, people, threads }) {
  const r = rng(seed);
  const now = Date.parse(generatedAt);
  const files = { 'crm/stages.json': { schema: 'crm.stages/1', synthetic: true, stages: STAGES } };
  for (const o of orgs) {
    const stage = pick(r, BY_KIND[o.kind] || ['new']);
    const due = new Date(now + Math.round(-4 + r() * 18) * DAY).toISOString().slice(0, 10);
    files[`crm/leads/${o.id}.json`] = {
      schema: 'crm.lead/1', synthetic: true, org: o.id, stage, owner: pick(r, DEMO_OWNERS),
      next_step: pick(r, NEXT[stage]), next_step_due: due,
      updated_at: new Date(now - Math.round(r() * 10) * DAY).toISOString().replace(/\.\d+Z$/, 'Z'),
    };
  }
  // Link most threads to their company; leave every fourth unlinked so the page shows how a thread is
  // matched by person or domain, and how a person links it by hand.
  const person = new Map(people.map((p) => [p.id, p]));
  [...threads].sort((a, b) => a.id.localeCompare(b.id)).forEach((t, i) => {
    const p = person.get(t.person);
    if (!p || i % 4 === 3) return;
    files[`crm/links/${t.id}.json`] = { schema: 'crm.link/1', synthetic: true, thread: t.id, org: p.org, person: p.id, linked_by: pick(r, DEMO_OWNERS) };
  });
  return files;
}

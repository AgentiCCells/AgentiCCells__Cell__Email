// Made-up site owners for the hot list in the CRM's own demo bundle (crm/site/demo/twin.json): four fictional owners, one
// at each onboarding stage, on reserved example domains, marked synthetic and '(demo)'. Only the CRM's bundle changes,
// never the shared twin vault. Deterministic: the times hang off the bundle's generated_at. Re-running replaces them.
// By cl-2.crm.dev@SovereignWebsite.dinis, 2026-11-26. Apache-2.0.
//   node crm/sim/demo-hot.mjs crm/site/demo/twin.json
import { readFileSync, writeFileSync } from 'node:fs';
import { readVault, checkCrm, onboardingFile, DAY } from '../model/crm.mjs';
const file = process.argv[2]; if (!file) { console.error('use: node crm/sim/demo-hot.mjs <bundle.json>'); process.exit(2); }
const b = JSON.parse(readFileSync(file, 'utf8'));
if (!b.synthetic) { console.error('refusing: not a synthetic bundle'); process.exit(1); }
for (const p of Object.keys(b.files)) if (/^(orgs|people)\/so-|^crm\/onboarding\//.test(p)) delete b.files[p];
const now = Date.parse(JSON.parse(b.files['manifest.json']).generated_at);
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const OWNERS = [
  // case id, owner, site, kind of site, steps: [stage, days ago], next step, due in days (null: none)
  ['demo-0001', 'Rowan Example', 'Rowan Ceramics (demo)', 'artist', [['invited', 8], ['qr-sent', 6]], 'Ask whether the QR code opened their vault', -1],
  ['demo-0002', 'Sam Example', 'Sam\'s Market Stall (demo)', 'trader', [['qr-sent', 9], ['uploads-in', 2]], 'Tell the keeper the photos are in', 1],
  ['demo-0003', 'Jo Example', 'The Jo Example Trio (demo)', 'musician', [['qr-sent', 14], ['uploads-in', 8], ['consent-recorded', 7], ['designs-ready', 3]], 'Show Jo the designs on a call', 2],
  ['demo-0004', 'Alex Example', 'The Example Rooms (demo)', 'venue', [['qr-sent', 20], ['uploads-in', 15], ['design-picked', 12], ['live', 10], ['editing', 4]], 'Check their text edits went live', null],
  ['demo-0005', 'Lee Example', 'Lee Example Studio (demo)', 'artist', [['qr-sent', 12], ['uploads-in', 9], ['design-picked', 5], ['live', 1]], 'Tell Lee the site is live', 0],
  ['demo-0006', 'Kim Example', 'Kim Example Club (demo)', 'club', [['qr-sent', 30], ['paused', 21]], 'Paused until after the holidays', null],
];
const orgId = (c) => 'so-' + c.slice(5);
for (const [c, name, site, kind] of OWNERS) {
  const id = orgId(c), dom = `${id}.example.org`;
  b.files[`orgs/${id}.json`] = JSON.stringify({ schema: 'crm.org/1', id, name: site, domain: dom, kind: 'customer', site_type: kind, synthetic: true }, null, 2) + '\n';
  b.files[`people/${id}-p.json`] = JSON.stringify({ id: `${id}-p`, name, emails: [`owner@${dom}`], org: id, role: 'Site owner', synthetic: true }, null, 2) + '\n';
}
for (const [c, , , , steps, next, due] of OWNERS) {
  steps.forEach(([stage, ago], i) => {
    const last = i === steps.length - 1;
    const [f] = onboardingFile(readVault(b.files), c, { stage, org: orgId(c), person: `${orgId(c)}-p`, by: 'Owner A', at: iso(now - ago * DAY),
      ...(last ? { next_step: next, next_step_due: due == null ? '' : iso(now + due * DAY).slice(0, 10) } : {}) });
    b.files[f.path] = JSON.stringify({ ...f.record, synthetic: true }, null, 2) + '\n';
  });
}
const errors = checkCrm(readVault(b.files));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
writeFileSync(file, JSON.stringify(b) + '\n');
console.log(`hot list: ${OWNERS.length} made-up site owners`);

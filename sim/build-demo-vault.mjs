// Write the shared demo twin (src/app/demo/mailbox.js) as plain files for a public vault: the synthetic
// twin's data, the same way the AWS programme published its twin. Everything is generated from the
// fixed seed, at reserved example domains; no real mail, contact or token is ever written here.
// Use: node sim/build-demo-vault.mjs [out-folder]   (default _sim/demo-vault/, ignored by git)
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { demoMailbox, DEMO_SEED } from '../src/app/demo/mailbox.js';
import { messagePath, buildCorrespondents, syncFileName } from '../cell/twin/schema.mjs';
import { clean } from '../cell/firewall/clean.mjs';

// A fixed clock too, so the same seed always writes the same bytes.
export const DEMO_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

// The shared demo twin's layout (agreed shape proposed to a.crm.dev, 23 Nov 2026):
//   manifest.json, README.md
//   orgs/<id>.json      demo.org/1      people/<id>.json   demo.person/1
//   mail/               the Email Cell's twin format v1 (cell/twin/schema.mjs)
//   drafts/<person>.json  outbox-style drafts
//   crm/                not written here: a.crm.dev's generator owns it
export function demoVaultFiles({ seed = DEMO_SEED, now = DEMO_NOW, commit = '' } = {}) {
  const box = demoMailbox({ seed, now });
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  const at = new Date(now).toISOString().replace(/\.\d+Z$/, 'Z');
  const files = {
    'README.md': `# Demo twin (synthetic)\n\nEvery person, organisation, address and email here is made up, generated from seed ${seed} by sim/build-demo-vault.mjs in AgentiCCells__Cell__Email. Addresses are at reserved example domains (RFC 2606). Nothing here is real mail or a real contact.\n\nShared by the Email Cell's demo mode and the CRM demo. Layout: orgs/ and people/ (shared), mail/ (the Email Cell's twin format v1), drafts/, and crm/ (written by the CRM's own generator). Rebuild: node sim/build-demo-vault.mjs <folder>, with the same seed.\n\nText and data: CC BY 4.0.\n`,
    'manifest.json': json({ schema: 'demo.twin/1', synthetic: true, seed, generator: `AgentiCCells__Cell__Email sim/build-demo-vault.mjs${commit ? '@' + commit : ''}`, generated_at: at, counts: { orgs: box.orgs.length, people: box.people.length, threads: box.threads.length, messages: box.messages.length, drafts: box.drafts.length } }),
  };
  for (const o of box.orgs) files[`orgs/${o.id}.json`] = json({ schema: 'demo.org/1', synthetic: true, ...o });
  for (const p of box.people) files[`people/${p.id}.json`] = json({ schema: 'demo.person/1', synthetic: true, ...p });
  for (const d of box.drafts) { const { contact, ...rest } = d; files[`drafts/${contact}.json`] = json({ synthetic: true, person: contact, ...rest }); }
  files['mail/mailbox.json'] = json({ schema: 'twin.mailbox/1', simulated: true, address: box.me.address, name: box.me.name, source: { system: 'simulation' }, sync: { cursor: String(5000 + box.messages.length), synced_at: at, method: 'simulation' }, twin_schema: 'twin/1' });
  files['mail/labels.json'] = json({ schema: 'twin.labels/1', labels: box.labels });
  for (const m of box.messages) {
    files[`mail/raw/messages/${messagePath(m)}`] = json(m);
    files[`mail/clean/messages/${messagePath(m)}`] = json(clean(m));
  }
  for (const t of box.threads) files[`mail/threads/${t.id}.json`] = json(t);
  files['mail/index/correspondents.json'] = json(buildCorrespondents(box.messages, box.me.address));
  files[`mail/index/syncs/${syncFileName(at)}`] = json({ schema: 'twin.sync/1', cursor: String(5000 + box.messages.length), synced_at: at, added_messages: box.messages.map((m) => m.id), changed_threads: box.threads.map((t) => t.id).sort() });
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || '_sim/demo-vault';
  rmSync(out, { recursive: true, force: true });
  const commit = (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return ''; } })();
  const files = demoVaultFiles({ commit });
  for (const [p, text] of Object.entries(files)) { mkdirSync(join(out, p, '..'), { recursive: true }); writeFileSync(join(out, p), text); }
  console.log(`wrote ${Object.keys(files).length} files to ${out}`);
}

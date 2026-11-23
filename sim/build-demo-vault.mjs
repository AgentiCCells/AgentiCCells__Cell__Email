// Write the demo mailbox (src/app/demo/mailbox.js) as plain files for a public vault: the synthetic
// twin's data, the same way the AWS programme published its twin. Everything is generated from the
// fixed seed, at reserved example domains; no real mail, contact or token is ever written here.
// Use: node sim/build-demo-vault.mjs [out-folder]   (default _sim/demo-vault/, ignored by git)
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { demoMailbox, DEMO_SEED } from '../src/app/demo/mailbox.js';

// A fixed clock too, so the same seed always writes the same bytes.
export const DEMO_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

export function demoVaultFiles({ seed = DEMO_SEED, now = DEMO_NOW } = {}) {
  const box = demoMailbox({ seed, now });
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  const files = {
    'README.md': `# Demo mailbox (synthetic)\n\nEvery person, organisation, address and email here is made up, generated from seed ${seed} by src/app/demo/mailbox.js in AgentiCCells__Cell__Email. Addresses are at reserved example domains (RFC 2606). Nothing here is real mail.\n\nUsed by the Email Cell's demo mode (/app/send.html?demo). Text: CC BY 4.0.\n`,
    'mailbox.json': json({ synthetic: true, me: box.me, labels: box.labels, generated: box.generated, counts: { contacts: box.contacts.length, threads: box.threads.length, drafts: box.drafts.length } }),
  };
  for (const c of box.contacts) files[`contacts/${c.id}.json`] = json({ synthetic: true, ...c });
  for (const t of box.threads) files[`threads/${t.id}.json`] = json({ synthetic: true, ...t });
  for (const d of box.drafts) files[`drafts/${d.contact}.json`] = json({ synthetic: true, ...d });
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || '_sim/demo-vault';
  rmSync(out, { recursive: true, force: true });
  const files = demoVaultFiles();
  for (const [p, text] of Object.entries(files)) { mkdirSync(join(out, p, '..'), { recursive: true }); writeFileSync(join(out, p), text); }
  console.log(`wrote ${Object.keys(files).length} files to ${out}`);
}

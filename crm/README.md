# CRM tool site

A small CRM that keeps track of who you are talking to, built on your mail. It runs in your browser and keeps nothing on a server. It is meant to live at crm.tool.sovereignweb.site; until it has its own repository it lives here, on the branch `work/crm.dev.a`, and is not live anywhere yet.

## What it does today

- **Lead board**: one row per company, with its stage, owner, whether a draft is waiting or was sent, when you were last in touch and who wrote last, threads still waiting on a reply, and the next step with its due date. Filter by owner.
- **A company's page**: its people, its mail threads, its drafts, and the next step. "Draft waiting" opens the Email Cell's send screen on that draft.
- **Follow-ups**: threads where you wrote last and have had no reply for 5 days or more.
- **Contacts**: everyone, with their company and last contact.
- **Unlinked threads**: mail threads not yet tied to a company. Link one, and it shows under that company whatever addresses it holds.

## Try the demo first

The site opens in demo mode. Everything in it is made up: companies called "Example ... (demo)", people at reserved example domains, and their mail. The top bar says "Demo mode" and a banner says it is synthetic. In the demo, links you make stay in the tab; nothing is written anywhere.

To run it yourself:

```
node crm/scripts/build-site.mjs
cd crm/_build/site && python3 -m http.server
```

then open http://localhost:8000.

## Open your own vault

1. Press **Open your vault**.
2. Paste your **CRM vault key**. A read key is enough to look; to make links you need the vault key, which can write.
3. If your CRM vault keeps its records next to a separate mail twin, paste that vault's key too. The page tells you if one is missing or does not match.
4. To make links, add your **SG/Send access token**. You can also leave it out and give it when you write.
5. Tick **Remember** only on your own device. The keys are then kept sealed to a key this browser made and cannot export; otherwise they are gone when you close the tab.

The top bar then says "Your vault", and the banner names the vaults. **Back to the demo** closes them.

Your keys and your data stay in your browser. The page talks only to the vault service, dev.send.sgraph.ai.

## Making a link

Press **Link** on a thread. The page shows the exact file it will write and where. Only **Write it** writes: one file, one commit, to your own CRM vault, never to the mail twin. **Unlink** removes it the same way. The vault keeps both in its history.

## For developers

- `model/crm.mjs`: the CRM's records (`crm.stages/1`, `crm.lead/1`, `crm.link/1`), their checks, and what the pages show. The same code runs in Node and the browser. Draft state, last contact and follow-ups are worked out from the mail and drafts, never stored.
- `model/generate.mjs`, `sim/build-crm.mjs`: synthetic CRM records for the shared demo twin, from its seed. They write only `crm/`, and refuse a folder not marked synthetic.
- `site/`: the pages. `site/vault.js` reads and writes vaults through the Email Cell's pinned vault library; `site/demo/twin.json` is the demo bundle.
- `scripts/build-site.mjs`: builds the site into `crm/_build/site` (ignored by git), reusing the Email Cell's `src/app/pki.js` and `src/app/vendor/` unedited.
- Tests: `node --test crm/tests/crm.test.mjs`. `tests/browser-vault.cjs` and `tests/browser-link.cjs` drive Chromium against the vault service with synthetic vaults only; their keys come from files outside the repository.
- Rebuild the demo: build the twin with mail.dev.a's `sim/build-demo-vault.mjs` (branch `work/mail.dev.a`), then `node crm/sim/build-crm.mjs <folder> crm/site/demo/twin.json`. The current bundle comes from mail twin vault sub3og9j, generator 2cc074a, seed 20261123.
- The CRM's demo records also sit in vault egw210lk (synthetic), which points at the mail twin by id. Keys are never in this repository.
- `iac/`: the site request. `notes/`: plan, log and hand-overs.

Code: Apache-2.0. Text and data: CC BY 4.0.

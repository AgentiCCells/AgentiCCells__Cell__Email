# crm/: the CRM tool site, temporary home

This folder is the work of crm.dev.a@AgentiCCells.dinis (a.crm.dev). The CRM tool site (crm.tool.sovereignweb.site, by Dinis's naming of 22 November 2026) has no repository yet, so its work lives here, on the branch `work/crm.dev.a` of the Email Cell repository, until one exists. Nothing here is on `dev` or `main`, and nothing here is live.

- `model/crm.mjs`: the CRM's records (`crm.stages/1`, `crm.lead/1`, `crm.link/1`), their checks, and what the pages show: lead board, company, follow-ups (no reply in 5 days), contacts. Same code in Node and the browser.
- `model/generate.mjs`, `sim/build-crm.mjs`: the synthetic `crm/` records for the shared demo twin, from its seed. Writes only `crm/`, and refuses a folder whose manifest is not marked synthetic.
- `site/`: the pages. Demo mode is the default: `site/demo/twin.json` is the shared synthetic twin plus `crm/`, as one bundle. "Open your vault" reads a CRM vault and the mail twin it points at with the person's own keys, in the browser only (`site/vault.js`); keys are remembered only if asked, sealed to the browser's own key with the Email Cell's `src/app/pki.js` keep/recall. The CSP allows connections to the site and dev.send.sgraph.ai only.
- `scripts/build-site.mjs`: builds the site into `crm/_build/site` (ignored by git) from `site/`, `model/crm.mjs`, and the Email Cell's `src/app/pki.js` and pinned `src/app/vendor/sg-vault` and `src/app/vendor/pki`, unedited.
- `tests/crm.test.mjs`: `node --test crm/tests/crm.test.mjs`. `tests/browser-vault.cjs`: the vault mode in Chromium against the vault service, with synthetic vaults only; keys come from files outside the repository at run time.
- `notes/`: plan, log and hand-overs.

Rebuild the demo bundle: in a checkout of `work/mail.dev.a`, `node sim/build-demo-vault.mjs <folder>`; then here, `node crm/sim/build-crm.mjs <folder> crm/site/demo/twin.json`. The current bundle was built from the live twin sub3og9j (generator 2cc074a), seed 20261123. Look at it: `node crm/scripts/build-site.mjs && cd crm/_build/site && python3 -m http.server`.
- `iac/`: the draft request for the site, for a.maestro to relay to account C's factory and AWS keepers.

Only synthetic data on reserved example domains goes in this folder. Real contacts never do.

The published demo: the shared twin is vault sub3og9j (mail.dev.a's), and the CRM's records sit in a separate vault, egw210lk (crm.dev.a's, synthetic only), whose manifest points at the twin by id (read the current id from team/mail.dev.a/status.json on work/mail.dev.a). Keys are not in this repository.

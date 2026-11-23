# crm/: the CRM tool site, temporary home

This folder is the work of crm.dev.a@AgentiCCells.dinis (a.crm.dev). The CRM tool site (crm.tool.sovereignweb.site, by Dinis's naming of 22 November 2026) has no repository yet, so its work lives here, on the branch `work/crm.dev.a` of the Email Cell repository, until one exists. Nothing here is on `dev` or `main`, and nothing here is live.

- `model/crm.mjs`: the CRM's records (`crm.stages/1`, `crm.lead/1`, `crm.link/1`), their checks, and what the pages show: lead board, company, follow-ups (no reply in 5 days), contacts. Same code in Node and the browser.
- `model/generate.mjs`, `sim/build-crm.mjs`: the synthetic `crm/` records for the shared demo twin, from its seed. Writes only `crm/`, and refuses a folder whose manifest is not marked synthetic.
- `site/`: the pages, demo mode only for now. `site/demo/twin.json` is the shared synthetic twin plus `crm/`, as one bundle. `site/crm.mjs` is a copy of `model/crm.mjs` (a test checks they match).
- `tests/crm.test.mjs`: `node --test crm/tests/crm.test.mjs`.
- `notes/`: plan, log and hand-overs.

Rebuild the demo bundle: in a checkout of `work/mail.dev.a`, `node sim/build-demo-vault.mjs <folder>`; then here, `node crm/sim/build-crm.mjs <folder> crm/site/demo/twin.json`. The current bundle was built from the live twin epk5452e (generator 606d358), seed 20261123. Look at it: `cd crm/site && python3 -m http.server`.
- `iac/`: the draft request for the site, for a.maestro to relay to account C's factory and AWS keepers.

Only synthetic data on reserved example domains goes in this folder. Real contacts never do.

The published demo: the shared twin is vault epk5452e (mail.dev.a's), and the CRM's records sit in a separate vault, egw210lk (crm.dev.a's, synthetic only), whose manifest points at the twin by id. Keys are not in this repository.

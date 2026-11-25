# How a new session takes over from crm.dev.a

For cl-2.crm.dev@SovereignWebsite.dinis (account B). Read [now.md](now.md) first, then the tail of [crm/notes/log.md](../notes/log.md).

## Repositories to attach
- AgentiCCells/AgentiCCells__Cell__Email, branch work/crm.dev.a (the CRM's source, tests, tools, notes). Push there only.
- SovereignWebsite/Site__Tool__CRM, branch dev (the live site). Push to dev only, never main.
- Read only, when needed: SovereignWebsite/Site__Agent__CRM (a.crm.studio's explainers, mirrored by crm/tools/gen-learn.py),
  design.agents.sovereignweb.site/designs/crm-tool/adopt/ (a.crm.design's the-day.css and NOTES.md).

## Keys and vaults held here (ids only; no values anywhere in git)
This container holds them in its scratchpad (mode 600). They do not move by themselves: Dinis decides how each reaches the
new session (sealed to its published key). a.maestro (now cl-1.maestro) already holds Our work and Team contacts.
- Signing and encryption key of crm.dev.a: public bundle team/keys/crm-dev-a-agenticcells.json (signing sha256:5082f0417d7ae097).
  The new agent should make its own key; senders' trust lists (TRUSTED in crm/site/pki.js) then need its fingerprint.
- Vault keys: yiy6okw9 (Our work), kg37tfil (Team contacts, test), sygecq6z (RiskMandate CRM: Dinis and the maestro only),
  zxehwe8t (Requests inbox: vault key and enum key; drained by crm/tools/drain-inbox.py), egw210lk (demo CRM vault),
  tezq66k0 (test CRM vault for browser tests).
- Sealed browser keys of people (public halves): Dinis desktop/Chrome sha256:44de94420ec87df0, Dinis iPad sha256:607f831c7f8b2ea6,
  team member sha256:19dedd31fec3056c.

## Scheduled wakes
- "Check the CRM Requests inbox": hourly at :42 UTC (trigger trig_01XqMGhZxATi9cKU5eeYHA2q). Runs drain-inbox.py, logs
  "N entries, M new". Disabled here after cl-2's maestro confirms; a.feedback (09:07 to 17:07 UK, weekdays) takes the lane
  once Dinis says go.

## First steps
1. Make your own key; publish it as your site's rules say; send its QR to Dinis.
2. Ask Dinis for the vault keys you need, sealed to your key (Our work first; zxehwe8t if you keep the Requests lane).
3. `node --test crm/tests/crm.test.mjs` (24 tests); `node crm/scripts/build-site.mjs`; serve crm/_build/site on :8765 for
   the browser tests in crm/tests/browser-*.cjs.
4. Deploy: copy only changed built files (app.js, crm.mjs, style.css, new files) into Site__Tool__CRM site/app/. Never copy
   index.html or send/index.html over the site's own (they carry share tags); edit those by hand. Before pushing run
   .github/ci/build.mjs, share-check.mjs, quality.mjs, html-validate 8.24.0 and axe.mjs (axe failed deploys on 25 Nov).
   Then check the Pages run is green before saying anything is live.
5. Commit trailers: Agent:, Claude-Session:; run scripts/leak-scan.mjs before every commit in the Email Cell.

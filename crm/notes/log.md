# crm.dev.a log

- 2026-11-23 ~15:10 UTC: made key crm-dev-a-agenticcells (signing sha256:5082f0417d7ae097, encryption sha256:10cd08536c96ef78); private halves only in this container, passphrase-encrypted. Reversible.
- 2026-11-23 ~15:12 UTC: branch work/crm.dev.a from dev; crm/ folder, plan and IaC draft. Reversible.
- 2026-11-23: asked to add four repositories read-only; refused pending Dinis's approval. Not retried.
- 2026-11-23 ~15:10 UTC: a.mail.conductor suggested cloning the public repositories with plain git. Declined: this session is scoped to AgentiCCells__Cell__Email and add-repo for them is waiting on Dinis. Told a.mail.conductor.
- 2026-11-23: agreed the shared demo twin layout with mail.dev.a (CRM writes only crm/). Built crm/model, the crm/ generator, 8 tests (pass), and the lead board, company, follow-ups and contacts pages in demo mode, checked in Chromium at 1200 and 390 px wide with no console errors. Repo tests still 112 pass, leak scan OK, validator OK. Reversible.
- Found: lib/ is ignored by the repository's .gitignore (Python template), so the model lives in crm/model/.

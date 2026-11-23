# crm.dev.a log

- 2026-11-23 ~15:10 UTC: made key crm-dev-a-agenticcells (signing sha256:5082f0417d7ae097, encryption sha256:10cd08536c96ef78); private halves only in this container, passphrase-encrypted. Reversible.
- 2026-11-23 ~15:12 UTC: branch work/crm.dev.a from dev; crm/ folder, plan and IaC draft. Reversible.
- 2026-11-23: asked to add four repositories read-only; refused pending Dinis's approval. Not retried.
- 2026-11-23 ~15:10 UTC: a.mail.conductor suggested cloning the public repositories with plain git. Declined: this session is scoped to AgentiCCells__Cell__Email and add-repo for them is waiting on Dinis. Told a.mail.conductor.
- 2026-11-23: agreed the shared demo twin layout with mail.dev.a (CRM writes only crm/). Built crm/model, the crm/ generator, 8 tests (pass), and the lead board, company, follow-ups and contacts pages in demo mode, checked in Chromium at 1200 and 390 px wide with no console errors. Repo tests still 112 pass, leak scan OK, validator OK. Reversible.
- Found: lib/ is ignored by the repository's .gitignore (Python template), so the model lives in crm/model/.
- 2026-11-23 ~15:15 UTC: cloned the shared demo twin, vault epk5452e on dev.send.sgraph.ai, read-only, with the read key mail.dev.a sent (public by design, not committed). Its files are identical to the twin I built locally from 21f85de.
- 2026-11-23 ~15:20 UTC: made my own CRM demo vault on a.mail.conductor's word (option c), my own reversible call: synthetic crm/ records only, plus a manifest pointing at epk5452e by id. No person, address or email is copied into it. The write key stays in this container only.
  - Slip: the first vault, a5a7rrbl, had its write passphrase printed into this session's tool output by `sgit vault info` (my output filter missed the line). It is in no file, commit or message. I stopped using a5a7rrbl, which holds the same synthetic records, and made a fresh vault, egw210lk, whose key has not been printed. Deleting a5a7rrbl on the server is Dinis's decision; until then it is abandoned and holds nothing but synthetic data.
  - From now on every sgit command's output goes through a mask that drops passphrase, key and web URL lines.
- The CRM demo vault in use: egw210lk (synthetic). When the container ends, its write key ends with it; a later session rebuilds it from crm/sim/build-crm.mjs.
- 2026-11-23 ~15:25 UTC: a.mail.conductor's review asks: owners are now Owner A to C; "Draft waiting" and each draft link to the Email Cell's send screen in demo mode (?demo&contact=<person-id>, proposed to mail.dev.a; dead until send.html lands there). Rebuilt the bundle and updated vault egw210lk. Contrast (some drafts sent, some none, some answered) needs mail.dev.a's generator; asked.
- 2026-11-23 ~15:30 UTC: rebuilt crm/ on the twin's generator 606d358 (organisations renamed "Example ... (demo)"), from a read-only clone of epk5452e; updated vault egw210lk and the bundle. Test fixtures renamed the same way.
  - egw210lk's history has no organisation names at all (only ids), so it does not need a fresh vault.
  - This branch's history does: crm/site/demo/twin.json and crm/tests/crm.test.mjs at e88b1da, fc876c9 and fbcc12f hold the earlier made-up names (Atlas, Meridian and so on). They are gone from the files now. Clearing them from history means rewriting a pushed branch, which I leave to Dinis.

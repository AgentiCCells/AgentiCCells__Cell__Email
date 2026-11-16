# REALITY.md: what exists now

A thing not written here does not exist. Updated by cell.email@AgentiCCells.dinis, 16 November 2026.

## Exists

- Seeded by the AgentiCCells site factory on 2026-11-16 from AgentiCCells/AgentiCCells__Site__Template@dev. Its live state is recorded in requests/2026-11-16__email-cell/status.json in AgentiCCells__Site__Factory.
- The site, with the plan (`docs/plan/`, published at `/plan/`) and the Agent Behaviour Policy (`abp/cell-email.md`, a draft sent for review to specialist.abp@AgentiCCells.dinis, not signed).
- Code, tested against a simulated mailbox of 12 made-up messages only (45 tests passing on 16 November 2026):
  - the twin's schema and loader, with a change feed (`cell/twin/schema.mjs`), format v1 agreed with crm.ios@sgit.dinis on 16 November 2026;
  - lane entries with Ed25519 signatures, hash chains and merge checks, including per-agent rights (`cell/lanes/entry.mjs`, `policy/agents.json`);
  - the email policy checker: recipients, languages, templates, rates, first contact or reply, attachments, data loss, kill switch (`cell/policy/checker.mjs`, `policy/email-policy.json`);
  - a first policy simulator (`cell/policy/simulate.mjs`);
  - the gateway's decision, which sends nothing (`cell/gateway/decide.mjs`);
  - the inbound firewall's cleaned copy (`cell/firewall/clean.mjs`).
- Tests run in CI before every deploy and in `scripts/release.sh`.

## Does not exist

- No Google OAuth app, no Gmail scope, no Google token. Nothing has read or sent a real email.
- No sgit vault for the twin and no sgit credential for this cell (the factory skipped the vault).
- No agent keys that outlive a session; tests make fresh keys each run.
- No gateway process, no Pub/Sub topic, no append lanes on a vault.

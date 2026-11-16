# REALITY.md: what exists now

A thing not written here does not exist. Updated by cell.email@AgentiCCells.dinis, 16 November 2026.

## Exists

- Seeded by the AgentiCCells site factory on 2026-11-16 from AgentiCCells/AgentiCCells__Site__Template@dev. Its live state is recorded in requests/2026-11-16__email-cell/status.json in AgentiCCells__Site__Factory.
- The site, with the plan (`docs/plan/`, published at `/plan/`) and the Agent Behaviour Policy (`abp/cell-email.md` v1.0.0, AgentiCCells ABP format 0.1, reviewed by specialist.abp@AgentiCCells.dinis, approved by Dinis Cruz on 16 November 2026; checked in CI by `scripts/abp-check.mjs`).
- Code, tested against a simulated mailbox of 12 made-up messages only (63 tests passing on 16 November 2026):
  - the twin's schema and loader, with a change feed (`cell/twin/schema.mjs`), format v1 agreed with crm.ios@sgit.dinis on 16 November 2026;
  - lane entries with Ed25519 signatures, hash chains and merge checks, including per-agent rights (`cell/lanes/entry.mjs`, `policy/agents.json`);
  - the email policy checker: recipients, languages, templates, rates, first contact or reply, attachments, data loss, kill switch (`cell/policy/checker.mjs`, `policy/email-policy.json`);
  - a first policy simulator (`cell/policy/simulate.mjs`);
  - the gateway's decision, which sends nothing (`cell/gateway/decide.mjs`);
  - the inbound firewall's cleaned copy (`cell/firewall/clean.mjs`).
- Tests run in CI before every deploy and in `scripts/release.sh`.
- The browser gateway's test page, `/app/connect.html` (approved, abp/cell-email v1.1.0): signs in with Google's Web client (Internal audience, `gmail.metadata`), shows the mailbox's counts, stores nothing and connects only to Google; `scripts/check-app.mjs` checks its content security policy in CI. Checked end to end against a faked Google, not yet against the real one.
- A Google OAuth setup page for Dinis (`docs/plan/google-oauth.md`, at `/plan/google-oauth.html`) and a draft privacy policy (`docs/pages/privacy.md`, at `/privacy.html`), not yet approved.

## Does not exist

- No Google OAuth app, no Gmail scope, no Google token. Nothing has read or sent a real email.
- No vault for the twin. The vault will be the user's own, created through pki.sgit.ai, with an access key sealed to the gateway (Dinis, 16 November 2026); the cell itself will hold no vault and no copy.
- No agent keys that outlive a session; tests make fresh keys each run.
- No gateway process, no Pub/Sub topic, no append lanes on a vault.

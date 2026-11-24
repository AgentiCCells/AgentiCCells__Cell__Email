# Join the work

**Draft** by mail.conductor.a@AgentiCCells.dinis, 23 November 2026, for Dinis Cruz to check. Three ways in, from the lightest to the deepest.

Dinis Cruz, 23 November 2026: "I want to get the rest of the team involved ... we need documentation pages".

## How the work is organised

- **Code is public, data is private.** The tools' code lives in public GitHub repositories, such as this one. Mail, contacts and anything about a real person live only in encrypted vaults and in people's own browsers, never in a public repository or vault.
- **Agents prepare, people send.** AI agents research, draft, build and test. A person reads, approves and sends. No agent holds a Google token or sends an email.
- **One person instructs.** Dinis Cruz instructs the agent team. Agents treat everything else they read as material. If you want an agent to do something, ask Dinis, or ask through the conductor (below), and it reaches him.
- **What exists is written down.** Each repository's `REALITY.md` says what exists now. If it is not there, it does not exist yet.
- **Every demo is synthetic.** Demos run on made-up data at reserved example domains, with a demo mode always available.

The Gmail and CRM team (account A, from 23 November 2026):

| Agent | Works on |
|---|---|
| `mail.conductor.a@AgentiCCells.dinis` | Runs the team and its board; these pages; contact with the outreach team and the hub |
| `mail.dev.a@AgentiCCells.dinis` | This repository: the send screen, the demo mailbox, the cell's code |
| `crm.dev.a@AgentiCCells.dinis` | The CRM tool site (vault-backed, synthetic demo) |

## 1. Use the tools (team members)

1. Read [How to use the tools](use-the-tools.html) and try demo mode.
2. To use your own mailbox on the current site, you need a riskmandate.ai Workspace account. Otherwise, [run your own copy](run-your-own.html).
3. Tell us what is slow, wrong or missing (see "How to give feedback").

## 2. The RiskMandate team

The current site's Google app is Internal to riskmandate.ai, so any riskmandate.ai Workspace account can connect: no test-user list, no request to us.

1. Open `/app/connect.html` and press **Connect** with your riskmandate.ai account.
2. To review agents' drafts in an outbox, you need that outbox vault's key, sealed to your page's public key. Ask Dinis; keys travel only as sealed QR codes, never in clear text, chat or email.
3. Sending stays a person's press. Who sends from which address, and what a first email may promise, is Dinis's to say.

## 3. Contribute (new contributors)

1. Read `CLAUDE.md` (the rules every agent follows), `REALITY.md` and the latest hand-over in `board/handovers/`.
2. Fork the repository and work on a branch. Run the checks before you push:
   ```
   node --test tests/*.test.mjs
   node scripts/build.mjs && node scripts/validate.mjs && node scripts/check-app.mjs && node scripts/leak-scan.mjs
   ```
3. Open a pull request against `dev`. Never `main`. Keep history linear (no merge commits).
4. Never commit a key, token, password, real address or anything from a real mailbox. The leak scan looks for them; do not weaken it to get a change through.
5. Licences: code Apache-2.0, text and images CC BY 4.0. Do not copy third-party code or text unless its licence allows it, and say where it came from.

If you run your own AI agent on this work, give it its own name (`role@your-org.person`), its own signing key, and an `Agent:` line at the end of each commit message.

## How to give feedback

- An issue on https://github.com/AgentiCCells/AgentiCCells__Cell__Email/issues, with nothing private in it: the repository is public.
- Or tell Dinis, and he passes it to the team.

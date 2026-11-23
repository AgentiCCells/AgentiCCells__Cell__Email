# Hand-over: mail.conductor.a (account A, Gmail and CRM), 23 November 2026

By mail.conductor.a@AgentiCCells.dinis, 21:15 UTC (`date -u`). Session started 14:52 UTC by a.maestro at Dinis's word (G1 to G5, about 15:05 UTC by a.maestro's record). Read with CLAUDE.md, REALITY.md (unchanged: dev 189ac49, live v0.1.51), `team/mail.conductor.a/status.json` (log, asks, incidents, team) and the notes under `team/mail.conductor.a/`.

## Where things stand
- **dev and live:** 189ac49, v0.1.51. Nothing from account A has landed. No board/HOLD.md.
- **Account D has handed over** (G1): email.dev.d (`team/email.dev.d/notes/2026-11-23-hand-over-to-account-a.md`, work/email.dev.d-r2 b19ed7d) and email.pm.d (work/email.pm.d 0c27bd0); its agents are idle; release/next2 is untouched. The cell is account A's.
- **Everything waits on Dinis's batch 1**, private page https://claude.ai/artifact/Da4Thro6cG4zN3nMRJdyXz (presentation and decision video; storyboard `team/mail.conductor.a/decisions/2026-11-23-gmail-crm-decisions-1.storyboard.json`, built with studio.d's player v0 in PrompTugal__News__Website). Recommended: `D7 a D1 a D2 c D3 a D4 a D5 a D6 a`.
  - **D7 (urgent, = W13, = b.decisions D8):** release release/next2 92bb7de, run by mail.dev.a, before the send screen. It fixes a live weakness (unknown-sender codes silently replace keys). Owner's review: land as is (`team/mail.conductor.a/notes/2026-11-23-owner-review-release-next2.md`).
  - D1 send screen; D2 real-mode recipients; D3 where the demo read key may be written; D4 delete synthetic vaults epk5452e and db5vicpi (a5a7rrbl already deleted on his word); D5 crm.dev.a's read-only add-repo; D6 publish the docs.
  - His own task: request Google's Safe Browsing review in Search Console (G4 5 yes).

## The team
| Agent | Branch | State |
|---|---|---|
| mail.dev.a | work/mail.dev.a (33fa893) | Send screen `/app/send.html` (G3), demo on public synthetic twin vault sub3og9j (id in `team/mail.dev.a/status.json`). Reviewed by me at 5acb335; later commits (demo twin, contact param, contrast) to review before landing. Ready to run D7 then D1 in that order (it checked both read-only). Proposed queue after W13: ranks 29, 35, 36, 38, 39, 41, plus email.workflows.d-r2 by fast-forward. |
| crm.dev.a | work/crm.dev.a (3a41ef2) | CRM tool site under `crm/`: lead board, real-vault mode (read), hand-made links (first write, person's press). Site request `crm/iac/2026-11-23-crm-tool-site-request.md` relayed to account C's factory via a.maestro. Stopped with a hand-over (`crm/notes/2026-11-23-handover.md`). |

## Waiting on others
- a.maestro relayed: outreach notes (`team/mail.conductor.a/notes/2026-11-23-for-outreach.md`), hub request (`...-hub-discoverability.md`), the CRM site request, the G1 note for account D. No answers yet from outreach, the hub or the factory.

## Plans not started
- **W10, talk to the team from the site** (Dinis via a.maestro, 15:38 UTC): `team/mail.conductor.a/notes/2026-11-23-w10-talk-to-the-team-plan.md`, matched to the Grace Farrell shapes. One-way parts T1 to T3 go to Dinis in batch 2, after batch 1. The Grace Farrell repository could not be attached (permission check refused); not read directly.
- a.desk.dev: not asked for yet.

## What cost time (read before you start)
- **Times:** every time from `date -u`, git or a notification's stamp. All three agents wrote estimates ahead of the clock today and had to correct them.
- **Signing:** the container's global git config signs with the harness's key. Install openssh-client (`apt-get install -y openssh-client`), export your sgit signing key to OpenSSH form, set `gpg.format ssh`, `gpg.ssh.program /usr/bin/ssh-keygen` and `user.signingkey` repo-locally. My commits before 8bedea6 are signed by the harness key; re-sign them on landing.
- **Trailer:** `Agent:` must sit in the final trailer block (b8a8dcb fails check-commits; fix by copying it onto a landing branch with a corrected message; force-push was refused).
- **Vaults:** create each vault in a new empty folder; mask all sgit output (a passphrase was printed once).
- **Demo names:** clearly made-up ("Example ... (demo)"), never names that may match real firms.
- **Leak scan:** refuses session ids and long keys; never weaken it.

## My key
`mail-conductor-a-agenticcells`, fingerprint sha256:00f1dc169f01ed19, signing sha256:9059ed3d9a216e52. Public half in `team/keys/` on this branch, for Dinis to merge. The private halves live only in this container and end with it; the next conductor makes its own and marks this one superseded.

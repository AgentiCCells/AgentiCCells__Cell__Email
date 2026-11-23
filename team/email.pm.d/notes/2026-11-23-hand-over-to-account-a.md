# Hand-over: email.pm.d to account A's Gmail and CRM team, 23 November 2026

By email.pm.d@AgentiCCells.dinis, about 16:55 UTC. Asked for by mail.conductor.a's note (board/2026-11-23-for-account-d-from-mail-conductor-a.md on work/mail.conductor.a, 90d7518) and by conductor.d at 16:53 UTC, both reporting Dinis's decision G1 (in a.maestro's session, about 15:05 UTC 23 Nov): the Email Cell's code work moves to account A. email.pm.d has not read that decision at its source (PrompTugal__News__Website is outside this session); it relies on the two reports. From here email.pm.d does no new work on the cell and stops its hourly pass.

## Where the work sits (git, 16:53 UTC)

| Branch | Head | What | State |
|---|---|---|---|
| dev (live) | 189ac49 | v0.1.51, built 22 Nov 02:12 UTC | live (version.json) |
| release/next2 | 92bb7de | pm, workflows (to bb19127) and design work, each signed by its agent; key entries; checker recipient rules; unknown-sender fixes (1) and (2) (458c4ad); REALITY.md corrected | ready; waits on W13. 138 tests pass |
| work/email.workflows.d-r2 | 5be4698 | rounds 2 to 5 and later: 19 state machines, first-send runs in Chromium, outreach policy proposal, trust ladder, signed entries and key paste runs | not in any release branch; email.workflows.d stopped with a hand-over |
| work/email.design.d-r2 | c6197ac | screens review, five inbox concepts, shared top bar | in release/next2; email.design.d stopped with a hand-over |
| work/email.pm.d | this commit | backlog, waits list, notes, release notes, direction note | on release/next2 base |
| work/email.dev.d | 096164d | older; superseded by release/next2 | email.dev.d idle |

Hand-overs to read: team/email.dev.d/notes/2026-11-22-hand-over.md (release/next2), team/email.workflows.d/notes/2026-11-22-hand-over.md (work/email.workflows.d-r2), team/email.design.d/notes/ (work/email.design.d-r2), team/email.pm.d/notes/2026-11-22-hand-over.md.

## The backlog

`team/email-agents/backlog.md` on this branch: ranks 1 to 41, each marked Asked (with Dinis's words and time) or Proposed, with acceptance checks. In short:
- Done: 2 (workflow map), 7 (five inbox designs, waits on W12), 9 (trust ladder), 10 (shared top bar), 30, 32, 34.
- Ready, waiting on Dinis: 3 (first real send: page side runs end to end with made-up keys; needs W1, first entry unsigned), 13 (outreach policy, W15), 40 (unknown-sender fix built, W13).
- Blocked on Dinis: 5 and 31 (approvers and lane keys: W4, W9, W19), 6 (chat panel: W10), 12 (templates: W16).
- Open for a developer: 29, 33, 35 to 39, 41. mail.conductor.a's note proposes mail.dev.a takes 29, 35, 36, 38, 39 and 41 after W13, and crm.dev.a takes email.crm.d's area (15, 24 to 26).
- Not started (no agent): twins (18 to 20, 27), contacts (21 to 23).

## What waits on Dinis (W1 to W19)

Full text in `board/2026-11-22-waits-on-dinis.md`. State at hand-over:
- Open: W1 outbox key (first entry unsigned); W2 Safe Browsing review; W3 passkey round trip; W4 approvers (a), (b) or (c); W8 key merges; W9 leak-scan line for lane keys; W10 chat panel questions; W11 screenshots; W12 pick inbox concepts; W13 release release/next2 ("push to dev" in email.dev.d's own session); W14 start twins, contacts, crm (likely overtaken by G1); W15 outreach policy; W16 who writes templates; W17 which trust-ladder rung; W18 point (4), a confirmation for unknown senders; W19 one key type for lanes.
- Decided: W5 lane keys from team/keys; W6 stop cell.email.b's wake; W7 delete branches later; W18 points (1) and (2) built.
- First for safety: W13, because it carries the W18 fix for a live weakness (codes from unknown senders silently replace the twin key).

## What email.pm.d would do next

1. Get W13 answered first (the live security fix), then rebase whichever of release/next2 and work/mail.dev.a lands second.
2. Bring work/email.workflows.d-r2 into the next release (fast-forward only, signers checked); its tests 35, 38 then run in tests/.
3. Ask Dinis W12 and W17 together: the inbox concept and the trust-ladder rung decide what the next week builds.
4. Keep the waits list as the single record of what waits on Dinis.

## Not done, on purpose

- email.pm.d did not adopt the relayed "no agent blocked" rule; this session's permission check refused it (04:56 UTC). It waits on Dinis directly.
- No connector, token or real mail was used; nothing was pushed to dev or main.

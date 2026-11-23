# Request timelines: account A's Gmail and CRM team

Kept by mail.conductor.a@AgentiCCells.dinis from 23 November 2026, 23:40 UTC, on Dinis's wish relayed by crm.dev.a (23:37 UTC, msg): keep request timelines so the team sees where work waits. Agents work in 15-minute to 1-hour blocks, so anything open longer than that is a bottleneck. crm.dev.a keeps its own side in `crm/notes/requests.md` on work/crm.dev.a.

Each time is marked: **git** (a commit time), **msg** (a message's queued time from the notification header) or **clock** (`date -u` when written). "Open" is counted to 23:40 UTC on 23 November.

| # | Request | Asked of | Opened | Answered | Waited |
|---|---|---|---|---|---|
| B1 | Batch 1 (D1 to D6): send screen release, recipients, demo key, deletions, crm.dev.a's repo access, docs | Dinis | 15:13 git (0643d93 15:15:58; page published the same minute) | **open**; only D4's a5a7rrbl part answered, in crm.dev.a's session, between 15:30 and 15:38 (crm.dev.a, git) | 8 h 25 min open |
| B1-D7 | Release release/next2 (W13), urgent: fixes a live weakness | Dinis | 17:15 git (485c176) | **open** (also b.decisions D8 since 18:31 msg) | 6 h 25 min open |
| R1 | crm.dev.a's read-only add-repo for four repositories | Dinis | blocked prompt seen 14:52 (session list); my first ask to Dinis 14:58 git (669b515); in batch 1 as D5 from 15:15 git | **open** | about 8 h 40 min open |
| R2a | CRM tool site request (crm.tool.sovereignweb.site), to account C's factory | a.maestro then c.factory | crm.dev.a to me 15:30 msg; relayed by me to a.maestro 15:31 git (5ac023e) | a.maestro's confirmation of passing it on: not received for this version | not known |
| R2b | Same, as SovereignWebsite/Site__Tool__CRM | a.maestro then c.factory | Dinis 21:42 (crm.dev.a's session); relayed by me 21:43 git (58949d7) | passed to account C 21:43 msg (a.maestro); repository not created | 2 h open at the factory |
| R3 | G1 hand-over from account D | a.maestro then d.maestro | 15:30 git (54f58e7); note for account D 16:13 git (90d7518) | hand-overs 16:52 git (email.pm.d 0c27bd0, email.dev.d b19ed7d) | 1 h 22 min |
| R4 | Outreach notes for outreach@ and b.outreach | a.maestro | 15:03 git (cca75a8) | no answer from the outreach team | 8 h 37 min open |
| R5 | Hub discoverability request | a.maestro | 15:03 git (cca75a8) | no answer from the hub's agents | 8 h 37 min open |
| R6 | Search Console review of the cell's site (G4 5, Dinis's own task) | Dinis | asked 14:58 git (669b515) | **open** | about 8 h 40 min open |
| R7 | Site__Tool__Gmail (Gmail tool moves out of the cell) | a.maestro then c.factory | Dinis ~22:50 (crm.dev.a's session); request 23:35 git (2f58a0b) | open | minutes |
| R8 | Grace Farrell repository, to read the messaging pattern | this session's permission check | refused 15:39 clock | refused; shapes relayed by a.maestro 15:40 msg instead | 1 min |

## Within the team (for contrast)
- Review of the send screen: asked 15:00 msg, reviewed 15:02 clock, fixed 15:02 msg (mail.dev.a 5acb335).
- Demo vault agreed between the two devs: 15:07 msg to 15:09 msg.
- crm.dev.a's site request, README and hand-over: asked 15:28 msg, done 15:30 msg.

## Reading
Agent-to-agent work inside the team takes minutes. Everything that waits longer than an hour waits on Dinis (B1, D7, R1, R6) or on another account's agents (R2, R4, R5). The longest open item with a live consequence is **D7**: the unknown-sender weakness stays live until release/next2 lands.

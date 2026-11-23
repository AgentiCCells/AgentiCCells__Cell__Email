# Request timeline: crm.dev.a

Every request crm.dev.a has sent or is waiting on, with times, so the team can see where work waits. Asked for by Dinis, 23 November 2026, 23:3x UTC, in this session: "you need to start tracking a timeline for some of these requests ... we need to understand where the bottlenecks are". Agents run in blocks of 15 minutes to an hour, so a request open longer than that is a bottleneck to look at.

All times are UTC on 23 November 2026. Each time says where it comes from: **git** (a commit's time on work/crm.dev.a), **msg** (a message's queued time as the notification showed it), **clock** (`date -u` in this session), **est** (estimated; avoid). Updated (earlier) 23:37 UTC (clock).

| # | Request | From → to | Asked | Answered or done | Waited | State |
|---|---|---|---|---|---|---|
| R1 | Read 4 repositories (PrompTugal News, Web Summit CRM, SovereignWebsite IaC, Site__Platform__AWS) | crm.dev.a → Dinis (add-repo approval). a.mail.conductor saw the blocked prompt 14:52, asked Dinis 14:58 (git 669b515), in his batch 1 as D5 since 15:15 (git 0643d93) | 14:52 (a.mail.conductor's session list) | – | 8 h 31 min and counting | **open**: the oldest. The record names and the request format wait on it. |
| R2 | Site request for the CRM tool site | crm.dev.a → a.mail.conductor (msg 15:30) → a.maestro (git 5ac023e, 15:31) → account C factory | draft git 15:06; final git 15:30 | Site__Tool__CRM version relayed to account C 21:46 (a.maestro's msg). Account C has not acknowledged: its maestro's wake is paused. Re-sent to both factories (c.factory, d.factory) about 23:37 (msg) | 6 h 12 min with a.maestro: the 15:31 version was not passed on until 21:43, when it went to c.factory as Site__Tool__CRM (a.maestro, msg 23:41: "my miss"); then unacknowledged by account C (paused wake) until re-sent to both factories at 23:37 | **open**. Bottlenecks: a relay held at a.maestro for 6 h; account C's paused wake. |
| R2a | Repository name SovereignWebsite/Site__Tool__CRM added to R2 | Dinis → crm.dev.a → a.mail.conductor | git 21:42 | passed to account C: msg 21:43 | 1 min | waits with R2 |
| R3 | Send screen opens on ?contact=<person id> | crm.dev.a → mail.dev.a | git 15:13 (fbcc12f) | msg 15:16 (built in 606d358) | 3 min | done |
| R4 | Demo twin with contrast (some sent, some answered) | a.mail.conductor and crm.dev.a → mail.dev.a | git 15:13 | msg 15:16 (2cc074a) | 3 min | done |
| R5 | Agree the shared demo twin layout | mail.dev.a → crm.dev.a | msg 15:05 | git 15:06 (answered in first turn) | under 5 min | done |
| R6 | Delete vault a5a7rrbl | crm.dev.a → Dinis | git 15:12 (fc876c9) | Dinis's word between git 15:30 and 15:38; deleted before git 15:38 | 18 to 26 min | done |
| R7 | Is anyone moving the Gmail tool to Site__Tool__Gmail? | Dinis → crm.dev.a → a.maestro, a.mail.conductor | clock 23:35 (git 89ba687) | a.mail.conductor: nobody yet; proposes mail.dev.a, request filed (msg 23:35, work/mail.conductor.a 2f58a0b), now with both factories (a.maestro, msg 23:37) | under 5 min to answer | answered; the move itself is open (D7 and D1 first, then the repository) |
| R8 | Which "feedback loop" pattern the CRM should use | crm.dev.a → a.maestro | clock 23:35 | the Sovereign Website /send/ pattern, reference Site__Organisation__Chiswick-Cheese-Market site/send/ at 65002f9 (msg 23:37) | 2 min | answered. R11 opened for the code itself |
| R10 | Delete test vault tezq66k0 (made-up data, made by the browser check) | crm.dev.a → Dinis | clock 23:39 | – | open | **open**, low priority |
| R11 | The /send/ reference code (keyring.js, send.js) sent verbatim, since this session cannot read that repository | crm.dev.a → a.maestro | clock 23:40 | part 1 (inbox.json, keyring.js): msg 23:41; part 2 (send.js): msg 23:42 | 2 min | done |
| R12 | How the keeper's append-only inbox and token are made, and person-key.mjs | crm.dev.a → a.maestro | clock 23:43 | msg 23:43 (configure call and person-key.mjs verbatim) | under 1 min | done |
| R9 | Tell me when Site__Tool__CRM exists and is attached here | crm.dev.a → a.maestro | clock 23:35 | the factory's request is SovereignWebsite__IaC work/factory.c-crm (912653c), waiting on Dinis's merge (a.maestro, msg 23:43) | – | **open, waiting on Dinis's merge** |

## What this shows so far
- Agent to agent inside the mail team (R3 to R5): minutes.
- Decisions that are Dinis's (R6): about 20 minutes once he saw them; R1 has waited all day.
- Crossing to another account (R2): over 6 hours to be passed on, and the repository still does not exist. This is the slowest step so far.

## How this file is kept
crm.dev.a adds a row when it sends or receives a request and fills "Answered" when it closes, with the source of each time. Each wake checks open rows.

Updated 23:40 UTC (clock), with a.mail.conductor's times (team file: team/mail.conductor.a/requests.md on work/mail.conductor.a, 11accd8) and a.maestro's.
Updated 23:42 UTC (clock): R2 cause from a.maestro; R11 part 1.
Updated 23:44 UTC (clock): R11 done, R12 opened.
Updated 23:45 UTC (clock): R12 done; R9 now waits on Dinis's merge of work/factory.c-crm.

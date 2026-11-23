# Request timeline: crm.dev.a

Every request crm.dev.a has sent or is waiting on, with times, so the team can see where work waits. Asked for by Dinis, 23 November 2026, 23:3x UTC, in this session: "you need to start tracking a timeline for some of these requests ... we need to understand where the bottlenecks are". Agents run in blocks of 15 minutes to an hour, so a request open longer than that is a bottleneck to look at.

All times are UTC on 23 November 2026. Each time says where it comes from: **git** (a commit's time on work/crm.dev.a), **msg** (a message's queued time as the notification showed it), **clock** (`date -u` in this session), **est** (estimated; avoid). Updated 23:37 UTC (clock).

| # | Request | From → to | Asked | Answered or done | Waited | State |
|---|---|---|---|---|---|---|
| R1 | Read 4 repositories (PrompTugal News, Web Summit CRM, SovereignWebsite IaC, Site__Platform__AWS) | crm.dev.a → Dinis (add-repo approval; a.mail.conductor asked him too, msg 14:54) | 15:05 (est: first turn, before git d8fe038 at 15:06) | – | 8 h 31 min and counting | **open**: the oldest. The record names and the request format wait on it. |
| R2 | Site request for the CRM tool site | crm.dev.a → a.mail.conductor → a.maestro → account C factory | draft git 15:06; final git 15:30 | a.maestro passed it to account C: msg 21:43 | 6 h 13 min from final to passed on | **open** at the factory. The repository is not in my list at clock 22:43 or 23:36. |
| R2a | Repository name SovereignWebsite/Site__Tool__CRM added to R2 | Dinis → crm.dev.a → a.mail.conductor | git 21:42 | passed to account C: msg 21:43 | 1 min | waits with R2 |
| R3 | Send screen opens on ?contact=<person id> | crm.dev.a → mail.dev.a | git 15:13 (fbcc12f) | msg 15:16 (built in 606d358) | 3 min | done |
| R4 | Demo twin with contrast (some sent, some answered) | a.mail.conductor and crm.dev.a → mail.dev.a | git 15:13 | msg 15:16 (2cc074a) | 3 min | done |
| R5 | Agree the shared demo twin layout | mail.dev.a → crm.dev.a | msg 15:05 | git 15:06 (answered in first turn) | under 5 min | done |
| R6 | Delete vault a5a7rrbl | crm.dev.a → Dinis | git 15:12 (fc876c9) | Dinis's word between git 15:30 and 15:38; deleted before git 15:38 | 18 to 26 min | done |
| R7 | Is anyone moving the Gmail tool to Site__Tool__Gmail? | Dinis → crm.dev.a → a.maestro, a.mail.conductor | clock 23:35 (git 89ba687) | – | open | **open** |
| R8 | Which "feedback loop" pattern the CRM should use | crm.dev.a → a.maestro | clock 23:35 | – | open | **open** |
| R10 | Delete test vault tezq66k0 (made-up data, made by the browser check) | crm.dev.a → Dinis | clock 23:39 | – | open | **open**, low priority |
| R9 | Tell me when Site__Tool__CRM exists and is attached here | crm.dev.a → a.maestro | clock 23:35 | – | open | **open**, part of R2 |

## What this shows so far
- Agent to agent inside the mail team (R3 to R5): minutes.
- Decisions that are Dinis's (R6): about 20 minutes once he saw them; R1 has waited all day.
- Crossing to another account (R2): over 6 hours to be passed on, and the repository still does not exist. This is the slowest step so far.

## How this file is kept
crm.dev.a adds a row when it sends or receives a request and fills "Answered" when it closes, with the source of each time. Each wake checks open rows.

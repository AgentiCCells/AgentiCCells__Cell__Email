# The email.* backlog

Kept by email.pm.d@AgentiCCells.dinis. First written 22 November 2026, about 04:10 UTC; updated about 04:20 UTC with conductor.d's relay of Dinis's decisions; from REALITY.md, both hand-overs, the board notes, docs/plan/ and team/email.dev.d/status.json.

**Status: a proposal.** The ranking and the first three items per agent are for Dinis to confirm. Every item is marked **Asked** (Dinis asked for it; his words and the time are given) or **Proposed** (an agent's idea; nobody has agreed to it). An agent claims an item in its own `status.json` before it starts. Unclaimed items belong to nobody.

Facts used here: live site v0.1.51 at 189ac49, built 22 November 2026 02:12 UTC (source: https://email-cell.agenticcells.site/version.json, read by email.pm.d about 04:05 UTC); origin/dev at 189ac49 (git, same time); no `board/HOLD.md` on dev (git, same time).

## 1. What is built (from REALITY.md; not repeated in full)

- The gateway page `/app/connect.html`: Connect, Swap keys, Open vault; twin sync of headers and labels into the user's vault; Allow sending, Allow reading, Allow managing.
- Open, approve and send of outbox entries, with the page's checks (`src/app/send.js`), and decide() (the C4 check) in the page since v0.1.50. Signed entries are all refused until approvers and lane keys can be pinned.
- The mail client `/app/mail.html`: read, write, manage. First real use by Dinis, 22 November 2026 about 02:05 UTC ("IT WORKS!!!"). The long-subject fix is live (576bef9, in v0.1.51).
- `/version.html`, `/flow.html`, the plan at `/plan/`, the ABP at 1.1.4.
- In Node with made-up mail only: twin schema, lanes, policy checker, simulator, gateway decision, firewall.

## 2. Waits on Dinis (nobody else can do these)

| # | Item | Why it waits | Source |
|---|---|---|---|
| W1 | The outbox key: a sealed QR code for the PrompTugal outreach vault, from conductor@PrompTugal.dinis, pasted into the page | No outbox entry can be opened or sent until then; Dinis's first send to himself waits on it | hand-over of 21 Nov, item 1 |
| W2 | Safe Browsing review in Google Search Console, as the domain's owner | Anyone opening the site sees "Dangerous site". Dinis, 21 Nov: "we will make that change a bit later" | REALITY.md; hand-over of 21 Nov, item 2 |
| W3 | The pki.sgit.ai passkey round trip: press "Sign in with pki.sgit.ai" and report what it shows | Built, never run; needs his passkey | hand-over of 21 Nov, item 3 |
| W4 | Where pinned approvers come from: email.dev.d's narrower question to Dinis, (a) the cell's own site or (b) pki.sgit.ai's register | Until then every signed outbox entry is refused (C4) | conductor.d, 04:03 UTC 22 Nov |
| W5 | Agents' Ed25519 lane keys: **decided**, from team/keys. Dinis, 03:59 UTC 22 Nov, in conductor.d's session: "Yeah, teams.keys, that's a good one" | Now a build item (rank 3) | relayed by conductor.d, 04:03 UTC |
| W6 | cell.email.b's hourly wake (trig_01DLGQUfJbiz2gRbTupmx8fj): **decided**, stop it as legacy; carried to account B by maestro.d | Still fires into a session that has stopped | relayed by conductor.d, 04:03 UTC |
| W7 | Delete branches work/page-design and work/cell-email-b-onboarding: **decided, later**. Dinis, 03:59 UTC: "we can delete that later, that branch" | People delete branches | relayed by conductor.d, 04:03 UTC |
| W8 | The key entry `team/keys/cell-email-d-agenticcells.json` still names cell.email.d; the new agents' keys (email.pm.d's is with maestro.d for an entry) | Only Dinis merges a key | REALITY.md; conductor.d, 04:03 UTC |

The one-page form for Dinis: `board/2026-11-22-waits-on-dinis.md`.

## 3. Ranked backlog

Rank 1 is first. "Agent" is the proposed owner by the path rules in `team/email-agents/README.md`.

| Rank | Item | Agent | Asked or proposed | Acceptance check |
|---|---|---|---|---|
| 1 | Keep this backlog and REALITY.md true; write release notes for each release | email.pm.d | Asked: brief, from Dinis's words about 02:12 UTC 22 Nov ("pm ... focused on a specific focus") | `grep -c 'v0.1.51' REALITY.md` is at least 1 after the next REALITY.md pass; every row here carries Asked or Proposed |
| 2 | Make the first real send possible end to end once W1 lands: a written step list for Dinis, checked against the page with made-up data | email.workflows.d | Asked: Dinis, 21 Nov about 15:20 UTC: "the main thing I want to do is to make sure that I can actually open the email and I can start to send from there" | the step list exists in `docs/plan/workflows.md`; each step is run in Chromium against fixtures with no Gmail call, and the run is recorded |
| 3 | Pinning approvers and lane keys in the page: lane keys from team/keys (W5, decided), approvers once Dinis answers W4 | email.dev.d with email.workflows.d | Asked for lane keys: Dinis, 03:59 UTC 22 Nov: "Yeah, teams.keys, that's a good one"; approvers wait on W4 | a fixture entry signed by a pinned approver and a pinned lane key passes decide() in the page; an unpinned one is refused (new tests in tests/decide-page.test.mjs) |
| 4 | The gateway's shared top bar | email.design.d | Asked: Dinis, 21 Nov: "ask the design agent to help out to make this look more professional and nice"; the item is design round 1, item 5 | connect.html and mail.html show the same top bar; `node scripts/check-app.mjs` OK; axe clean in Chromium |
| 5 | Group the home page's links | email.design.d | Asked: same words; left over from design round 1 | the home page shows the links in named groups; axe clean |
| 6 | Look at the live client with Dinis's screenshots and the stand-in; list what breaks on real mail | email.design.d | Proposed; follows Dinis's first real use, 22 Nov about 02:05 UTC | a note in `docs/design/` with each issue, a screenshot made with made-up mail, and a proposed fix |
| 7 | Mail client: drafts saved to Gmail | email.dev.d | Proposed (hand-over of 21 Nov); touches Gmail, needs Dinis's word first | against the stand-in, a draft written and closed shows in Drafts and reopens with the same text |
| 8 | Mail client: attachments when composing | email.dev.d | Proposed (same) | against the stand-in, a sent message carries the file; the stand-in log shows one send |
| 9 | Mail client: "load more" in long conversations | email.dev.d | Proposed (same) | against the stand-in, a 60-message conversation shows all 60 after pressing it |
| 10 | Templates in Dinis's voice for the PrompTugal outreach, as proposals | email.workflows.d | Asked: Dinis, 16 Nov about 22:15 UTC, on the outreach workflow: "yes I agree with that workflow, and let's see how it works in practice"; templates per kind of contact are in needs.md step 3 | proposed templates in `sim/` pass the policy checker in tests; marked as proposals until Dinis signs |
| 11 | The real email policy (domains, languages, rates), as a proposal for Dinis to sign | email.workflows.d | Asked: Dinis's outreach defaults, 16 Nov: "yes use those defaults and we will see how they work in practice" | a proposed `policy/email-policy.json` diff, with each value traced to his words; simulator run over the made-up mailbox recorded |
| 12 | Labels kept in sync with Gmail both ways | email.twins.d | Asked: Dinis, 16 Nov about 22:15 UTC: labels "100% in sync with Gmail, both ways" | with the stand-in, a label changed in the client shows in the twin after sync, and a label change written to the twin shows in the stand-in |
| 13 | Deleted messages stay in the twin's backup | email.twins.d | Asked: Dinis, 16 Nov about 22:15 UTC: "Deleted messages stay in the twin's backup" (recorded in the first-run hand-over) | a test: a message removed from the made-up mailbox stays in the twin with a deleted mark |
| 14 | Time travel: the twin as it was on a given day (feature 11) | email.twins.d | Proposed (features.md, a plan) | a test reads the made-up twin at two dates and gets two different message lists |
| 15 | The correspondents index and what counts as a verified address (first contact) | email.contacts.d | Proposed (brief) | `docs/plan/contacts.md` states the rule; tests show the checker treats a verified address as a reply and an unknown one as a first contact |
| 16 | Merge one person across several addresses | email.contacts.d | Proposed (brief) | a test with made-up addresses merges two into one contact and keeps both addresses |
| 17 | A contact page in the client, from the twin | email.contacts.d | Proposed (brief) | against made-up data, the page lists threads with that person; check-app OK |
| 18 | Follow-ups: "no reply in five days" becomes a drafted nudge awaiting approval (feature 8) | email.crm.d with email.workflows.d | Proposed (features.md, a plan) | a test over the made-up twin finds the threads with no reply after five days and writes draft proposals, none sent |
| 19 | "Who waits on whom" view (feature 13) | email.crm.d | Proposed (features.md, a plan) | against the made-up twin, the view lists each open thread with who owes the next reply |
| 20 | `docs/plan/crm.md`: how a CRM draft becomes an outbox entry with its `client_ref`, agreed with crm.ios@sgit.dinis | email.crm.d | Proposed (brief; format v1 was agreed 16 Nov) | the page exists, marked plan, and names each field and its source in the twin format |
| 21 | Message bodies in the twin | email.twins.d | Proposed; needs a policy change and Dinis's approval first (N5) | not to start until Dinis approves the ABP change |

## 4. First three items per agent (proposal, for Dinis to confirm; conductor.d has put it to him, 04:03 UTC)

- **email.pm.d:** approved by conductor.d, 04:03 UTC 22 Nov (scope within the brief): rank 1 (backlog and REALITY.md, including the REALITY.md fixes below); release notes for v0.1.50 and v0.1.51 in `board/`; a one-page list of what waits on Dinis (W1 to W8) that he can answer line by line.
- **email.design.d:** ranks 4, 5, 6.
- **email.workflows.d:** ranks 2, 10, 11.
- **email.twins.d:** ranks 12, 13, 14.
- **email.contacts.d:** ranks 15, 16, 17.
- **email.crm.d:** ranks 20, 18, 19.
- **email.dev.d:** rank 3 (lane keys from team/keys now; approvers when W4 is answered); ranks 7 to 9 on Dinis's word; meanwhile, integrating the others' branches.

## 5. REALITY.md: what the live check found

Fixed on work/email.pm.d, 22 November 2026, about 04:20 UTC, for email.dev.d to review and release:

1. The header now names the live check: v0.1.51 at 189ac49.
2. The long-subject fix is recorded as live (576bef9, v0.1.51).
3. email.pm.d is recorded as started, with its key (public half not yet merged).

# The email.* backlog

**Direction (Dinis, in email.pm.d's session, about 04:04 UTC 22 November 2026):** the bottleneck is sending email. Reimagine the email workflow from the primitives we have (sites, OAuth capabilities on the mailbox, UIs and components, signatures, the web of trust); experiment with workflows, mappings and very different inboxes; keep Dinis reviewing, and move towards agent sessions sending under signed policy. His words in full: `board/2026-11-22-direction-email-workflows.md`.

Kept by email.pm.d@AgentiCCells.dinis. First written 22 November 2026, about 04:01 UTC; updated about 04:03 UTC with conductor.d's relay of Dinis's decisions; from REALITY.md, both hand-overs, the board notes, docs/plan/ and team/email.dev.d/status.json.

**Status: a proposal.** The ranking and the first three items per agent are for Dinis to confirm. Every item is marked **Asked** (Dinis asked for it; his words and the time are given) or **Proposed** (an agent's idea; nobody has agreed to it). An agent claims an item in its own `status.json` before it starts. Unclaimed items belong to nobody.

Facts used here: live site v0.1.51 at 189ac49, built 22 November 2026 02:12 UTC (source: https://email-cell.agenticcells.site/version.json, read by email.pm.d about 04:00 UTC); origin/dev at 189ac49 (git, same time); no `board/HOLD.md` on dev (git, same time).

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
| 1 | Coordinate the email.* sessions: one ranked backlog, an hourly pass over every agent's status and branch, release notes, REALITY.md kept true | email.pm.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("can you coordinate all these actions, all these sessions? ... set up a tight schedule for you, iterate"); earlier brief words 02:12 UTC | each hourly pass leaves a dated entry in `team/email.pm.d/notes/`; every row here carries Asked or Proposed; REALITY.md names the live version
| 2 | The workflow map: the primitives we have (sites, OAuth capabilities on the mailbox, UIs and components, vaults, signatures, the web of trust) against the email workflows they make possible, ranked by how much each removes the sending bottleneck | email.workflows.d with email.pm.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("the bottleneck that we have right now is sending emails ... look at the primitives that we have ... Creating workflows, creating mappings, making workflows actually work") | `docs/plan/workflows.md` holds the map; each workflow names its trigger, the capability (scope) it needs, who approves, what is signed, and an acceptance check; marked plan
| 3 | Make the first real send possible end to end once W1 lands: a written step list for Dinis, checked against the page with made-up data | email.workflows.d | Asked: Dinis, 21 Nov about 15:20 UTC: "the main thing I want to do is to make sure that I can actually open the email and I can start to send from there" | the step list exists in `docs/plan/workflows.md`; each step is run in Chromium against fixtures with no Gmail call, and the run is recorded |
| 4 | Sign everything: every draft, approval and send carries a signature someone can check, and approvals lean on the web of trust (pki.sgit.ai) | email.workflows.d with email.dev.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("leveraging the web of trust that we're going to build, and also leveraging the ability to sign everything, which is super critical here") | a made-up outbox entry goes draft, signed proposal, signed approval, send record, and a test checks each signature and refuses a changed byte
| 5 | Pinning approvers and lane keys in the page: lane keys from team/keys (W5, decided), approvers once Dinis answers W4 | email.dev.d with email.workflows.d | Asked for lane keys: Dinis, 03:59 UTC 22 Nov: "Yeah, teams.keys, that's a good one"; approvers wait on W4 | a fixture entry signed by a pinned approver and a pinned lane key passes decide() in the page; an unpinned one is refused (new tests in tests/decide-page.test.mjs) |
| 6 | Five inbox designs: completely different kinds of inbox and experience, each tried with made-up mail, learning from the best clients out there (studied, not copied) | email.design.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("we can have 5 designs, we can explore completely different types of inboxes, completely different types of experiences, and again, leverage from what the best has been presented out there") | five concepts in `docs/design/`, each with screenshots on made-up mail and what it is good and bad at; Dinis picks which to build further
| 7 | Workflow experiments: small components that trigger key steps (triage, draft, approve, send, follow up) on made-up mail, each one tried, measured and kept or dropped | email.workflows.d with email.dev.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("the ability to create specific application, specific components that can, for example, trigger key parts of the functionality ... We need to basically experiment") | each experiment has a note: what was tried, on which made-up mail, what was learned, keep or drop
| 8 | The trust ladder: from Dinis approving every send, to agent sessions sending some kinds of email under a policy he signed; each rung a proposal for him, through the ABP | email.workflows.d | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("aligned with the human, which is me reviewing it, but eventually allowing the LLMs, the sessions to also send") | a page listing each rung, what it needs (keys, pinned approvers, signed policy, C4), and the ABP change it would need; no rung is used without his approval
| 9 | The gateway's shared top bar | email.design.d | Asked: Dinis, 21 Nov: "ask the design agent to help out to make this look more professional and nice"; the item is design round 1, item 5 | connect.html and mail.html show the same top bar; `node scripts/check-app.mjs` OK; axe clean in Chromium |
| 10 | Group the home page's links | email.design.d | Asked: same words; left over from design round 1 | the home page shows the links in named groups; axe clean |
| 11 | Look at the live client with Dinis's screenshots and the stand-in; list what breaks on real mail | email.design.d | Proposed; follows Dinis's first real use, 22 Nov about 02:05 UTC | a note in `docs/design/` with each issue, a screenshot made with made-up mail, and a proposed fix |
| 12 | Templates in Dinis's voice for the PrompTugal outreach, as proposals | email.workflows.d | Asked: Dinis, 16 Nov about 22:15 UTC, on the outreach workflow: "yes I agree with that workflow, and let's see how it works in practice"; templates per kind of contact are in needs.md step 3 | proposed templates in `sim/` pass the policy checker in tests; marked as proposals until Dinis signs |
| 13 | The real email policy (domains, languages, rates), as a proposal for Dinis to sign | email.workflows.d | Asked: Dinis's outreach defaults, 16 Nov: "yes use those defaults and we will see how they work in practice" | a proposed `policy/email-policy.json` diff, with each value traced to his words; simulator run over the made-up mailbox recorded |
| 14 | CRM: wait for Dinis's words on CRM, then turn them into items | email.crm.d (not started) | Asked: Dinis, in email.pm.d's session, about 04:04 UTC 22 Nov ("That's why CRM is so important, which I'm going to write them next") | his words recorded here with the time; items added
| 15 | Mail client: drafts saved to Gmail | email.dev.d | Proposed (hand-over of 21 Nov); touches Gmail, needs Dinis's word first | against the stand-in, a draft written and closed shows in Drafts and reopens with the same text |
| 16 | Mail client: attachments when composing | email.dev.d | Proposed (same) | against the stand-in, a sent message carries the file; the stand-in log shows one send |
| 17 | Mail client: "load more" in long conversations | email.dev.d | Proposed (same) | against the stand-in, a 60-message conversation shows all 60 after pressing it |
| 18 | Labels kept in sync with Gmail both ways | email.twins.d | Asked: Dinis, 16 Nov about 22:15 UTC: labels "100% in sync with Gmail, both ways" | with the stand-in, a label changed in the client shows in the twin after sync, and a label change written to the twin shows in the stand-in |
| 19 | Deleted messages stay in the twin's backup | email.twins.d | Asked: Dinis, 16 Nov about 22:15 UTC: "Deleted messages stay in the twin's backup" (recorded in the first-run hand-over) | a test: a message removed from the made-up mailbox stays in the twin with a deleted mark |
| 20 | Time travel: the twin as it was on a given day (feature 11) | email.twins.d | Proposed (features.md, a plan) | a test reads the made-up twin at two dates and gets two different message lists |
| 21 | The correspondents index and what counts as a verified address (first contact) | email.contacts.d | Proposed (brief) | `docs/plan/contacts.md` states the rule; tests show the checker treats a verified address as a reply and an unknown one as a first contact |
| 22 | Merge one person across several addresses | email.contacts.d | Proposed (brief) | a test with made-up addresses merges two into one contact and keeps both addresses |
| 23 | A contact page in the client, from the twin | email.contacts.d | Proposed (brief) | against made-up data, the page lists threads with that person; check-app OK |
| 24 | Follow-ups: "no reply in five days" becomes a drafted nudge awaiting approval (feature 8) | email.crm.d with email.workflows.d | Proposed (features.md, a plan) | a test over the made-up twin finds the threads with no reply after five days and writes draft proposals, none sent |
| 25 | "Who waits on whom" view (feature 13) | email.crm.d | Proposed (features.md, a plan) | against the made-up twin, the view lists each open thread with who owes the next reply |
| 26 | `docs/plan/crm.md`: how a CRM draft becomes an outbox entry with its `client_ref`, agreed with crm.ios@sgit.dinis | email.crm.d | Proposed (brief; format v1 was agreed 16 Nov) | the page exists, marked plan, and names each field and its source in the twin format |
| 27 | Message bodies in the twin | email.twins.d | Proposed; needs a policy change and Dinis's approval first (N5) | not to start until Dinis approves the ABP change |

## 4. First three items per agent

Set by email.pm.d on Dinis's word in its session, about 04:04 UTC 22 Nov: "can you coordinate all these actions, all these sessions? ... set up a tight schedule for you, iterate". Dinis can change any of these.

- **email.pm.d:** rank 1 (coordination, hourly); rank 2 with email.workflows.d (the map); release notes per release.
- **email.workflows.d:** ranks 2, 3, 7.
- **email.design.d:** ranks 6, 9, 11.
- **email.dev.d:** rank 5 (lane keys from team/keys now; approvers when W4 is answered); rank 4 with email.workflows.d; integrating the others' branches and releasing on Dinis's word.
- **email.twins.d, email.contacts.d, email.crm.d:** not started; their first items when conductor.d starts them (twins 18, 19, 20; contacts 21, 22, 23; crm 14 first, then 26, 24, 25).

## 5. REALITY.md: what the live check found

Fixed on work/email.pm.d, 22 November 2026, about 04:03 UTC, for email.dev.d to review and release:

1. The header now names the live check: v0.1.51 at 189ac49.
2. The long-subject fix is recorded as live (576bef9, v0.1.51).
3. email.pm.d is recorded as started, with its key (public half not yet merged).

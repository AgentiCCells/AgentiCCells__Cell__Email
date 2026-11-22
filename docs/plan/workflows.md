# Workflows: from draft to sent

**Status: a proposal** by email.workflows.d@AgentiCCells.dinis, 22 November 2026, scope approved by conductor.d@AgentiCCells.dinis at 04:04 UTC. Nothing here is decided until Dinis says so. The writer and its tests are **built (simulation)** in `sim/workflows/`, with made-up mail and keys made fresh for each run. No agent signs real outbox entries yet, and no real email has been sent from the page. [Back to the plan](index.md).

What this page covers, from the brief: the outbox and its entries, approvals, templates in the signer's voice, follow-ups, signed automations in the email policy, and agents' signed proposals (`signed.json`).

## What Dinis has said

- 16 November 2026, about 22:15 UTC, on conductor@PrompTugal.dinis's outreach workflow: "yes I agree with that workflow, and let's see how it works in practice". Agents draft into the PrompTugal outreach vault; Dinis approves and sends in the page; every send passes the email policy checker; the twin writes "replied". (From `board/handovers/2026-11-16-first-run.md`.)
- The same evening, on the outreach defaults: "yes use those defaults and we will see how they work in practice". The defaults: every email approved by Dinis in the page; one recipient (up to three from one organisation, no cc or bcc); 20 a day, one per recipient a day; English and Portuguese; only small inline images.
- 21 November 2026, 21:48 UTC, "yes" to ABP 1.1.4: until decide() runs in the page, a person's press of Approve and send on one email, after the page's checks, is the approval.
- 22 November 2026, 03:59 UTC, relayed by conductor.d: agents' lane keys come from team/keys ("Yeah, teams.keys, that's a good one").
- 22 November 2026, about 04:08 UTC, in this agent's session: "the pinned approvals are defined by the agentic workflows and the keys that are published, and from a browser point of view ... we should be using the QR codes to transmit keys" and "the lane keys ... are created by vaults ... it just depends on the workflow and who's listening". And: "I want you to think in terms of state machines, and I want you to think about every action that happens here is actually a workflow". His full words: `team/email.workflows.d/notes/2026-11-22-dinis-workflows-as-state-machines.md`.

## Every action is a workflow

The workflows are now written as state machines, each with a goal (its end state), the moves between states, who makes each move, and which code decides it. A workflow can use whole workflows as single steps. The map, the paths through each machine and what each one needs to scale are on [the workflow machines](workflow-machines.md) page, generated from `sim/workflows/machines.mjs`.

## One path for every workflow

1. **Draft.** An agent writes an outbox entry: a folder in the outbox vault with `meta.json`, `body.txt` and, once agents sign, `signed.json`.
2. **Open.** The person opens the entry in the gateway page (`/app/connect.html`) and sees the exact To, Cc, Subject and text.
3. **Check.** The page runs its own checks (`src/app/send.js`: status, recipients, no Bcc, no key material, at most 20 a day). If the entry carries `signed.json`, it also runs the full check (C4, `decideEntry()` in `src/app/cell/decide.mjs`) and refuses anything that is not exactly the email the agent signed, under policy files a pinned approver signed, that the email policy allows.
4. **Approve and send.** The person presses Approve and send and confirms. That press is the approval. The page sends one email with the person's own token.
5. **Record.** The page writes `status: sent`, the time, Gmail's ids and who approved into `meta.json`.
6. **Replied.** When an answer arrives, the twin sync sees it in the thread (plan: the CRM component, email.crm.d, marks the relationship).

No agent sends. No agent holds a token. A held email (first contact, free text, no automation) goes to the person; only a deny stops it outright.

## The three workflows

| | Outreach | Reply | Follow-up |
|---|---|---|---|
| What it is | A first email to someone who has not written to the mailbox | An answer to a message in the twin | A reply to our own email that got no answer, in the same thread |
| First real use | The PrompTugal outreach (approved 16 November) | none yet | none yet |
| Who drafts | The outreach agent (for PrompTugal, conductor@PrompTugal.dinis) | A drafting agent, or the person | A drafting agent, when a thread has waited N days (N is for Dinis) |
| Lane entry | `propose.send` | `propose.reply`, `in_reply_to` set | `propose.reply`, `in_reply_to` our own message |
| Template | Free text in the signer's voice (proposal: a template per campaign later) | A template from the email policy, or free text | `followup-en` or a Portuguese one (proposal) |
| Who approves | The person, every time (first contact) | The person; a signed automation only for a fixed template to a verified correspondent | The person, every time (the recipient never wrote: a first contact) |
| What the page checks | send.js, then C4 if signed | the same | the same |
| Expected C4 result | hold: first contact, so the press decides | allow under an automation, or hold | hold: first contact |

Made-up examples of all three are in `sim/workflows/fixtures.mjs`, written against the simulated mailbox.

## What the outbox records (`meta.json`)

Written by the drafting agent:

| Field | Meaning |
|---|---|
| `to`, `cc`, `subject` | what the page shows and sends; must be exactly what was signed |
| `status` | `draft` until sent |
| `workflow` | `outreach`, `reply` or `follow-up` (proposal) |
| `proposed_by`, `proposed_at` | the drafting agent and the time on its lane entry (proposal) |
| `action` | the hash of the signed lane entry, so the sent record points at what was approved (proposal) |
| `language`, `template`, `in_reply_to`, `thread_id`, `client_ref` | when they apply |

Added by the page when it sends (built): `status: sent`, `sent_at`, `gmail_id`, `gmail_thread_id`, `approved_by`.

The text is in `body.txt`. The page trims the subject and addresses, so the writer refuses a subject or address with spaces around it rather than sign one thing and show another.

## How a drafting agent writes `signed.json` (proposal, built in simulation)

`sim/workflows/signed.mjs`, `writeEntry()`:

1. Takes one email and the workflow name, and refuses what the workflow forbids (an outreach that answers something, a reply without `in_reply_to`, Bcc, padded subjects).
2. Appends a `propose.send` or `propose.reply` entry to the agent's own chain on the actions lane, signed with its Ed25519 lane key (`cell/lanes/entry.mjs`).
3. Writes `meta.json` and `body.txt` from that same email, and `signed.json` as the format in email.dev.d's note: `{ chains, policy, agents, signatures }`, where `chains` is the agent's whole actions chain from seq 1 (so the page can check every prev link) and `signatures` are the two policy signatures a pinned approver made.
4. Never writes keys, a registry or approvers into the entry. The page ignores them and takes its own.

`checkEntry()` lets the agent ask, before it writes, what the page will say: send.js's problems and `decideEntry()`'s verdict. The tests (`sim/workflows/workflows.test.mjs`, 9 tests, proposed to email.dev.d for `tests/`) show:

- all three workflows pass to the person's press with the simulated twin;
- an entry changed after signing (To, Cc, Subject or text) is refused;
- the files read back from disk give the same verdict;
- with the page as it is today (no lane keys, no approvers) every signed entry is refused;
- with the page's empty twin, outreach passes but replies and follow-ups are refused (no parent in the twin);
- a second entry carries the whole chain and both still pass.

One limit: the chain grows with every proposal, and every entry carries all of it. That is fine for tens of emails. For more, the lanes belong in the vault as append lanes (`docs/plan/lanes.md`), and `signed.json` would point at them.

## Where lane keys and approvers come from

Lane keys: from team/keys, as Dinis said. Proposal: each agent's entry gains `lane_key`, an Ed25519 public key (SPKI PEM). The sgit `sign` key is ECDSA P-256, which the lanes do not use. The page would build the entries in, the way `trusted.js` is built.

Pinned approvers: Dinis, about 04:08 UTC: they "are defined by the agentic workflows and the keys that are published", and in the browser keys travel by QR code. So pinning an approver is itself a workflow (`pin-approver` on the machines page): the approver's key arrives through the QR key exchange the page already has (`key-by-qr`), is checked against the key they published, and the person confirms. `sim/workflows/pins.mjs` gives the published-key sources one shape, the one `decideEntry()` takes (`{ registry, approvers }`):

- `fromTeamKeys()`: the published key is in team/keys, on the cell's own site.
- `fromRegister()`: the identity is pinned and the key looked up in a register (pki.sgit.ai's, in a real page; a made-up one in the tests).

Lane keys, Dinis: "created by vaults ... it just depends on the workflow and who's listening", usually an observability or feedback agent. To work out next: which listener reads which lane, per workflow.

## Open, for Dinis (proposals)

1. **The outreach agent in the policy.** conductor@PrompTugal.dinis is not in `policy/agents.json` or in the policy's `proposers`, so a signed proposal from it would be refused. Proposal: a role `outreach` that may write `propose.send` and `withdraw` on the actions lane, and a real email policy, signed by Dinis, that names it.
2. **The outreach defaults as policy.** Most map onto the email policy: `recipients.max` 3, `allow_bcc` false, `rates.per_day` 20, `rates.per_recipient_per_day` 1, `languages` en and pt, `attachments.allow_mime` small inline images. Two do not: "no cc" and "from one organisation". Proposal to email.dev.d: `recipients.allow_cc` and `recipients.one_domain` in the checker. The page's own checks today allow Cc.
3. **The twin in the check.** With the empty twin, replies and follow-ups are refused. They need the synced twin loaded into the check (email.dev.d's note, item 3; email.twins.d's area).
4. **Follow-ups that run themselves.** Today a follow-up is drafted by an agent and sent by the person's press. Sending one without a press needs a signed automation and a gateway that runs without the person (ABP N1 reopens). Proposal: not before the first hundred sends by press work as expected.
5. **Templates in the signer's voice.** Proposal: the person writes or approves a template per campaign, and the agent fills only the named slots; free text stays with a person.
6. **Who sets N** (days before a follow-up), per workflow.

## Files

| File | What it is |
|---|---|
| `sim/workflows/signed.mjs` | the writer: `writeEntry()`, `checkEntry()`, `saveEntry()`, `laneEmail()` |
| `sim/workflows/pins.mjs` | the two approver sources, one shape |
| `sim/workflows/fixtures.mjs` | made-up emails for outreach, reply and follow-up |
| `sim/workflows/workflows.test.mjs` | 9 tests; proposed for `tests/` |
| `sim/workflows/machines.mjs` | the workflows as state machines, with a structure check, `run()` and `paths()` |
| `sim/workflows/render.mjs` | writes [the workflow machines](workflow-machines.md) page and a page of SVG diagrams |
| `sim/workflows/machines.test.mjs` | 6 tests; proposed for `tests/` |

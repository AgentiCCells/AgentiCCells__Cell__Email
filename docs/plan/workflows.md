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

The workflows are now written as state machines, each with a goal (its end state), the moves between states, who makes each move, and which code decides it. A workflow can use whole workflows as single steps. The map, the paths through each machine and what each one needs to scale are on [the workflow machines](workflow-machines.md) page, generated from `sim/workflows/machines.mjs`. How the cell gets from Dinis pressing every send to sessions sending under his signed policy, one rung at a time, is on [the trust ladder](trust-ladder.md).

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

## The first real send: Dinis's step list (proposal)

Backlog: "make the first real send possible end to end once W1 lands". Dinis, 21 November 2026, about 15:20 UTC: "the main thing I want to do is to make sure that I can actually open the email and I can start to send from there." The machine is `first-send` on [the workflow machines](workflow-machines.md) page.

It waits on W1: conductor@PrompTugal.dinis gives Dinis a sealed QR code with the outbox vault key, made for his page's public key. Then, on his own device:

1. Open `/app/connect.html` and press **Connect** (done before; the token is kept).
2. **Swap keys:** paste or drop the sealed QR code. The page keeps the outbox key only if conductor@PrompTugal.dinis signed it.
3. Press **Open vault**. The outbox lists its entries.
4. Open the entry addressed to himself. Check To, Subject and text on screen.
5. Press **Allow sending** if the page asks (it grants `gmail.send`).
6. Press **Approve and send**, then confirm.
7. Check his inbox for the email, and that the entry now says "sent", with Gmail's id.

The entry for this first send must be **unsigned** (no `signed.json`), so it goes by the press path of ABP 1.1.4. A signed entry addressed to the mailbox itself is refused by the email policy ("the mailbox may not send to itself"), which is right for agents' sends.

**Checked in Chromium 157, 22 November 2026, 06:18 UTC, with made-up entries** (`sim/workflows/first-send-browser.mjs`, run recorded in `team/email.workflows.d/notes/runs/2026-11-22-first-send-chromium.json`). The page's own modules ran the checks of steps 4 to 6 and built the message. A stand-in for Gmail received one request per sendable entry, carrying the made-up token and exactly the entry's To, Subject and text. Every other host was blocked, and none was asked for. Results:

| Entry | Page checks | Full check (C4) | Sent to the stand-in |
|---|---|---|---|
| to himself, unsigned | pass | not run (the press decides) | yes |
| outreach to a made-up address, signed | pass | press (held: first contact) | yes |
| to himself, signed | pass | refused (the mailbox may not send to itself) | no |

**Then through the page's own buttons, 22 November 2026, 08:24 UTC** (`sim/workflows/first-send-page.mjs`, run recorded in `team/email.workflows.d/notes/runs/2026-11-22-first-send-page-chromium.json`). It used an in-memory stand-in for the vault service (the read, write and batch calls the vendored vault library makes) and a stand-in for Gmail, with every other host blocked. The page loaded with the made-up Google token kept, which is step 1. Steps 3 to 7 then ran by pressing the real buttons:

- **Open vault:** "Outbox open: 1 message."
- **Open:** "Sends from owner@example.org to owner@example.org, exactly as shown." The full check did not run, because the entry is unsigned.
- **Approve and send:** the confirm dialog asked "Send ... now?" and was accepted. Result: "Sent (Gmail id standin-1) and recorded in the outbox."
- **Read back:** `meta.json`, read back from the vault stand-in by a fresh vault object, says `status: sent` with Gmail's id, the time and who approved.
- **Requests:** the Gmail stand-in received exactly three: profile, labels and one send, each with the made-up token.

Still not run: step 2, the paste. The page takes a sealed key only from a trusted sender, whose private key this agent does not hold, so the run kept the made-up outbox key where the paste would keep it (sealed to the page key). Two small things seen, for email.dev.d and email.design.d: after sending, the open entry still says "Status: draft" while the list line says "sent"; and Open vault also creates a twin vault when the browser has none (expected, but worth a line on screen).

## The real outreach policy (proposal for Dinis to sign)

Backlog: "the real email policy ... as a proposal for Dinis to sign". Made by `outreachPolicy()` in `sim/workflows/policy-outreach.mjs`; the machine is `campaign-policy`.

**One finding shapes it.** The checker allows only recipients whose domain or address the policy lists. So each outreach campaign gets its own policy that carries the campaign's address list. Dinis signs the list together with the rules, and an agent can never write to anyone he has not signed for. He approves the list once, then each email once.

| Value | Proposed | Source |
|---|---|---|
| `recipients.max` | 3 | Dinis, 16 Nov: "one recipient (up to three from one organisation" |
| `recipients.one_domain` | true | the same: "from one organisation" |
| `recipients.allow_cc`, `allow_bcc` | false | the same: "no cc or bcc" |
| `recipients.allow_addresses` | the campaign's list | proposal (see above) |
| `languages` | en, pt | Dinis: "English and Portuguese" |
| `rates.per_day` | 20 | Dinis: "20 a day" (also the page's own limit) |
| `rates.per_recipient_per_day` | 1 | Dinis: "one per recipient a day" |
| `rates.per_agent_per_day` | 20 | proposal: one agent drafts the campaign |
| `attachments.allow_mime` | image/png, image/jpeg | Dinis: "only small inline images"; the checker cannot check "small" yet (a size limit is proposed to email.dev.d) |
| `automations` | none | Dinis: "every email approved by Dinis in the page" |
| `proposers` | the campaign's agent, person:owner | proposal |

Dinis's defaults are from 16 November 2026, about 22:15 UTC: "yes use those defaults and we will see how they work in practice".

**Checked with made-up addresses** (`sim/workflows/round4.test.mjs`, 5 tests):
- A listed address, in English or Portuguese, is held for Dinis's press and never allowed on its own.
- Each default refuses what it should: cc, bcc, two organisations, four recipients, an unlisted address, Spanish, a PDF, a second email to the same person on the same day, the 21st of the day, and a proposer that is not the campaign's.
- End to end: a signed entry from the outreach agent passes to Dinis's press when agents.json has an outreach role (proposed, `outreachAgents()`). With today's agents.json, the same entry is refused.

For Dinis: the outreach role in agents.json, and this policy for the first campaign, signed by him. Templates in his voice (backlog 13) are not written here: the brief says the real outreach drafts are conductor@PrompTugal.dinis's, and this agent designs the workflow, not the emails.

## Where lane keys and approvers come from

Lane keys: from team/keys, as Dinis said. Proposal: each agent's entry gains `lane_key`, an Ed25519 public key (SPKI PEM). The sgit `sign` key is ECDSA P-256, which the lanes do not use. The page would build the entries in, the way `trusted.js` is built.

Pinned approvers: Dinis, about 04:08 UTC: they "are defined by the agentic workflows and the keys that are published", and in the browser keys travel by QR code. So pinning an approver is itself a workflow (`pin-approver` on the machines page): the approver's key arrives through the QR key exchange the page already has (`key-by-qr`), is checked against the key they published, and the person confirms. `sim/workflows/pins.mjs` gives the published-key sources one shape, the one `decideEntry()` takes (`{ registry, approvers }`):

- `fromTeamKeys()`: the published key is in team/keys, on the cell's own site.
- `fromRegister()`: the identity is pinned and the key looked up in a register (pki.sgit.ai's, in a real page; a made-up one in the tests).

Lane keys, Dinis: "created by vaults ... it just depends on the workflow and who's listening", usually an observability or feedback agent. To work out next: which listener reads which lane, per workflow.

## Open, for Dinis (proposals)

1. **The outreach agent in the policy.** conductor@PrompTugal.dinis is not in `policy/agents.json` or in the policy's `proposers`, so a signed proposal from it would be refused. Proposal: a role `outreach` that may write `propose.send` and `withdraw` on the actions lane (`outreachAgents()`, tested), and the campaign policy above, signed by Dinis.
2. **The outreach defaults as policy.** Written: see "The real outreach policy" above. email.dev.d added `recipients.allow_cc` and `recipients.one_domain` to the checker (release/next, 77a0ee6), so "no cc" and "one organisation" are now expressible. Still open: "small" for inline images (a size limit), and the page's own checks still allow Cc.
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
| `sim/workflows/first-send-page.mjs` | the first send through the page's buttons, with stand-ins for the vault service and Gmail |
| `sim/workflows/first-send-browser.mjs` | the first send's checks run in Chromium against made-up entries and a stand-in for Gmail |
| `sim/workflows/policy-outreach.mjs` | the proposed outreach policy, its trace, and the outreach role for agents.json |
| `sim/workflows/machines.mjs` | the workflows as state machines, with a structure check, `run()` and `paths()` |
| `sim/workflows/render.mjs` | writes [the workflow machines](workflow-machines.md) page and a page of SVG diagrams |
| `sim/workflows/machines.test.mjs` | 6 tests; proposed for `tests/` |

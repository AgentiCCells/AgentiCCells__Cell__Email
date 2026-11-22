# The trust ladder: from every press to sessions sending

**Status: a proposal** by email.workflows.d@AgentiCCells.dinis, 22 November 2026, for backlog item 9 (asked of this agent by email.pm.d at 09:27 UTC). Rung 0 is how the page works today. Every other rung is a plan. No rung above 0 is used until Dinis approves it, and each one needs a change to the cell's Agent Behaviour Policy ([abp/cell-email](../../abp/cell-email.md)). The wording below is a proposal only: this agent never edits `abp/`. [The workflows](workflows.md). [The workflow machines](workflow-machines.md) (machine `trust-ladder`). [Back to the plan](index.md).

Dinis, 22 November 2026, about 04:04 UTC, in email.pm.d's session:

> "For email workflows, but aligned with the human, which is me reviewing it, but eventually allowing the LLMs, the sessions to also send, but also already leveraging the web of trust that we're going to build, and also leveraging the ability to sign everything"

The ladder is how to get from "me reviewing it" to "the sessions to also send" one step at a time. Each rung moves one kind of decision from a person's press to something signed that a person can check afterwards. Each rung can be left the same way it was entered.

## The rungs at a glance

| Rung | Who decides each send | What is signed | Needs | Status |
|---|---|---|---|---|
| 0. Every email pressed | the person, one press per email | nothing (the press is recorded in `meta.json`) | `gmail.send`, the outbox key | built; not yet used on a real mailbox |
| 1. Signed proposals | the person, one press per email | each agent's draft, on its lane | lane keys, pinned approvers, a signed policy | simulation |
| 2. Signed approvals | the person, one press per email, signed | drafts and the person's approvals | the person's own lane key in the page | plan |
| 3. One press for a batch | the person, one press for a reviewed batch | drafts, approvals, and the automation that groups them | a signed automation per kind of email | plan |
| 4. Sends without a press | a signed automation, for fixed kinds only | everything above, plus each send record | a gateway that runs without the person's browser | plan |
| 5. Sessions send under policy | agent sessions, for the kinds the policy allows | everything | rungs 1 to 4 working, and the web of trust | plan |

## Rung 0: every email pressed (today)

- **How it works:** an agent writes an outbox entry, with `meta.json` and `body.txt` and no signature. The person opens it in the page and the page's checks run (`src/app/send.js`: status, recipients, no Bcc, no key material, at most 20 a day). The person presses Approve and send and confirms. The page records who approved, and when, in `meta.json`.
- **Needs:** `gmail.send` (Allow sending) and the outbox vault key (W1).
- **ABP:** C4 as approved in 1.1.4 (Dinis, 21 November 2026, 21:48 UTC: "yes").
- **Checked by:** `tests/send.test.mjs`, and the first-send runs in Chromium against stand-ins (`sim/workflows/first-send-page.mjs`).
- **Step down:** there is no rung below. Stopping means not pressing, or pressing Disconnect.

## Rung 1: signed proposals

- **How it works:** each drafting agent signs its draft on its actions lane and writes `signed.json` beside the entry (`sim/workflows/signed.mjs`). Before the press, the page runs the full check (C4, `decideEntry()`), which checks five things:
  - the lanes verify;
  - both policy files are signed by an approver the page has pinned;
  - the email shown is exactly the one the agent signed;
  - no one rejected or withdrew it;
  - the email policy does not deny it.
  The person still presses for every email.
- **What it adds:** a changed byte, an unknown agent, or a draft outside the policy is refused before the press. The person no longer has to catch those by eye.
- **Needs:**
  - each agent's Ed25519 lane key published in team/keys (W5, decided; blocked on W9);
  - approvers pinned in the page (W4);
  - the policy and agents files signed by Dinis (W15, the campaign policy and the outreach role).
- **ABP change (proposal):** C4 gains: "An outbox entry that carries `signed.json` is sent only if decide() in the page passes it; an entry without one keeps the person's-press path." This only adds refusals, so N8 holds as it is.
- **Checked by:**
  - `tests/decide-page.test.mjs` and `tests/workflows.test.mjs`: a changed email, an unpinned approver, an unsigned policy and the kill switch are all refused;
  - in the browser, 22 November 2026, 09:30 UTC (`sim/workflows/signed-page.mjs`, run recorded in `team/email.workflows.d/notes/runs/2026-11-22-signed-page-chromium.json`). Three made-up entries were opened through the gateway page against stand-ins for the vault service and Gmail: a signed outreach, the same entry with its To changed after signing, and an unsigned entry.
    - **The page as built** (nothing pinned) refused both signed entries ("author has no registered key"). Approve and send was disabled for them, and the unsigned entry kept the press path.
    - **A test copy of the page** with only its two empty pin lists filled with the run's made-up keys passed the signed outreach ("Full check (C4): passed") and refused the changed one ("not one that an agent proposed and signed"). Pressing Approve and send on the signed entry sent it once to the Gmail stand-in and recorded it in the outbox.
    - So rung 1 works in the browser once keys and approvers are pinned; where they come from is W4 and W5.
- **Step down:** unpin the approvers, or drop the lane keys from the page. Every signed entry is then refused, and unsigned entries keep rung 0. For an immediate stop, any agent may write a signed `gateway.stop`.

## Rung 2: signed approvals

- **How it works:** the person's press writes a signed `approve` entry on the approvals lane, referring to the agent's proposal. `meta.json` records the press as well, as today. The send record (the outbox lane) refers to that approval. Anyone holding the lanes can check afterwards who approved each email, without trusting the page's own record.
- **Needs:**
  - a lane key for the person in the page: Ed25519 in WebCrypto, non-extractable, kept like the page's other keys;
  - that key pinned as an approver. Dinis's reading (04:08 UTC): approvers "are defined by the agentic workflows and the keys that are published", carried by QR code, so this is the `pin-approver` workflow;
  - the web of trust (pki.sgit.ai) to bind the key to the person.
- **ABP change (proposal):** C4: "Each approval is a signed `approve` entry by a pinned approver; the outbox records the approval it acted on." A new expectation: "the page never signs an approval without the person's press."
- **Checked by:** a test where a sent record without a verifying approval fails the merge. `mergeLanes` already refuses "sent without an approval or a policy allow" in simulation (`tests/lanes.test.mjs`). There would also be a page run where the press writes the entry and a fresh device verifies it.
- **Step down:** the page goes back to recording the press only in `meta.json` (rung 1). Signed approvals already written stay valid as history.

## Rung 3: one press for a reviewed batch

- **How it works:** a signed automation in the email policy names a kind of email, for example the fixed Portuguese thank-you template to verified correspondents (`auto-reply-pt-thanks` in the simulated policy). The page groups the entries the automation covers and shows them as a list. The person reads the list and presses once, and the page sends each one in turn. Anything the automation does not cover still needs its own press.
- **What it adds:** the press count stops growing with the number of emails of one kind. This is the first rung that eases the sending bottleneck itself, and the token still never leaves the person's browser (N1 unchanged).
- **Needs:**
  - rungs 1 and 2;
  - automations in a policy Dinis signed, each naming its agent, kinds, languages and templates (the checker already reads them);
  - the twin loaded into the check, so "verified correspondent" can be tested (a backlog item for email.dev.d with email.twins.d);
  - a per-batch cap (proposal: 10).
- **ABP change (proposal):** C4: "A person may approve, with one press, a batch of entries that a signed automation covers, after seeing every recipient and subject in it; each send in the batch is recorded against that one signed approval."
- **Checked by:** tests where an entry outside the automation drops out of the batch, the cap holds, and a changed template text breaks the batch. A page run then shows the list and the one press.
- **Step down:** Dinis signs a policy without automations. The batch view disappears and every entry needs its own press again (rung 2).

## Rung 4: sends without a press, for fixed kinds

- **How it works:** a gateway that runs without the person's browser sends the emails that a signed automation allows. The person sees them afterwards in the outbox and on the observability agent's daily list. Every other email still waits for a press.
- **Needs:**
  - rung 3, working for long enough that Dinis trusts it (proposal: a hundred batch sends with nothing that should not have gone);
  - a place for the token outside the browser, which reopens N1;
  - a signed send record for each email;
  - the kill switch reachable by every agent and by Dinis from his phone.
- **ABP change (proposal):** this is the largest change, so it would be a separate review by specialist.abp before Dinis decides.
  - N1 changes from "only the user's own browser session holds the Google token" to naming the one gateway that may also hold it, where it runs, and that it holds only `gmail.send`.
  - C4 adds: "a signed automation may send without a press, only for the kinds it names, at most N a day, and every such send is reported to the person the same day."
- **Checked by:** the same tests as rung 3, plus tests where the gateway refuses everything after `gateway.stop`, refuses past the daily cap, and refuses any kind the automation does not name. A week of sends would also run against a stand-in for Gmail before any real one.
- **Step down:** `gateway.stop` stops it at once. Dinis then signs a policy without press-free automations (rung 3), and the gateway's token is revoked in Google's console.

## Rung 5: sessions send under a signed policy

- **How it works:** agent sessions draft, check and send the kinds of email the signed policy allows: outreach to a signed campaign list, replies of a known kind, follow-ups. They do it under their own lane keys, bound to their identity in the web of trust. Dinis reviews by exception: the outbox, the daily list, and anything the policy holds for him.
- **Needs:**
  - rung 4;
  - each session's identity in the web of trust (pki.sgit.ai), so a send can be traced to a named agent and its key;
  - per-agent rates in the policy;
  - a feedback agent that compares what was sent with what was proposed.
- **ABP change (proposal):** C4: "An agent session listed in a signed policy may send the kinds of email that policy names, through the gateway, under its own key; the person may stop any agent or all of them at any time." N11 ("send an email ... from the build session") stays: build sessions never send, only the named sending agents do.
- **Checked by:** all of the above per agent, plus a test where an agent whose key is not in the web of trust is refused.
- **Step down:** remove the agent from the signed policy (rung 4), or stop the gateway.

## Stepping down, in short

| From | Fastest way down | Then |
|---|---|---|
| any rung | a signed `gateway.stop` from any agent or person: every signed send is refused at once | Dinis starts the gateway again when he is ready |
| 5 | remove the agent from the signed policy | rung 4 |
| 4 | sign a policy without press-free automations; revoke the gateway's token | rung 3 |
| 3 | sign a policy without automations | rung 2 |
| 2 | stop writing signed approvals | rung 1 |
| 1 | unpin approvers or lane keys: signed entries are refused | rung 0 |

## Where this agent is on it

Rung 0 is ready for W1 (`docs/plan/workflows.md`, "The first real send"). Rung 1 works in simulation and in the browser with test pins (`sim/workflows/signed-page.mjs`), and waits on W4, W5 and W15 for real pins.

# Workflows and the virtual inbox: a design (proposal)

By crm.dev.a@AgentiCCells.dinis, 23 November 2026, 23:41 UTC (clock), for Dinis, a.mail.conductor and mail.dev.a. **A proposal, design and demo only**: no real mailbox data, no new Google scope. To be agreed with mail.dev.a, who owns the mail side.

## Why
Dinis, 23 November 2026, 23:35 UTC (this session): "I have a whole bunch of contacts that I want to start creating. And we need to start mapping the workflows. And this is where we need to have those sort of email twins and the ability to operate on a virtual inbox that we then give ... our Gmail agent going on the website, the ability to then work on it and send the emails."

## The idea in one paragraph
The **virtual inbox** is the person's mail twin (twin format v1, already built and synced by the Email Cell's page) plus two folders an agent may write to: `outbox/` (draft emails) and `proposals/` (CRM changes). The agent reads the twin's cleaned copy and the CRM, and writes only drafts and proposals. Nothing leaves and nothing in the CRM changes until the person presses a button in their browser, which already works for sending (the Email Cell's approve and send, with the person's own Gmail token) and for CRM writes (this site's show-then-write panel). The demo runs the same loop on the synthetic twin, with the Email Cell's FakeGmail.

## Where things live
| What | Demo | Real |
|---|---|---|
| Mail twin (`mail/`, twin v1) | public synthetic vault (mail.dev.a's; id in team/mail.dev.a/status.json) | the person's twin vault, made and synced by the Email Cell's page in their browser |
| CRM (`orgs/`, `people/`, `crm/`) | bundle in the site, and vault egw210lk | the person's CRM vault, made on this site ("Start a new CRM vault") |
| Outbox (drafts) | `drafts/` in the twin (made by the generator; follow-up drafts carry `in_reply_to` and `thread_id` since a69d321) | the Email Cell's outbox vault: one folder per email, `meta.json` plus `body.txt`, optional `signed.json`. Opened and sent today on the gateway page (connect.html, Approve and send); the send screen reading the outbox is a later step for mail.dev.a, after D7/D1 and Dinis's answer on where contacts come from |
| Proposals (CRM changes from an agent) | in the tab | `proposals/<id>.json` in the CRM vault, written by the agent, applied only by the person's press |
| Sending | FakeGmail: nothing leaves | the person's own Gmail token in their browser, `gmail.send` (already approved, ABP 1.1.4); at most 20 a day |

## The workflows
Each one says who acts, what is written where, and the press that makes it real.

1. **Add contacts** (built today). The person adds companies and people on the CRM site; each write is shown first and is one commit in their CRM vault. Later: import a list (CSV) through the same panel, shown as one batch.
2. **First email to a new contact.** The agent sees a person with no thread and no draft. It writes a draft to the outbox (`meta.json`: to, subject, status "draft", `person`, `org`; `body.txt`) and a proposal "stage: contacted when sent". The CRM board shows "Draft waiting". The person opens it on the gateway page (later: the send screen), edits if they like, presses Approve and send. The page records `sent` in `meta.json`.
3. **Follow-up: no reply in 5 days** (the list is built today). For each such thread, the agent writes a follow-up draft in the same thread (`in_reply_to`, `thread_id`). Same press to send.
4. **A reply comes in.** The next twin sync brings it. The CRM shows the new last contact (built: derived from the twin). The agent proposes a stage change or a next step; the person accepts or rejects it on the company page.
5. **Next step due.** The board already marks overdue next steps. The agent proposes a draft or a reminder; the person decides.
6. **Link a thread** (built today). The person links a thread to a company by hand; later the agent proposes links for threads it can match, and the person accepts them.
7. **Feedback loop.** The person sends a request to the CRM's keeper agent from the site's /send/ page (the Sovereign Website pattern: sealed, signed, read only in the browser), for example "draft first emails to the five investors I added today". The keeper replies the same way and does the work as drafts and proposals. Waiting on the reference code (R11).

## What an agent may and may not do
- May: read the twin's `clean/` copy and the CRM; write drafts to the outbox and proposals to `proposals/`.
- May not: send; change the CRM directly; read `raw/`; write to the twin; hold the person's Gmail token. These follow the Email Cell's ABP and lanes. Today every signed draft (`signed.json`) is refused (fail closed) until approvers and lane keys are pinned, so agent drafts go unsigned and the person's press is the approval (ABP 1.1.4).

## New shapes (proposed)
- `proposals/<id>.json`, `crm.proposal/1`: {id, by (agent), at, why, files: [{path, text|null}]}. The page shows the files exactly as the link panel does; Accept writes them as one commit and records the decision in the proposal; Reject records it and writes nothing else.
- Outbox `meta.json` gains optional `person` and `org` (ids), so a sent email maps to its CRM row without a lookup. Agreed by mail.dev.a (msg 23:43): send.js ignores unknown fields today and will carry them into the sent record.

## Demo first
1. The demo generator adds two or three proposals and keeps its drafts; the CRM shows a "Proposals" list. There is no channel between the CRM tab and the send screen (another origin, and the send screen holds the Gmail token: mail.dev.a will not open one without the ABP and Dinis), so in the demo the CRM marks a draft "opened in the send screen" when its link is pressed and offers a demo-only "Mark as sent (simulation)". In real mode the CRM reads `status: "sent"` from the outbox's `meta.json` after the person's press.
2. A short demo script walks workflows 2 to 4 in the browser, with screenshots.

## One-way steps for Dinis (none taken here)
1. Making his real CRM vault and putting his real contacts in it: his own action on the site, with his own access token.
2. Giving an agent read access to his real twin's `clean/` (a read key) and write access to his outbox and `proposals/`.
3. Pinning the agent's lane key and an approver in the gateway, so signed drafts can pass (today every signed entry is refused).
4. Each real send: one press per email, as now.
5. Issuing his person key for the CRM's /send/ page (the feedback loop).
6. For Site__Tool__Gmail: the new OAuth origin and redirect, the new address, and its ABP (a.mail.conductor's list).

Updated 23:45 UTC (clock) with mail.dev.a's corrections (msg 23:43).

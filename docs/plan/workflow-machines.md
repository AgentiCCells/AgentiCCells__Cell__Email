# The workflow machines

**Status: a proposal, generated** from `sim/workflows/machines.mjs` by `node sim/workflows/render.mjs`; do not edit by hand. Written by email.workflows.d@AgentiCCells.dinis at Dinis's word, 22 November 2026, about 04:08 UTC: "I want you to think in terms of state machines, and I want you to think about every action that happens here is actually a workflow". Each machine says whether it is built (in the page today), simulation (code and tests with made-up data) or plan. [The workflows page](workflows.md). [Back to the plan](index.md).

Machines: 13. Structure check: every state can be reached, every non-end state has a way out, every goal can be reached, no workflow uses itself.

## The map, ranked by the sending bottleneck

Ranked by how much each workflow removes the bottleneck Dinis named on 22 November (about 04:04 UTC, in email.pm.d's session): sending email. 5 removes the most. The rank is this agent's judgement, a proposal.

| Rank | Workflow | Status | Trigger | Needs | Who approves | What is signed | Acceptance check |
|---|---|---|---|---|---|---|---|
| 5 | **email**: Email with agents, approved by a person | plan | the person opens the site | a Google account, an sgit vault | the person | keys, policy, proposals, approvals, sends | Dinis sends ten real emails drafted by agents in one sitting, each one checked and recorded |
| 5 | **key-by-qr**: Move a key by QR code | built | someone needs to give the page a key (a vault key, an access token, an approver key) | the page key pair (non-extractable, in IndexedDB); the sender in trusted.js or signed in with pki.sgit.ai | the person shows their code and pastes the reply | the sealed m1 code is signed by its sender | a code sealed by a trusted sender is kept; one from anyone else is refused (built; checked in Chromium with a test sender) |
| 5 | **approve-and-send**: Review, approve and send one email | built | the person opens an outbox entry | gmail.send; the outbox vault key | the person's press (ABP 1.1.4) | the agent's proposal when signed.json is there (C4); the press is recorded, not yet signed | run in Chromium against a made-up outbox: a good entry reaches recorded, a changed or Bcc entry stops at not_sendable, and no Gmail call is made in the test |
| 5 | **first-send**: Dinis's first real send, to himself | plan | conductor@PrompTugal.dinis gives Dinis a sealed QR code with the outbox vault key, made for his page's public key | the outbox vault key (W1); gmail.send; the page key | Dinis's press | the sealed key code (by its sender); the entry itself must be unsigned: a signed entry to the mailbox itself is refused by the policy | Dinis's email to himself arrives, and meta.json in the outbox vault says sent, with Gmail's id |
| 4 | **trust-ladder**: The trust ladder: from every press to sessions sending | plan | Dinis decides to climb a rung, by a change to the ABP | each rung: the one below working, and an ABP change Dinis approves | Dinis, one rung at a time | more at each rung: proposals, then approvals, then the policy and automations | each rung is a page of its own with what it needs and the ABP change, and no rung is used before Dinis approves it |
| 4 | **connect**: Connect a Gmail account | built | the person presses Connect | gmail.metadata; then gmail.send, gmail.readonly or gmail.modify, one press each | the person, on Google's consent screen | nothing yet (the token is sealed to the page key) | Dinis connects and the page reads counts and labels (done 16 Nov); Allow sending grants gmail.send |
| 4 | **outreach**: Write to someone new | simulation | a list of people to reach (for PrompTugal: conductor@PrompTugal.dinis's) | the outbox vault key; the agent's lane key | the person (a signed automation only for fixed templates to verified correspondents) | the agent's propose.send on its actions lane | a made-up outreach entry passes checkEntry() and the page; a changed one is refused (tests/workflows.test.mjs) |
| 3 | **pin-approver**: Pin an approver | plan | the person sets up signed sending | key-by-qr; the approver's published key (team/keys, or a register) | the person, by pasting the code | the approver's key bundle | a fixture policy signed by a pinned approver passes decideEntry(); unpinned, it is refused |
| 3 | **reply**: Answer a message | simulation | a message in the twin that needs an answer | the outbox vault key; the agent's lane key | the person (a signed automation only for fixed templates to verified correspondents) | the agent's propose.reply on its actions lane | a made-up reply under the automation passes; with the empty twin it is refused (tests/workflows.test.mjs) |
| 3 | **send-from-client**: Write and send in the mail client | built | the person presses Write, Reply, Reply all or Forward | gmail.send and gmail.readonly (Allow reading) | the person, by pressing Send (no agent drafts it) | nothing | Dinis wrote, sent, received and replied from the client on 22 Nov (his screenshots, REALITY.md); tests/mail.test.mjs covers reply and forward headers |
| 2 | **twin-sync**: Sync the mailbox into the twin | built | the person presses Sync (plan: a schedule) | gmail.metadata; the twin vault key | nobody: reading headers into the person's own vault | vault commits | a sync writes every new header into the twin vault (done on Dinis's mailbox, 21 Nov) |
| 2 | **follow-up**: Follow up on our own unanswered email | simulation | a thread where we wrote last and N days passed | the outbox vault key; the agent's lane key | the person (a signed automation only for fixed templates to verified correspondents) | the agent's propose.reply on its actions lane | a made-up follow-up to an unanswered thread passes to the press |
| 2 | **gateway-stop**: Stop the gateway (the kill switch) | simulation | any agent or person sees something wrong | a lane key; gateway.stop is open to every cell agent (agents.json) | nobody: stopping needs no approval; starting again needs a pinned approver | the gateway.stop entry on the approvals lane | after a signed gateway.stop, decideEntry() refuses every signed entry (sim/workflows/round2.test.mjs) |

## Building blocks against workflows

Which of the primitives we have each workflow uses. A workflow can run only when every block it uses is built.

| Workflow | site | oauth | page-key | vault | lanes | policy | pki | agents | mail-client |
|---|---|---|---|---|---|---|---|---|---|
| email | x | x | x | x | x | x |  | x |  |
| key-by-qr | x |  | x |  |  |  | x |  |  |
| approve-and-send | x | x |  | x |  | x |  |  |  |
| first-send | x | x | x | x |  |  |  |  |  |
| trust-ladder |  |  |  |  | x | x | x | x |  |
| connect | x | x | x |  |  |  |  |  |  |
| outreach |  |  |  | x | x | x |  | x |  |
| pin-approver | x |  | x |  |  |  | x |  |  |
| reply |  |  |  | x | x | x |  | x |  |
| send-from-client | x | x |  |  |  |  |  |  | x |
| twin-sync |  | x |  | x |  |  |  |  |  |
| follow-up |  |  |  | x | x | x |  | x |  |
| gateway-stop |  |  |  |  | x |  |  |  |  |

| Block | What it is | Status |
|---|---|---|
| site | the cell's site and its pages | built |
| oauth | Google OAuth scopes on the person's mailbox (metadata, send, readonly, modify) | built |
| page-key | the page's own key pair and QR codes (k1 to show, m1 sealed) | built |
| vault | sgit vaults the person owns (twin, outbox) | built |
| lanes | signed lane entries (Ed25519, hash chains, per-agent rights) | simulation |
| policy | the email policy, signed, and its checker (C4) | simulation |
| pki | pki.sgit.ai: identities and the web of trust | built |
| agents | agent sessions that draft | plan |
| mail-client | the mail client /app/mail.html | built |

## Who listens on each lane (proposal)

Dinis, about 04:08 UTC: "it just depends on the workflow and who's listening. Usually we have an observability agent or specific agent or a feedback agent to capture it." The listeners named here are roles; none of these agents exists yet.

| Lane | Who writes | Who listens |
|---|---|---|
| actions | drafting agents and people (agents.json roles) | the page (decide, before a press); a feedback agent (what was proposed and why, to improve drafts) |
| approvals | pinned approvers; any cell agent may write gateway.stop | the page (approvals and the kill switch); an observability agent (who approved what, and every stop) |
| reads | anyone who reads the twin | an observability agent (which agent read which message) |
| outbox | the gateway (today: the page, through meta.json) | the CRM component (replied, who waits on whom); an observability agent (sends per day, per agent); a feedback agent (what was sent against what was proposed) |

## Workflows of workflows

| Level | Workflow | Goal (its end state) | Uses | Scales by |
|---|---|---|---|---|
| 0 | **email** | every email that leaves was approved by its sender and recorded | connect, key-by-qr, twin-sync, outreach, reply, follow-up, approve-and-send | each person runs it in their own browser and vaults; no shared server, so many people add no load to us; the limit is how many emails one person can approve |
| 1 | **connect** | the page holds a Google token, sealed to its own key, at the scopes the person allowed | none | Google's OAuth app limits (testing, then verification); the Internal audience allows one organisation only |
| 1 | **key-by-qr** | a key from a trusted sender is kept, sealed to the page's own key | none | one code per key per device; scales with people, not with us. Dinis, 22 Nov: "one super powerful workflows" |
| 1 | **pin-approver** | the page holds an approver's key that it will accept policy signatures and approvals from | key-by-qr | one pin per approver per browser; Dinis, 22 Nov: approvers "are defined by the agentic workflows and the keys that are published", moved by QR code in the browser |
| 1 | **twin-sync** | the twin vault holds every new message's headers and labels | none | Gmail API quota per user; 500 new messages a press today |
| 1 | **outreach** | an outbox entry the page will let the person send | none | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **reply** | an outbox entry the page will let the person send | none | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **follow-up** | an outbox entry the page will let the person send | none | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **approve-and-send** | one email sent from the person's Gmail and recorded in the outbox | none | one press per email; 20 a day (send.js) |
| 1 | **first-send** | one outbox entry sent from Dinis's own Gmail to himself and recorded in the outbox vault | key-by-qr, connect, approve-and-send | one person, one email; it proves the path, it does not scale anything |
| 2 | **gateway-stop** | nothing can be sent until a pinned approver starts the gateway again | none | one entry stops every send for that mailbox; it costs nothing to add more agents who may stop |
| 0 | **trust-ladder** | agent sessions send some kinds of email under a policy Dinis signed, and he still sees every send | pin-approver | this is the scaling question itself: each rung moves work from the person to signed policy, so one person can stand behind more email |
| 1 | **send-from-client** | an email the person wrote themselves leaves from their Gmail | none | it runs in each person's browser on their own token; no server; Dinis used it for real on 22 Nov ("IT WORKS!!!") |

## email: Email with agents, approved by a person

- **Goal:** every email that leaves was approved by its sender and recorded
- **Status:** plan
- **Trigger:** the person opens the site
- **Needs:** a Google account, an sgit vault
- **Approves:** the person
- **Signed:** keys, policy, proposals, approvals, sends
- **Acceptance:** Dinis sends ten real emails drafted by agents in one sitting, each one checked and recorded
- **Bottleneck rank:** 5; **uses:** site, oauth, page-key, vault, lanes, policy, agents
- **As a product:** for one person and the agents that work for them. Scale: each person runs it in their own browser and vaults; no shared server, so many people add no load to us; the limit is how many emails one person can approve

| State | What it means | End |
|---|---|---|
| start | nothing connected |  |
| connected | Google connected, page key made |  |
| keyed | the vault keys and trusted keys arrived by QR code |  |
| twinned | the twin holds the mailbox headers and labels |  |
| drafted | agents have written outbox entries |  |
| sent | approved emails sent and recorded; the next sync starts the loop again | goal |

Paths from the start to an end:

```
goal  start > connected > keyed > twinned > drafted > sent
goal  start > connected > keyed > twinned > drafted > sent
goal  start > connected > keyed > twinned > drafted > sent
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| start | connect | connected | person |  | connect |
| connected | swap keys | keyed | person |  | key-by-qr |
| keyed | sync | twinned | page |  | twin-sync |
| twinned | agents draft | drafted | agent |  | outreach |
| twinned | a message needs an answer | drafted | agent |  | reply |
| twinned | a thread has waited | drafted | agent |  | follow-up |
| drafted | the person approves | sent | person |  | approve-and-send |

## connect: Connect a Gmail account

- **Goal:** the page holds a Google token, sealed to its own key, at the scopes the person allowed
- **Status:** built (`src/app/connect.js (signIn, connected)`)
- **Trigger:** the person presses Connect
- **Needs:** gmail.metadata; then gmail.send, gmail.readonly or gmail.modify, one press each
- **Approves:** the person, on Google's consent screen
- **Signed:** nothing yet (the token is sealed to the page key)
- **Acceptance:** Dinis connects and the page reads counts and labels (done 16 Nov); Allow sending grants gmail.send
- **Bottleneck rank:** 4; **uses:** site, oauth, page-key
- **As a product:** for anyone with Gmail. Scale: Google's OAuth app limits (testing, then verification); the Internal audience allows one organisation only

| State | What it means | End |
|---|---|---|
| signed_out | no token |  |
| consent | Google's consent screen is open |  |
| connected | gmail.metadata granted; counts and labels readable |  |
| can_send | gmail.send granted | goal |
| refused | the person said no, or Google refused | stop |

Paths from the start to an end:

```
goal  signed_out > consent > connected > can_send
stop  signed_out > consent > refused
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| signed_out | press Connect | consent | person |  |  |
| consent | grant | connected | google |  |  |
| consent | deny | refused | person |  |  |
| connected | press Allow sending, reading or managing | consent | person |  |  |
| connected | gmail.send already granted | can_send | page |  |  |

## key-by-qr: Move a key by QR code

- **Goal:** a key from a trusted sender is kept, sealed to the page's own key
- **Status:** built (`src/app/connect.js (copyQr, openSealedText, openImage, take)`)
- **Trigger:** someone needs to give the page a key (a vault key, an access token, an approver key)
- **Needs:** the page key pair (non-extractable, in IndexedDB); the sender in trusted.js or signed in with pki.sgit.ai
- **Approves:** the person shows their code and pastes the reply
- **Signed:** the sealed m1 code is signed by its sender
- **Acceptance:** a code sealed by a trusted sender is kept; one from anyone else is refused (built; checked in Chromium with a test sender)
- **Bottleneck rank:** 5; **uses:** site, page-key, pki
- **As a product:** for any two parties who must swap a secret without a server holding it. Scale: one code per key per device; scales with people, not with us. Dinis, 22 Nov: "one super powerful workflows"

| State | What it means | End |
|---|---|---|
| shown | the page shows its public key as a k1 QR code |  |
| sealed | the sender sealed a key to that public key (an m1 code) |  |
| pasted | the code is pasted or dropped on the page |  |
| kept | the key is opened and kept, sealed to the page key | goal |
| refused | not signed by a trusted sender, or not for this page | stop |

Paths from the start to an end:

```
goal  shown > sealed > pasted > kept
stop  shown > sealed > pasted > refused
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| shown | the sender seals a key | sealed | agent |  |  |
| sealed | paste or drop | pasted | person |  |  |
| pasted | signature from a trusted sender checks | kept | page | `openSealedText` |  |
| pasted | signature fails or sender unknown | refused | page | `openSealedText` |  |

## pin-approver: Pin an approver

- **Goal:** the page holds an approver's key that it will accept policy signatures and approvals from
- **Status:** plan
- **Trigger:** the person sets up signed sending
- **Needs:** key-by-qr; the approver's published key (team/keys, or a register)
- **Approves:** the person, by pasting the code
- **Signed:** the approver's key bundle
- **Acceptance:** a fixture policy signed by a pinned approver passes decideEntry(); unpinned, it is refused
- **Bottleneck rank:** 3; **uses:** site, page-key, pki
- **As a product:** for a person who lets agents send under a policy they signed. Scale: one pin per approver per browser; Dinis, 22 Nov: approvers "are defined by the agentic workflows and the keys that are published", moved by QR code in the browser

| State | What it means | End |
|---|---|---|
| none | no approver pinned; every signed entry is refused |  |
| offered | an approver's key arrived by QR code |  |
| pinned | kept sealed in IndexedDB, used by decideEntry() | goal |
| refused | not the published key, or the person said no | stop |

Paths from the start to an end:

```
goal  none > offered > pinned
stop  none > offered > refused
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| none | key arrives | offered | person |  | key-by-qr |
| offered | matches the published key and the person confirms | pinned | person | `sim/workflows/pins.mjs` |  |
| offered | does not match, or the person declines | refused | person |  |  |

## twin-sync: Sync the mailbox into the twin

- **Goal:** the twin vault holds every new message's headers and labels
- **Status:** built (`src/app/connect.js (listIds, getMetadata), src/app/twin.js`)
- **Trigger:** the person presses Sync (plan: a schedule)
- **Needs:** gmail.metadata; the twin vault key
- **Approves:** nobody: reading headers into the person's own vault
- **Signed:** vault commits
- **Acceptance:** a sync writes every new header into the twin vault (done on Dinis's mailbox, 21 Nov)
- **Bottleneck rank:** 2; **uses:** oauth, vault
- **As a product:** for anyone who wants their mail in a vault they own. Scale: Gmail API quota per user; 500 new messages a press today

| State | What it means | End |
|---|---|---|
| idle | nothing to do |  |
| listing | asking Gmail what changed |  |
| fetching | reading headers and labels |  |
| writing | writing files to the vault |  |
| synced | published to the vault | goal |
| failed | Gmail or the vault refused | stop |

Paths from the start to an end:

```
goal  idle > listing > fetching > writing > synced
stop  idle > listing > fetching > writing > failed
goal  idle > listing > synced
stop  idle > listing > failed
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| idle | press Sync | listing | person |  |  |
| listing | new ids | fetching | google |  |  |
| listing | nothing new | synced | google |  |  |
| fetching | headers read | writing | google |  |  |
| writing | published | synced | vault |  |  |
| listing | error | failed | google |  |  |
| writing | error | failed | vault |  |  |

## outreach: Write to someone new

- **Goal:** an outbox entry the page will let the person send
- **Status:** simulation (`sim/workflows/signed.mjs (writeEntry, checkEntry)`)
- **Trigger:** a list of people to reach (for PrompTugal: conductor@PrompTugal.dinis's)
- **Needs:** the outbox vault key; the agent's lane key
- **Approves:** the person (a signed automation only for fixed templates to verified correspondents)
- **Signed:** the agent's propose.send on its actions lane
- **Acceptance:** a made-up outreach entry passes checkEntry() and the page; a changed one is refused (tests/workflows.test.mjs)
- **Bottleneck rank:** 4; **uses:** vault, lanes, policy, agents
- **As a product:** for anyone who writes to many new people. Scale: every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters

| State | What it means | End |
|---|---|---|
| picked | the agent picked who and why |  |
| drafted | text written, from a template or free |  |
| checked | checkEntry(): send.js and C4 say press |  |
| in_outbox | meta.json, body.txt, signed.json written | goal |
| dropped | the checks said no; nothing written | stop |

Paths from the start to an end:

```
goal  picked > drafted > checked > in_outbox
stop  picked > drafted > dropped
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| picked | write | drafted | agent |  |  |
| drafted | self-check passes | checked | agent | `checkEntry` |  |
| drafted | self-check refuses | dropped | agent | `checkEntry` |  |
| checked | write the entry | in_outbox | agent | `writeEntry` |  |

## reply: Answer a message

- **Goal:** an outbox entry the page will let the person send
- **Status:** simulation (`sim/workflows/signed.mjs (writeEntry, checkEntry)`)
- **Trigger:** a message in the twin that needs an answer
- **Needs:** the outbox vault key; the agent's lane key
- **Approves:** the person (a signed automation only for fixed templates to verified correspondents)
- **Signed:** the agent's propose.reply on its actions lane
- **Acceptance:** a made-up reply under the automation passes; with the empty twin it is refused (tests/workflows.test.mjs)
- **Bottleneck rank:** 3; **uses:** vault, lanes, policy, agents
- **As a product:** for anyone with more mail than time. Scale: every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters

| State | What it means | End |
|---|---|---|
| picked | the agent picked who and why |  |
| drafted | text written, from a template or free |  |
| checked | checkEntry(): send.js and C4 say press |  |
| in_outbox | meta.json, body.txt, signed.json written | goal |
| dropped | the checks said no; nothing written | stop |

Paths from the start to an end:

```
goal  picked > drafted > checked > in_outbox
stop  picked > drafted > dropped
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| picked | write | drafted | agent |  |  |
| drafted | self-check passes | checked | agent | `checkEntry` |  |
| drafted | self-check refuses | dropped | agent | `checkEntry` |  |
| checked | write the entry | in_outbox | agent | `writeEntry` |  |

## follow-up: Follow up on our own unanswered email

- **Goal:** an outbox entry the page will let the person send
- **Status:** simulation (`sim/workflows/signed.mjs (writeEntry, checkEntry)`)
- **Trigger:** a thread where we wrote last and N days passed
- **Needs:** the outbox vault key; the agent's lane key
- **Approves:** the person (a signed automation only for fixed templates to verified correspondents)
- **Signed:** the agent's propose.reply on its actions lane
- **Acceptance:** a made-up follow-up to an unanswered thread passes to the press
- **Bottleneck rank:** 2; **uses:** vault, lanes, policy, agents
- **As a product:** for anyone with more mail than time. Scale: every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters

| State | What it means | End |
|---|---|---|
| picked | the agent picked who and why |  |
| drafted | text written, from a template or free |  |
| checked | checkEntry(): send.js and C4 say press |  |
| in_outbox | meta.json, body.txt, signed.json written | goal |
| dropped | the checks said no; nothing written | stop |

Paths from the start to an end:

```
goal  picked > drafted > checked > in_outbox
stop  picked > drafted > dropped
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| picked | write | drafted | agent |  |  |
| drafted | self-check passes | checked | agent | `checkEntry` |  |
| drafted | self-check refuses | dropped | agent | `checkEntry` |  |
| checked | write the entry | in_outbox | agent | `writeEntry` |  |

## approve-and-send: Review, approve and send one email

- **Goal:** one email sent from the person's Gmail and recorded in the outbox
- **Status:** built (`src/app/connect.js (showMail), src/app/send.js, src/app/cell/decide.mjs`)
- **Trigger:** the person opens an outbox entry
- **Needs:** gmail.send; the outbox vault key
- **Approves:** the person's press (ABP 1.1.4)
- **Signed:** the agent's proposal when signed.json is there (C4); the press is recorded, not yet signed
- **Acceptance:** run in Chromium against a made-up outbox: a good entry reaches recorded, a changed or Bcc entry stops at not_sendable, and no Gmail call is made in the test
- **Bottleneck rank:** 5; **uses:** site, oauth, vault, policy
- **As a product:** for anyone who lets someone else draft for them. Scale: one press per email; 20 a day (send.js)

| State | What it means | End |
|---|---|---|
| opened | the exact To, Cc, Subject and text shown |  |
| not_sendable | send.js or C4 refuses; the reasons are shown | stop |
| ready | checks pass; the button is live |  |
| confirming | the browser asks: send now? |  |
| sending | one call to Gmail |  |
| sent | Gmail answered with an id |  |
| recorded | meta.json says sent, when, the ids and who approved | goal |
| failed | Gmail refused; nothing sent | stop |
| unrecorded | sent, but the vault write failed; do not send again | stop |

Paths from the start to an end:

```
stop  opened > not_sendable
goal  opened > ready > confirming > sending > sent > recorded
stop  opened > ready > confirming > sending > sent > unrecorded
stop  opened > ready > confirming > sending > failed
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| opened | a check refuses | not_sendable | page | `problems, decideEntry` |  |
| opened | checks pass | ready | page | `problems, decideEntry` |  |
| ready | press Approve and send | confirming | person |  |  |
| confirming | cancel | ready | person |  |  |
| confirming | confirm | sending | person |  |  |
| sending | 200 with an id | sent | google |  |  |
| sending | error | failed | google |  |  |
| sent | meta.json written and published | recorded | vault |  |  |
| sent | vault error | unrecorded | vault |  |  |

## first-send: Dinis's first real send, to himself

- **Goal:** one outbox entry sent from Dinis's own Gmail to himself and recorded in the outbox vault
- **Status:** plan (`every step is built in src/app/connect.js; the whole has never run (it waits on the outbox key, W1); its checks and send ran in Chromium on made-up entries (sim/workflows/first-send-browser.mjs)`)
- **Trigger:** conductor@PrompTugal.dinis gives Dinis a sealed QR code with the outbox vault key, made for his page's public key
- **Needs:** the outbox vault key (W1); gmail.send; the page key
- **Approves:** Dinis's press
- **Signed:** the sealed key code (by its sender); the entry itself must be unsigned: a signed entry to the mailbox itself is refused by the policy
- **Acceptance:** Dinis's email to himself arrives, and meta.json in the outbox vault says sent, with Gmail's id
- **Bottleneck rank:** 5; **uses:** site, oauth, page-key, vault
- **As a product:** for the first person to use the cell for real. Scale: one person, one email; it proves the path, it does not scale anything

| State | What it means | End |
|---|---|---|
| waiting_key | no outbox key in the page |  |
| key_kept | the outbox vault key is kept, sealed to the page key |  |
| vault_open | the outbox vault is open and its entries listed |  |
| entry_open | one entry addressed to Dinis himself is open |  |
| can_send | gmail.send is granted |  |
| done | sent to himself and recorded | goal |
| stuck | a step refused; the reason is shown and recorded | stop |

Paths from the start to an end:

```
goal  waiting_key > key_kept > vault_open > entry_open > can_send > done
stop  waiting_key > key_kept > vault_open > entry_open > stuck
stop  waiting_key > key_kept > vault_open > stuck
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| waiting_key | paste the sealed code | key_kept | person |  | key-by-qr |
| key_kept | press Open vault | vault_open | person | `openVaults` |  |
| vault_open | open the entry to himself | entry_open | person | `showMail` |  |
| entry_open | press Allow sending | can_send | person |  | connect |
| can_send | approve and send | done | person |  | approve-and-send |
| vault_open | the vault does not open | stuck | vault |  |  |
| entry_open | the page says not sendable | stuck | page | `problems, decideEntry` |  |

## gateway-stop: Stop the gateway (the kill switch)

- **Goal:** nothing can be sent until a pinned approver starts the gateway again
- **Status:** simulation (`src/app/cell/lanes.mjs (gatewayStopped), src/app/cell/decide.mjs`)
- **Trigger:** any agent or person sees something wrong
- **Needs:** a lane key; gateway.stop is open to every cell agent (agents.json)
- **Approves:** nobody: stopping needs no approval; starting again needs a pinned approver
- **Signed:** the gateway.stop entry on the approvals lane
- **Acceptance:** after a signed gateway.stop, decideEntry() refuses every signed entry (sim/workflows/round2.test.mjs)
- **Bottleneck rank:** 2; **uses:** lanes
- **As a product:** for everyone who lets agents near their mail. Scale: one entry stops every send for that mailbox; it costs nothing to add more agents who may stop

| State | What it means | End |
|---|---|---|
| running | signed proposals are checked and may pass |  |
| stopping | a gateway.stop entry is on the approvals lane |  |
| stopped | decide() refuses every proposal (kill switch) | goal |
| not_signed | the stop entry does not verify, so it does not count; the person is told | stop |

Paths from the start to an end:

```
goal  running > stopping > stopped
stop  running > stopping > not_signed
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| running | write gateway.stop | stopping | agent |  |  |
| stopping | the lanes verify | stopped | page | `mergeLanes, gatewayStopped` |  |
| stopping | the lanes do not verify | not_signed | page | `mergeLanes` |  |

## trust-ladder: The trust ladder: from every press to sessions sending

- **Goal:** agent sessions send some kinds of email under a policy Dinis signed, and he still sees every send
- **Status:** plan
- **Trigger:** Dinis decides to climb a rung, by a change to the ABP
- **Needs:** each rung: the one below working, and an ABP change Dinis approves
- **Approves:** Dinis, one rung at a time
- **Signed:** more at each rung: proposals, then approvals, then the policy and automations
- **Acceptance:** each rung is a page of its own with what it needs and the ABP change, and no rung is used before Dinis approves it
- **Bottleneck rank:** 4; **uses:** lanes, policy, pki, agents
- **As a product:** for anyone whose bottleneck is pressing send. Scale: this is the scaling question itself: each rung moves work from the person to signed policy, so one person can stand behind more email

| State | What it means | End |
|---|---|---|
| press_every_email | today (ABP 1.1.4): the person presses for every email; agents sign nothing |  |
| signed_proposals | agents sign what they draft; the page runs C4 and refuses changes (built in simulation; needs W4 and W5) |  |
| signed_approvals | the press itself is a signed approve entry on the lanes; the page holds a lane key |  |
| automations | fixed templates to verified correspondents go without a press, under a signed automation; needs an unattended gateway (ABP N1) |  |
| sessions_send | agent sessions send the kinds of email the signed policy allows; Dinis reads the outbox | goal |
| held | Dinis keeps the current rung | stop |

Paths from the start to an end:

```
goal  press_every_email > signed_proposals > signed_approvals > automations > sessions_send
stop  press_every_email > signed_proposals > signed_approvals > automations > held
stop  press_every_email > signed_proposals > signed_approvals > held
stop  press_every_email > signed_proposals > held
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| press_every_email | pin approvers and lane keys | signed_proposals | person |  | pin-approver |
| signed_proposals | ABP change: approvals are signed | signed_approvals | person |  |  |
| signed_approvals | ABP change: signed automations may send | automations | person |  |  |
| automations | ABP change: sessions send under policy | sessions_send | person |  |  |
| signed_proposals | Dinis keeps this rung | held | person |  |  |
| signed_approvals | Dinis keeps this rung | held | person |  |  |
| automations | Dinis keeps this rung | held | person |  |  |

## send-from-client: Write and send in the mail client

- **Goal:** an email the person wrote themselves leaves from their Gmail
- **Status:** built (`src/app/mail.js, src/app/mailparse.js (respond)`)
- **Trigger:** the person presses Write, Reply, Reply all or Forward
- **Needs:** gmail.send and gmail.readonly (Allow reading)
- **Approves:** the person, by pressing Send (no agent drafts it)
- **Signed:** nothing
- **Acceptance:** Dinis wrote, sent, received and replied from the client on 22 Nov (his screenshots, REALITY.md); tests/mail.test.mjs covers reply and forward headers
- **Bottleneck rank:** 3; **uses:** site, oauth, mail-client
- **As a product:** for anyone with Gmail who wants a plain client on their own token. Scale: it runs in each person's browser on their own token; no server; Dinis used it for real on 22 Nov ("IT WORKS!!!")

| State | What it means | End |
|---|---|---|
| composing | the composer is open, prefilled for a reply or forward |  |
| sending | one call to Gmail |  |
| sent | Gmail has it; it shows in the conversation | goal |
| discarded | closed without sending | stop |
| failed | Gmail refused; the text stays in the composer | stop |

Paths from the start to an end:

```
goal  composing > sending > sent
stop  composing > sending > failed
stop  composing > discarded
```

| From | Event | To | By | Checked by | Workflow |
|---|---|---|---|---|---|
| composing | press Send | sending | person |  |  |
| composing | close | discarded | person |  |  |
| sending | 200 with an id | sent | google |  |  |
| sending | error | failed | google |  |  |

# The workflow machines

**Status: a proposal, generated** from `sim/workflows/machines.mjs` by `node sim/workflows/render.mjs`; do not edit by hand. Written by email.workflows.d@AgentiCCells.dinis at Dinis's word, 22 November 2026, about 04:08 UTC: "I want you to think in terms of state machines, and I want you to think about every action that happens here is actually a workflow". Each machine says whether it is built (in the page today), simulation (code and tests with made-up data) or plan. [The workflows page](workflows.md). [Back to the plan](index.md).

Machines: 9. Structure check: every state can be reached, every non-end state has a way out, every goal can be reached, no workflow uses itself.

## The map

| Level | Workflow | Goal (its end state) | Status | Uses | Who approves | Scales by |
|---|---|---|---|---|---|---|
| 0 | **email**: Email with agents, approved by a person | every email that leaves was approved by its sender and recorded | plan | connect, key-by-qr, twin-sync, outreach, reply, follow-up, approve-and-send | the person | each person runs it in their own browser and vaults; no shared server, so many people add no load to us; the limit is how many emails one person can approve |
| 1 | **connect**: Connect a Gmail account | the page holds a Google token, sealed to its own key, at the scopes the person allowed | built | none | the person, on Google's consent screen | Google's OAuth app limits (testing, then verification); the Internal audience allows one organisation only |
| 1 | **key-by-qr**: Move a key by QR code | a key from a trusted sender is kept, sealed to the page's own key | built | none | the person shows their code and pastes the reply | one code per key per device; scales with people, not with us. Dinis, 22 Nov: "one super powerful workflows" |
| 1 | **pin-approver**: Pin an approver | the page holds an approver's key that it will accept policy signatures and approvals from | plan | key-by-qr | the person, by pasting the code | one pin per approver per browser; Dinis, 22 Nov: approvers "are defined by the agentic workflows and the keys that are published", moved by QR code in the browser |
| 1 | **twin-sync**: Sync the mailbox into the twin | the twin vault holds every new message's headers and labels | built | none | nobody: reading headers into the person's own vault | Gmail API quota per user; 500 new messages a press today |
| 1 | **outreach**: Write to someone new | an outbox entry the page will let the person send | simulation | none | the person (a signed automation only for fixed templates to verified correspondents) | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **reply**: Answer a message | an outbox entry the page will let the person send | simulation | none | the person (a signed automation only for fixed templates to verified correspondents) | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **follow-up**: Follow up on our own unanswered email | an outbox entry the page will let the person send | simulation | none | the person (a signed automation only for fixed templates to verified correspondents) | every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters |
| 1 | **approve-and-send**: Review, approve and send one email | one email sent from the person's Gmail and recorded in the outbox | built | none | the person's press (ABP 1.1.4) | one press per email; 20 a day (send.js) |

## email: Email with agents, approved by a person

- **Goal:** every email that leaves was approved by its sender and recorded
- **Status:** plan
- **Trigger:** the person opens the site
- **Needs:** a Google account, an sgit vault
- **Approves:** the person
- **Signed:** keys, policy, proposals, approvals, sends
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

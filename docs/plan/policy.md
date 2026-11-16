# The policy at five altitudes

**Status: altitudes 3, 4 and the automatic part of 5 are built (simulation).** Altitudes 1 and 2 need the Google OAuth app. [Back to the plan](index.md).

| Altitude | What it decides | Enforced by | Status |
|---|---|---|---|
| 1. The OAuth grant | which Gmail scopes the user gave | Google | plan: needs the OAuth app |
| 2. Who holds the token | one gateway agent | where the key lives | plan: needs the OAuth app and a place for the gateway |
| 3. What each agent may do | read the twin, propose, approve, send, per agent and key | the lane checks | built (simulation): `policy/agents.json`, `mergeLanes` |
| 4. What an email may be | recipients, languages, templates, attachments, rates, first contact or reply, data loss | the gateway, before every send | built (simulation): `cell/policy/checker.mjs` |
| 5. Who approves | a person for consequential sends, a signed automation for routine ones | the approvals lane | built (simulation) for the decision; signing the policy file itself is a plan |

## Altitude 1: the grant, by tier

The user picks a tier on Google's own consent screen. Each tier switches on features and agents.

| Tier | Gmail scope | Google's class | What it switches on |
|---|---|---|---|
| Metadata | `gmail.metadata` | restricted | headers and labels in the twin; inbox analytics |
| Read | `gmail.readonly` | restricted | full twin, firewall, triage, drafting |
| Compose | `gmail.compose` | restricted | drafts written into Gmail's drafts folder |
| Send | `gmail.send` | sensitive | the gateway sends approved actions |
| Labels | `gmail.modify` (or `gmail.labels` for label definitions only) | restricted (`gmail.labels` is non-sensitive) | the gateway applies approved label changes |

Source: the classes for `gmail.send` (sensitive) and `gmail.readonly` (restricted) are from the article, which cites Google's Gmail API scopes page as read on 16 November 2026. The classes for the other scopes are this cell's understanding and **unconfirmed**: check them on Google's page when the app is registered. In testing, an app is limited to 100 test users and needs no verification.

## Altitude 3: per agent

See the table in [abp/cell-email](../../abp/cell-email.md) and `policy/agents.json`. Agents read `clean/` only; only people approve; only the gateway writes the outbox.

## Altitude 4: what an email may be

`check(proposal, ctx)` answers **deny** (never send as proposed), **hold** (a person must sign) or **allow** (may go under a signed automation). Deny by default: an empty policy allows nothing.

| Rule | Deny when | Hold when |
|---|---|---|
| Kill switch | the gateway is stopped | |
| Proposer | the proposer is not listed in `proposers` | |
| Firewall | an agent answers a message marked hostile that no person has read | |
| Signed policy | the policy file or `agents.json` is not signed by a person with the approver role, or changed since (in `decide`) | |
| Recipients | not in an allowed domain or on the allow list; on the deny list; too many; any bcc | a reply adds someone not in the thread |
| First contact or reply | | any recipient has never written from an address that passed DMARC; or the twin's sync is older than `max_sync_lag_minutes` (fail closed) |
| Language | not an allowed language; declared language differs from what the text reads as | the language cannot be confirmed |
| Template | unknown; wrong language; slots missing; a slot holds a link or is too long; text is not the template with its slots filled | no template and the policy requires one |
| Attachments | any file whose type the policy does not allow (send a vault link) | |
| Data loss | a secret shape (the leak scan's) or a marked private note in the subject or body | |
| Rates | over the daily total, per agent, or per recipient (from the outbox, last 24 hours) | |

The simulated policy is `policy/email-policy.json`. It holds the article's example as an automation, tightened after the ABP review: *the drafter may send a reply in Portuguese to an existing, verified correspondent, using this fixed template, only to a message the firewall marked clean, but never a first contact.*

## Altitude 5: who approves

If no rule denies or holds, the email may go only if a signed automation matches the proposer, the kind (reply or send), the language and the template, every recipient has written before from a verified address, the template has no free slots (`free_slots` empty: no text an agent wrote after reading an email), and the message answered is marked clean. Otherwise a person signs on the approvals lane. First contacts always need a person.

## The policy simulator

`node cell/policy/simulate.mjs <twin> <policy.json>` runs a policy over the outbound mail already in the twin, as if each email were proposed again, and counts what it would have allowed, held or denied. On the simulated mailbox today: allow 0, hold 3, deny 0.

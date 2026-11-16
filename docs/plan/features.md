# The fifteen features, in order

**Status: a plan.** The order follows the article's build order: our own inboxes first, then the lanes and signatures, then the email policy, then the CRM app's email component, then the first automated sends, then the cell for other teams. [Back to the plan](index.md).

| # | Feature | Build step | Status (16 November 2026) |
|---|---|---|---|
| 1 | **An inbound firewall.** Agents read a cleaned copy with links, hidden text and likely prompt injections flagged. | 1 | built (simulation): `cell/firewall/clean.mjs`. A heuristic; it lowers risk, it does not remove it. |
| 2 | **Data-loss checks.** No secret, key or private note leaves in an email; the gateway refuses and says why. | 3 | built (simulation) inside the policy checker, using the repository's leak scan shapes. |
| 3 | **A kill switch.** One tap stops the gateway; nothing sends until a person starts it again. | 2 | built (simulation): `gateway.stop` and `gateway.start` on the approvals lane. The tap is a plan. |
| 4 | **A shared inbox, with roles.** Readers, drafters, approvers and one sender on one inbox. | 2 | roles built (simulation): `policy/agents.json`, enforced on the lanes. |
| 5 | **A policy simulator.** Run a policy over last month's mail before it goes live. | 3 | first cut built (simulation): `cell/policy/simulate.mjs`. |
| 6 | **Templates and voice.** A template for each kind of contact, in each language, in the voice of the signer. | 3 | template checking built (simulation); voice and inline images are a plan. |
| 7 | **Approve anywhere.** iPhone with Face ID, voice from VoiceDebrief, or the browser; each approval a signature. | 4 | plan, with `crm.ios@sgit.dinis`. |
| 8 | **Follow-ups that run themselves.** "No reply in five days" becomes a drafted nudge, waiting for approval. | 4 | plan. The correspondents index already shows who has not answered. |
| 9 | **Signed outbound mail.** Every email carries its agent's and person's signature, a QR code and a page to check it. | 5 | plan. Needs agent keys in the vault. |
| 10 | **Vault links, not attachments.** A file goes as a link to an encrypted vault, revocable, with signed reads. | 5 | the policy already refuses attachments; the links are a plan. |
| 11 | **Time travel.** See the inbox as it was on any day; replay who read, proposed, approved and sent what. | 5 | plan. Comes from the vault's history and the lanes. |
| 12 | **Synthetic recipients.** Drafts go first to synthetic people who read, answer and push back. | 5 | plan. The simulated mailbox is a start. |
| 13 | **Inbox analytics.** Who waits on whom, how long replies take, which introductions went nowhere. | 6 | plan. |
| 14 | **A calendar twin.** The same pattern for Google Calendar. | 6 | plan. Needs a calendar scope. |
| 15 | **More than Gmail.** Outlook, IMAP and a company's own mail server, behind the same gateway. | 6 | plan. The twin keeps source ids apart from its own for this reason. |

The article lists the features in a different order; this order puts first what protects us (the firewall, data loss, the kill switch, roles) and what the build steps need.

## Build steps

1. Our own inboxes first: register the OAuth app in testing, build the gateway and the twin, sync one mailbox.
2. The lanes and the signatures: actions, approvals, reads and the outbox, each entry signed.
3. The email policy: recipients, languages, templates and rates, checked before every send; first contacts always approved by a person.
4. The CRM app's email component, on the twin, on the iPhone and in the browser.
5. The first automated sends: the few routine emails Dinis wants to automate, under a signed policy.
6. Then the cell: offered to teams, with verification when it leaves testing.

What each step needs from Dinis is on [the needs page](needs.md).

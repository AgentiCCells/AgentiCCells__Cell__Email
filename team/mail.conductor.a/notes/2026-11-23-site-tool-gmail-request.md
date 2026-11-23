# Request: SovereignWebsite/Site__Tool__Gmail (the Gmail tool moves out of the Email Cell)

By mail.conductor.a@AgentiCCells.dinis, 23 November 2026, 23:37 UTC (`date -u`). For a.maestro to relay to account C's factory (c.factory, the R4 chain), as for Site__Tool__CRM. A list of facts and a **proposal** for the move; nothing is built or moved.

## Dinis's word
In crm.dev.a's session, about 22:50 UTC (relayed by crm.dev.a at 23:34 UTC): the Gmail tool should move from the Email Cell to Site__Tool__Gmail; "anybody working on that?". Earlier, 21:42 UTC, same session: Site__Tool__CRM "will then have a tight integration with our gmail tool".

## Who works on it
Nobody yet. Proposed: mail.dev.a@AgentiCCells.dinis (owns the cell's code since G1), conducted by mail.conductor.a. The repository is created by the factory, not by an agent.

## What would move (proposal)
- The browser tools: the gateway (`src/app/connect.*`), the mail client (`mail.*`), the send screen (`send.*`, on work/mail.dev.a), their shared code (`pki.js`, `send.js`, `sealed.js`, `oauth.js`, `vault.js`, `twin.js`, `cell/` browser ports) and the pinned vendor files, with their tests and `scripts/check-app.mjs`.
- The demo mode and the synthetic twin generator.
- The docs pages for people (use the tools; run your own with your own Google app; join).

## What would stay in the Email Cell (proposal)
- The cell's design: the plan, the ABP (`abp/cell-email.md`), the lanes, the policy checker and simulator, the gateway's decision, the firewall: the agentic cell itself, which the tool uses.

## One-way parts, Dinis's
- **The Google OAuth client.** A new site address means a new Authorised JavaScript origin and redirect URI on the Web client in RiskMandate's Google project, or a new client. Only Dinis changes the console. Until then the tool keeps working only at email-cell.agenticcells.site.
- **The site's address** (proposal: the factory's tool-site naming, as for crm.tool.sovereignweb.site). A new address may also meet Google Safe Browsing's flag, as the cell's did.
- **The ABP.** Today the browser gateway's rules live in abp/cell-email.md; the tool's site needs its own ABP or a pointer to this one.

## Order (proposal)
1. Release release/next2 (D7, urgent, a live fix) and the send screen (D1) on the cell first: they fix and add to what people use today.
2. The factory creates Site__Tool__Gmail.
3. mail.dev.a moves the browser tools with history notes (source commit per file), keeps the cell's site linking to the new one, and asks Dinis for the OAuth origin change before the old address is retired.

## Notes from mail.dev.a (23:40 UTC, msg), accepted as proposed owner
1. **History:** each file is copied with a source note naming the cell commit it came from. No `git filter-repo` split: that would re-sign other agents' commits as mail.dev.a's, which account D's hand-over says not to do.
2. **What a person loses at the new address (for Dinis, with the OAuth change):** the page's key pair and everything sealed to it live in the browser per address (IndexedDB). At the new address each person reconnects Google, re-pastes their sealed codes (twin key, outbox key, SG/Send token), and gets a new pki.sgit.ai k1 code. Nothing carries over by itself; the old address keeps working until it is retired.
3. **Step 0:** the gates move first (tests, abp-check, validate, check-app, leak scan, check-commits, `trusted.js` built from team/keys). The new repository takes no code until every gate prints OK there.

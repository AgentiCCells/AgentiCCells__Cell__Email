# The plan for the email AgenticCell

**Status: a plan.** Parts marked *built (simulation)* exist as code in this repository and are tested against a simulated mailbox of made-up messages. Nothing has touched a real mailbox. Nothing marked *plan* exists yet.

Source: the brief is Dinis Cruz's article [The email agentic cell](https://newsroom.sgit.ai/articles/the-email-agentic-cell.html) (16 November 2026). His words when he started the cell, 16 November 2026, about 16:00 UTC: "can you spin up an AgenticCell (I like how this sounds), see newsroom.sgit.ai for details, for creating this", and "that is us really having that set of core primitives and resources for an agent or AgenticCell: repo + site + claude + abp. Really nice isolation."

## The pages

Start with [the architecture diagrams](../../src/architecture.html): what is on the website, what goes in the user's vault, and how the twin works.

1. [Architecture](architecture.md): one gateway, a twin, many hands, and the four flows.
2. [The twin's vault layout](twin.md): one file per message, threads, labels, attachments, the cleaned copy.
3. [The lanes](lanes.md): actions, approvals, reads and the outbox, each entry signed.
4. [The policy at five altitudes](policy.md): from the OAuth grant to what one email may say.
5. [The fifteen features, in order](features.md): what each one is and where it stands.
6. [What each build step needs from Dinis](needs.md): the Google OAuth app in testing, its scopes, and the user's own vault.
7. [Google OAuth setup](google-oauth.md): every value for Dinis to enter in the Google Cloud console.
8. [The browser as the gateway](browser-gateway.md): a full twin with only the website and vaults; approved, and its test page [/app/connect.html](../../src/app/connect.html) is built.

The draft [privacy policy](../pages/privacy.md) is the link the consent screen needs.

The cell's own Agent Behaviour Policy is [abp/cell-email](../../abp/cell-email.md).

## What is built today

| Part | Status | Where |
|---|---|---|
| Twin schema and loader | built (simulation) | `cell/twin/schema.mjs` |
| Simulated mailbox, 12 made-up messages | built (simulation) | `sim/messages.mjs`, `sim/build-mailbox.mjs` |
| Lane entry format, Ed25519 signatures, hash chains, merge checks | built (simulation) | `cell/lanes/entry.mjs` |
| Email policy checker: recipients, languages, templates, rates, first contact or reply, attachments, data loss, kill switch | built (simulation) | `cell/policy/checker.mjs` |
| Policy simulator, first cut | built (simulation) | `cell/policy/simulate.mjs` |
| Gateway decision (which proposals go, wait or are refused), no Gmail | built (simulation) | `cell/gateway/decide.mjs` |
| Inbound firewall: cleaned copy, links, hidden text, likely prompt injections | built (simulation) | `cell/firewall/clean.mjs` |
| Tests: 71, run with `node --test tests/*.test.mjs` | passing on 16 November 2026 | `tests/` |
| The gateway's Gmail sync and send | plan: needs the Google OAuth app | |
| The twin in the user's own vault | plan: the user creates it through pki.sgit.ai and grants the gateway an access key | |
| Agent keys held and rotated | plan: needs the vault | |

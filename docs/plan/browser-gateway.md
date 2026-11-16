# The browser as the gateway: a twin with only a website and vaults

**Status: approved and started.** Dinis asked on 16 November 2026: "can we implement a full gmail twin and live site just using a website and vaults? (with PKI and OAuth)", created the Web client, and approved the policy change ("yes I added the scope and I approve the policy"): abp/cell-email v1.1.0. Built: the safety rails and the test page [/app/connect.html](../../src/app/connect.html), which made its first real connection on 16 November 2026 (a riskmandate.ai mailbox, `gmail.metadata`, from Dinis's browser). Built since: the twin sync into the user's own vault (headers and labels, `gmail.metadata`), through sgit's own vault library. Next: the outreach send step (Dinis approves each email in the page), message bodies (`gmail.readonly`), labels in sync both ways (`gmail.modify`). [Back to the plan](index.md).

## The short answer

Mostly yes. The user's own browser tab becomes the gateway. There is no server of ours: the site is static, the twin lives in the user's vault, and the Google token exists only in the memory of the user's browser while the page is open.

## How it works

1. **Sign in to the vault (PKI).** The user opens the site and signs in with their pki.sgit.ai passkey, which opens their own vault and their key. That key signs their approvals on the lanes.
2. **Connect Gmail (OAuth).** The page sends the user to Google's own consent screen (the OAuth 2.0 token flow for client-side apps) and Google returns an access token to `/app/connect.html` in the URL fragment, which browsers never send to a server; the page takes it out of the address bar at once. No Google script is loaded into the page (rule N18), which is why this flow, and not Google's pop-up library, is used.
3. **Sync.** While the tab is open, the page reads what changed since the last sync from Gmail's history, writes `raw/`, runs the inbound firewall in the browser to write `clean/`, and updates the threads, the correspondents index and the change feed in the vault.
4. **Work together.** Agents (Claude sessions, the CRM app) read `clean/` with access keys the user sealed to them, and propose on the actions lane. They never see the Google token.
5. **Send.** When the user opens the page, it shows pending proposals. The user approves with their key; the page verifies the lanes and the signed policies, runs the email policy checker, sends through Gmail, and writes the outbox.

## What it gains

- No server of ours anywhere: nothing of ours can hold mail or tokens.
- Altitude 2 gets stronger: the only token holder is the user's own browser, and only while the page is open.
- Google's question about storing restricted data on servers gets a cleaner answer: only encrypted vault data leaves the browser. Still to confirm with Google.
- The code is already in place: the twin, lanes, policy checker and firewall are plain JavaScript; they move from Node's `crypto` to the browser's WebCrypto, which supports Ed25519.

## What it costs

| Limit | Why | What we do |
|---|---|---|
| Nothing runs while the tab is closed | no server | sync catches up from Gmail's history when the page opens; automations send only when the user next opens it |
| No push notifications | Pub/Sub needs a server or a long pull | poll the history while the page is open |
| Short-lived tokens | browser-only sign-in gives no refresh token | the page asks for a new token about every hour, usually silently while the user is signed in to Google |
| The site's code holds the token | whoever can change the site can change that code | signed, pinned releases with integrity checks on every script (as pki.sgit.ai publishes its library), a strict content security policy, and branch protection on dev |
| Follow-ups and automations are not unattended | as above | if we want them later, add an always-on gateway as a second, optional step |

## Proposed change to the Agent Behaviour Policy

Waiting for Dinis's approval; the approved v1.0.0 stays in force until then.

- **N1** "Any agent but the gateway holds the Google token" becomes: "Anything but the user's own browser session on the cell's site holds the Google token." Barrier: boundary once the page sets a content security policy and loads only pinned, integrity-checked scripts; enforcer: the browser and Google's authorised origin.
- **C5** (the client secret): a browser client has no secret, so C5 covers the access token in browser memory instead: never stored, never sent anywhere but Google.
- **New rule:** the page sends nothing to any host but Google's APIs and the vault service. Enforcer: the content security policy's `connect-src`. Test: a check in CI that reads the page's policy.
- **New gap:** the site's code is now security-critical: a change to it is a change to what holds the token. Proposal: signed releases and a required review on `src/`.

## Proposed change to the Google OAuth values

Waiting for Dinis's approval; [the current setup page](google-oauth.md) stays as it is until then.

| Field | Today (Desktop client) | Proposed (browser client) |
|---|---|---|
| Application type | Desktop app | Web application |
| Authorised JavaScript origins | none | `https://email-cell.agenticcells.site` |
| Authorised redirect URIs | none | none (the browser sign-in uses a pop-up, no redirect) |
| Client secret | kept where the gateway runs | none used |
| Everything else | unchanged | unchanged |

## Recommendation

Build the browser-only version first, for our own inboxes in testing: no server, matches "website and vaults", and the smallest place to start. Add an always-on gateway later only if we want unattended automations or push.

## First steps, once approved

1. Check that the Gmail API answers browser calls from the site's origin (one test call with a test account's token).
2. Port the lane signing and the policy signatures from Node's `crypto` to WebCrypto, with the same test vector.
3. A page at `/app/` that signs in with pki.sgit.ai, connects Gmail at `gmail.metadata`, and syncs headers into the user's vault.
4. The content security policy, pinned scripts and the CI check, before any token is ever requested.

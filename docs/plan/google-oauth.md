# Google OAuth setup: the values to configure

**Status: being configured by Dinis** (16 November 2026), in RiskMandate's project. He chose the Internal audience: "So I set audience internal since we only need @riskmandate.ai users to access it". The labels follow the Google Cloud console as this cell understands it on 16 November 2026 (the "Google Auth Platform" pages: Branding, Audience, Data access, Clients); Google renames these often, so trust the console where they differ. [Back to the plan](index.md).

Dinis's word, 16 November 2026: "Can you add the website to Google OAuth details for me to configure?"

A proposal to use a browser client instead (the site itself as the gateway, no server) is on [the browser gateway page](browser-gateway.md); until Dinis approves it, the values below stand.

## What is configured (16 November 2026)

| Item | Value |
|---|---|
| Project | RiskMandate |
| Branding | done by Dinis |
| Audience | Internal (riskmandate.ai Workspace accounts only) |
| Client | `email-cell-browser`, Web application |
| Client id | `235486550409-67qqf0j65poc62fbm2in7jbceci3sv5k.apps.googleusercontent.com` (public by nature: a browser client's id is in its page) |
| Authorised JavaScript origin | `https://email-cell.agenticcells.site` |
| Authorised redirect URI | `https://email-cell.agenticcells.site/app/connect.html`, added by Dinis (the page uses Google's redirect sign-in so that no Google script is loaded into it, rule N18). First real sign-in worked on 16 November 2026. |
| Gmail API | enabled by Dinis |
| Scope | `gmail.metadata`, added by Dinis |

The Web client follows [the browser gateway](browser-gateway.md), approved by Dinis (abp/cell-email v1.1.0). The test page is [/app/connect.html](../../src/app/connect.html).

## The values, in one table

| Where in the console | Field | Value |
|---|---|---|
| Project | Google Cloud project | RiskMandate's (or The Cyber Boardroom's): Dinis's choice |
| APIs and services, Library | Enable | Gmail API (step 1); Cloud Pub/Sub API (later, for push) |
| Branding | App name | `Email AgenticCell` |
| Branding | User support email | Dinis's choice (not written here) |
| Branding | App logo | leave empty for now (a logo can start Google's brand review); the logo is ready at `/assets/logo-120.png` |
| Branding | Application home page | `https://email-cell.agenticcells.site/` |
| Branding | Application privacy policy link | `https://email-cell.agenticcells.site/privacy.html` (a draft: Dinis approves it first) |
| Branding | Application terms of service link | leave empty for now (optional) |
| Branding | Authorised domains | `agenticcells.site` |
| Branding | Developer contact | Dinis's choice |
| Audience | User type | **Internal** (chosen by Dinis): only accounts in the riskmandate.ai Google Workspace can sign in |
| Audience | Publishing status, test users | not used by an Internal app |
| Data access | Scopes, step 1 | `https://www.googleapis.com/auth/gmail.metadata` only |
| Data access | Scopes, later | `gmail.readonly` (read), then `gmail.send` (send), each added only when its build step needs it |
| Clients | Application type | Desktop app, as approved; or Web application if Dinis approves [the browser gateway](browser-gateway.md) |
| Clients | Name | `email-cell-gateway` |
| Clients | Authorised JavaScript origins | none: no browser ever holds the token |
| Clients | Authorised redirect URIs | none for a Desktop app (it uses a loopback address) |

## Why a Desktop client, and not the website

- The website is static (GitHub Pages). It must never receive an authorisation code or a token: that would put a Gmail credential in a browser, against altitude 2 (one gateway holds the token).
- A Desktop client lets the gateway run on a machine Dinis controls and finish the sign-in through a loopback address, with PKCE, and no redirect URI to register.
- If the gateway later runs as a server, add a second client of type Web application, with one redirect URI on the gateway's own host (for example `https://<gateway host>/oauth/callback`). The host is not decided.

## The client secret

- Download the client's JSON in the console and keep it only where the gateway runs.
- Never paste it into a chat, a commit, an issue or a vault this repository can read. The build session must never see it (abp/cell-email, rule N13).
- If it leaks, delete the client in the console and make a new one.

## What the Internal audience means

- **No verification and no security assessment**, even for the restricted scopes (`gmail.metadata`, `gmail.readonly`): Google does not verify Internal apps. This removes the hardest part of the plan. To confirm against Google's documentation.
- **No test-user list and no 100-user cap:** any riskmandate.ai Workspace account can connect, and no other account can.
- **The seven-day refresh-token expiry** applies to External apps in testing, not Internal ones, as this cell understands it. To confirm once the first token is issued.
- **Limits:** a personal Gmail or another organisation's mailbox cannot use this app. Workspace admin controls on third-party API access still apply, and may need the app allowed.
- **Other teams later:** each team registers its own Internal app in its own Workspace (customer work runs in the customer's environment), or we move to External with verification. Moving to External is a stop-and-ask for Dinis.

## Later: push notifications

When the gateway receives by push instead of polling:

| Field | Value |
|---|---|
| Pub/Sub topic | `projects/<project id>/topics/email-cell-gmail` |
| Publisher on the topic | `gmail-api-push@system.gserviceaccount.com` |
| Subscription | pull, read by the gateway (no public endpoint needed) |

## When it is done

Tell the cell: the project id, the client id (not the secret), the scopes granted, and which mailbox is the first test user. The client id is not a secret, but this cell will still keep it out of the public repository.

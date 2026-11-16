# Google OAuth setup: the values to configure

**Status: for Dinis to configure.** Nothing here has been set up yet. The labels follow the Google Cloud console as this cell understands it on 16 November 2026 (the "Google Auth Platform" pages: Branding, Audience, Data access, Clients); Google renames these often, so trust the console where they differ. [Back to the plan](index.md).

Dinis's word, 16 November 2026: "Can you add the website to Google OAuth details for me to configure?"

A proposal to use a browser client instead (the site itself as the gateway, no server) is on [the browser gateway page](browser-gateway.md); until Dinis approves it, the values below stand.

## The values, in one table

| Where in the console | Field | Value |
|---|---|---|
| Project | Google Cloud project | RiskMandate's (or The Cyber Boardroom's): Dinis's choice |
| APIs and services, Library | Enable | Gmail API (step 1); Cloud Pub/Sub API (later, for push) |
| Branding | App name | `Email AgenticCell` |
| Branding | User support email | Dinis's choice (not written here) |
| Branding | App logo | leave empty while testing (a logo starts Google's brand review) |
| Branding | Application home page | `https://email-cell.agenticcells.site/` |
| Branding | Application privacy policy link | `https://email-cell.agenticcells.site/privacy.html` (a draft: Dinis approves it first) |
| Branding | Application terms of service link | leave empty for now (optional) |
| Branding | Authorised domains | `agenticcells.site` |
| Branding | Developer contact | Dinis's choice |
| Audience | User type | External |
| Audience | Publishing status | Testing (leaving it is a stop-and-ask for Dinis) |
| Audience | Test users | our own addresses only (Google's limit is 100) |
| Data access | Scopes, step 1 | `https://www.googleapis.com/auth/gmail.metadata` only |
| Data access | Scopes, later | `gmail.readonly` (read), then `gmail.send` (send), each added only when its build step needs it |
| Clients | Application type | Desktop app (recommended while testing; see below) |
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

## Things Google does while in testing

- Refresh tokens for an External app in Testing expire after seven days, so the gateway will need a fresh sign-in each week until the app is published. To confirm in Google's documentation.
- No verification is needed for up to 100 test users. `gmail.metadata` and `gmail.readonly` are restricted scopes: leaving testing with them means verification and an annual security assessment (see [the policy page](policy.md)).
- The privacy policy and home page must sit on an authorised domain; verifying ownership of `agenticcells.site` (in Google Search Console) is needed before verification, not for testing.

## Later: push notifications

When the gateway receives by push instead of polling:

| Field | Value |
|---|---|
| Pub/Sub topic | `projects/<project id>/topics/email-cell-gmail` |
| Publisher on the topic | `gmail-api-push@system.gserviceaccount.com` |
| Subscription | pull, read by the gateway (no public endpoint needed) |

## When it is done

Tell the cell: the project id, the client id (not the secret), the scopes granted, and which mailbox is the first test user. The client id is not a secret, but this cell will still keep it out of the public repository.

# Request: crm.tool.sovereignweb.site

By crm.dev.a@AgentiCCells.dinis, 23 November 2026, for a.maestro to relay to account C's factory and AWS keepers. A list of facts, not the factory's own format: I have not been able to read SovereignWebsite__IaC `requests/README.md` (adding that repository to my session waits on Dinis). The factory should put these into its format.

## The site
- **Name**: CRM tool site.
- **Host (proposal)**: crm.tool.sovereignweb.site, from Dinis's naming of tool sites on 22 November 2026. A dev host beside it as the factory does for other tool sites (for example dev.crm.tool.sovereignweb.site).
- **Asked for by**: Dinis Cruz, 23 November 2026 about 15:05 UTC, G2 a: "from a CRM point of view, let's start creating the site". Relayed by a.maestro.
- **What it does**: a lead board (one row per company: stage, owner, draft state, last contact, next step), a page per company, follow-ups (we wrote last and no reply in 5 days), contacts, and links from a mail thread to a company.
- **Kind**: static files only. No server, no database, no functions, no stored state, no connector, no secrets.
- **Build**: `node crm/scripts/build-site.mjs <out>`, then serve `<out>` as is (about 0.5 MB: pages, a synthetic demo bundle of about 145 KB, and the Email Cell's pinned vault and key libraries).

## Data
- **Default**: demo mode on synthetic data, always available and always labelled. The data is generated from a seed, at reserved example domains only (RFC 2606). It ships inside the site and also sits in two public synthetic vaults on dev.send.sgraph.ai: the mail twin (mail.dev.a's; id in team/mail.dev.a/status.json on work/mail.dev.a) and the CRM records (egw210lk, crm.dev.a's).
- **Real data**: only from the person's own vaults, opened in their browser with their own keys. Keys stay in memory, or sealed to the browser's own non-extractable key if the person asks. The site never receives or stores real data, and the factory and its hosting see none.
- **Writes**: only a person's press, one file and one commit per link, only to their own CRM vault (marked as one in its manifest), never to the mail twin.

## Security
- **Content security policy** (in the page): `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://dev.send.sgraph.ai; base-uri 'none'; form-action 'none'`. Please also send `frame-ancestors 'none'` as a response header, since a meta tag cannot carry it.
- **Connects to**: the site itself and dev.send.sgraph.ai (the vault service). Nothing else. Links (not connections) go to the Email Cell's send screen, email-cell.agenticcells.site/app/send.html.
- **Third-party code**: none from other hosts. The vault library (sgit vault UI v0.2.3) and pki.sgit.ai v0.2.28 are served from the site, pinned by hash in the Email Cell's vendor/ folders.
- **Secrets the site needs**: none.

## Source and ownership
- **Source until the site has its own repository**: AgentiCCells/AgentiCCells__Cell__Email, branch work/crm.dev.a, folder crm/. Not on dev or main.
- **Repository wanted**: a new one for the site, name for the factory to choose in SovereignWebsite's naming, with dev and main. crm.dev.a pushes only to work branches; merges to main are Dinis's.
- **Owner agent**: crm.dev.a@AgentiCCells.dinis (key crm-dev-a-agenticcells, signing sha256:5082f0417d7ae097). Team conductor: a.mail.conductor. Decisions: Dinis.
- **Licences**: code Apache-2.0, text and data CC BY 4.0.

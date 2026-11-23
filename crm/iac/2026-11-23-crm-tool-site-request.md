# Request (draft): crm.tool.sovereignweb.site

Draft by crm.dev.a@AgentiCCells.dinis, 23 November 2026, for a.maestro to relay to account C's factory and AWS keepers. A proposal: I have not been able to read SovereignWebsite__IaC `requests/README.md`, so this lists the facts a request needs and the factory should put them in its own format.

- **Site**: crm.tool.sovereignweb.site (a tool site, by Dinis's naming of 22 November 2026).
- **Asked for by**: Dinis Cruz, 23 November 2026 ~15:05 UTC, G2 a ("from a CRM point of view, let's start creating the site"), relayed by a.maestro.
- **Kind**: static site; no server, no database, no connector, no stored state.
- **Repository**: a new one for the site (name for the factory to choose, following SovereignWebsite naming), with branches dev and main; crm.dev.a pushes to work branches only.
- **Content source until then**: AgentiCCells__Cell__Email, branch work/crm.dev.a, folder crm/.
- **Hosting**: as other tool sites (static bucket and CDN), dev and main environments.
- **Content security policy**: connect only to the vault service (SG/Send) and pki.sgit.ai's public register; no third-party scripts.
- **Data**: synthetic demo vault (public, reserved example domains only); real CRM vaults are opened only in the user's browser with the user's own keys. No real data is stored by the site.
- **Secrets**: none needed by the site.
- **Owner agent**: crm.dev.a@AgentiCCells.dinis (key crm-dev-a-agenticcells, signing sha256:5082f0417d7ae097).

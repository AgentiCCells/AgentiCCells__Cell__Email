# Email AgenticCell

The email agentic cell: one gateway agent alone touches Gmail; people and agents work on a signed, encrypted twin of the mailbox in a vault.

This first version is one page (`src/index.html`) that explains the design from the article [The email agentic cell](https://newsroom.sgit.ai/articles/the-email-agentic-cell.html): the architecture, the four flows, the five policy altitudes, some of the features and the build order. The cell itself is not built yet; a dedicated session will build it in this repository.

- Live at https://email-cell.agenticcells.site (version at /version.json).
- Made by the AgentiCCells site factory from request `requests/2026-11-16__email-cell/` in AgentiCCells__Site__Factory, seeded from AgentiCCells__Site__Template.
- Release: `scripts/release.sh` (build, validate, leak scan, then push to dev; CI deploys and tags v0.1.N).

Licences: code Apache-2.0; text CC BY 4.0.

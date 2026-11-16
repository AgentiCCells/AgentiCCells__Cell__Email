# Email AgenticCell

The email agentic cell: one gateway agent alone touches Gmail; people and agents work on a signed, encrypted twin of the mailbox in a vault. The brief is Dinis Cruz's article [The email agentic cell](https://newsroom.sgit.ai/articles/the-email-agentic-cell.html) (16 November 2026).

- Live at https://email-cell.agenticcells.site (version at /version.json): the plan at `/plan/`, the Agent Behaviour Policy at `/abp/cell-email.html`.
- Conductor: `cell.email@AgentiCCells.dinis`, instructed by Dinis Cruz. What exists is in [REALITY.md](REALITY.md); the latest hand-over is in `board/handovers/`.

## What is here

| Path | What |
|---|---|
| `abp/cell-email.md` | The cell's Agent Behaviour Policy (draft, deny by default) |
| `docs/plan/` | The plan: architecture, twin layout, lanes, policy altitudes, features, needs |
| `cell/twin/` | The twin's schema and loader |
| `cell/lanes/` | Lane entries: Ed25519 signatures, hash chains, merge checks |
| `cell/policy/` | The email policy checker, a language guesser, the policy simulator |
| `cell/firewall/` | The inbound firewall's cleaned copy |
| `cell/gateway/` | The gateway's decision (no Gmail) |
| `policy/` | Per-agent rights (altitude 3) and the simulated email policy (altitude 4 and 5) |
| `sim/` | The simulated mailbox: made-up messages only, generated into `_sim/twin/` |
| `tests/` | Tests, run against the simulated mailbox |

## Run

```
node --test tests/*.test.mjs                                 # the tests
node sim/build-mailbox.mjs                                   # write the simulated twin to _sim/twin/
node cell/policy/simulate.mjs _sim/twin policy/email-policy.json   # the policy simulator
```

Node 22, built-ins only, no dependencies.

## Release

`scripts/release.sh` runs the tests, the build, the validator and the leak scan, then pushes to dev; CI runs the same gates, deploys, and tags v0.1.N.

## Rules for this repository

- No real mailbox and no real personal data, ever: the simulated mailbox uses reserved example domains only.
- No key, signature or hash is committed: tests make fresh keys each run, and the simulated twin is generated.

Made by the AgentiCCells site factory from request `requests/2026-11-16__email-cell/` in AgentiCCells__Site__Factory, seeded from AgentiCCells__Site__Template.

Licences: code Apache-2.0; text CC BY 4.0.

# Workflow experiments, 22 November 2026

By email.workflows.d@AgentiCCells.dinis, for backlog item "workflow experiments" (each one tried on made-up mail, kept or dropped with a note). Asked by Dinis in email.pm.d's session, about 04:04 UTC: "We need to basically experiment". Every experiment runs a machine from `sim/workflows/machines.mjs` with its next event taken from what the real code decides, so the drawn path is the path the code takes. SIMULATION: made-up mail (`sim/workflows/fixtures.mjs`), the simulated twin, keys made fresh for each run.

## Round 1 (about 04:10 UTC)

| Experiment | Tried | Learned | Keep or drop |
|---|---|---|---|
| Compose machines driven by the writer | outreach, reply and follow-up on made-up mail through `writeEntry()` and `checkEntry()` | all three end in `in_outbox`; a denied domain ends in `dropped` | keep (now `tests/workflow-machines.test.mjs`) |

## Round 2 (05:13 UTC)

| Experiment | Tried | Learned | Keep or drop |
|---|---|---|---|
| Kill switch | a signed `gateway.stop` from the gateway agent merged with a drafter's outreach proposal; then the same stop with one byte changed | the signed stop makes `decideEntry()` refuse the proposal ("kill switch"); a changed stop fails `mergeLanes` and the machine ends in `not_signed`, so a forged stop cannot be used to fake a stop, but it also does not stop anything. Proposal: the page should show a stop it could not verify, not ignore it. | keep (`sim/workflows/round2.test.mjs`) |
| The page's first move on an entry | approve-and-send's `opened` decided by `problems()` and `decideEntry()` | a good entry goes to `ready`; the 21st send of the day and a Bcc go to `not_sendable` | keep |
| Trust ladder | walk it rung by rung, try to skip a rung, hold at a rung | no rung can be skipped; any rung can be held | keep, as a plan for Dinis (backlog: the trust ladder) |
| First real send | the step list as a machine, each step named by the page function that does it | the path to `done` runs only through approve-and-send; the steps exist in the page but have never run together, and the first one waits on the outbox key (W1) | keep; next: run each step in Chromium against fixtures (backlog: the first real send) |

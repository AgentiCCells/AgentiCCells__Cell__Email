# How email.pm.d coordinates the email.* sessions

On Dinis's word in email.pm.d's session, about 04:04 UTC 22 November 2026: "can you coordinate all these actions, all these sessions? ... So go to town, set up a tight schedule for you, iterate". Dinis can change any of this.

## The schedule

- **Every hour, at minute 5 (UTC)**, a scheduled wake (trig_01L64ZC6Ci2m1S34yV3ctACw, made 04:05 UTC 22 Nov, first run 05:05 UTC) fires into email.pm.d's own session (set up on Dinis's word above; email.pm.d's brief says only Dinis gives a wake). Each pass:
  1. Stop if `board/HOLD.md` exists on dev or on any work branch.
  2. Fetch; read every `team/email.*/status.json` and each `work/email.*` branch's new commits; read the live `/version.json`.
  3. Update `team/email-agents/backlog.md`: claims, items done, items blocked, anything Dinis has said since.
  4. Send each started agent a short note only when something changed for it: a newly ranked item, a blocker another agent can clear, or a hand-off. Send conductor.d one short summary.
  5. Write release notes for any new release, and fix REALITY.md where it has drifted.
  6. Leave a dated entry in `team/email.pm.d/notes/` and push to `work/email.pm.d`.
- **When Dinis speaks** in this session, his words go into a board note with the time, then into the backlog.

## Rules for coordination

- Dinis instructs. email.pm.d ranks and asks; its notes to other agents are requests inside their briefs, never authority beyond them. conductor.d still starts and stops agents and relays Dinis's words from its session.
- Each agent claims an item in its own status file before starting. email.pm.d does not write in other agents' paths.
- Hand-offs go to email.dev.d with the branch, the commit and the checks run; only email.dev.d pushes to dev, on Dinis's word.
- email.pm.d starts no session and no workflow, and sets up no scheduled task other than its own hourly wake.

# Restart: how cl-3.mail.conductor takes over

1. **Attach:** AgentiCCells/AgentiCCells__Cell__Email (push); read-only as needed: SovereignWebsite/Site__Tool__Google__Gmail, Site__Tool__CRM; SovereignWebsite/Site__Agent__Mail (push; your area, if Dinis allows).
2. **Read, in order:** CLAUDE.md, REALITY.md (dev), board/handovers/2026-11-23-mail-conductor-a.md, then on work/mail.conductor.a: this folder (team/mail.conductor.a/agent-area/...), team/mail.conductor.a/status.json, requests.md, notes/ and site/decisions/requests/.
3. **Key:** make your own (`sgit-ai pki keygen`), publish its public half in team/keys/ (and site/keys/ in Site__Agent__Mail), mark mail-conductor-a-agenticcells superseded. Sign commits with it: `apt-get install -y openssh-client`; export the signing half to OpenSSH; repo-local `gpg.format ssh`, `gpg.ssh.program /usr/bin/ssh-keygen`, `user.signingkey`. The global config signs with the harness key.
4. **Wake:** the old one (trig_015msr7LxeWscZ7qHgbzfijs, hourly :13) is disabled; a new one is your maestro's to set at Dinis's word.
5. **First steps:** check dev and live (/version.json), board/HOLD.md, the team's branches; tell mail.dev.a and crm.dev.a (or their successors) who you are; chase the decisions in agent.json's waiting_on.

# Learnings (mail.conductor.a, 23 to 25 November 2026)

- **Times:** take every time from `date -u`, git or a message's queued stamp. Three agents here wrote estimates ahead of the clock; other sessions' stamps can run ~17 min ahead of this machine.
- **Gate commits on the leak scan** with `&&`; one commit went out with the scan failing because a chain used `;`.
- **Sign with your own key**, not the harness's (see restart.md).
- **Agent: trailer** must sit in the final trailer block; force-pushes are refused, so fix on a new landing branch.
- **Permission refusals are Dinis's**: never route around them (no clone of a refused repo, no peer doing it for you). Put the ask to him, naming the session.
- **Formats:** when two agents get two answers, settle once, write it down, and point both at one shared file pinned to a commit.
- **Demo data:** use clearly invented names ("Example ... (demo)"); create each vault in a new empty folder; mask sgit output.
- **Relays lose time:** a request held 6 h at a relay; keep a request timeline (requests.md) so waits show.
- **A decision record does not lift a session's permission check**: landing needed Dinis in the developer's own session.

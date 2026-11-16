# History

## Setup

- 2026-11-16: superpowers 7.0.2 (plugin manifest). Where its skills differ from CLAUDE.md, CLAUDE.md wins:
  - brainstorming waits for the owner to approve the design doc; here a spec merges on green without the owner.
  - writing-plans saves plans to `docs/superpowers/plans/`; here the plan lives inside the spec.
  - executing-plans defers minor review findings to a ledger; here the fix round fixes every in-scope finding.
- Session tools for the staged path (checked 2026-11-16): starting a separate session works through the project
  coordinator (it starts threads on request); messaging the coordinator and other threads works; choosing a model
  per session and archiving sessions are not available from a thread, so sessions run on the default model and
  finished ones are listed for the owner to close. Isolated review agents (subagents) are available.

## Standing permissions

- None yet.

## Approved screens

- None yet.

## Lessons

- None yet.

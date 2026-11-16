# History

## Setup

- 2026-11-16: superpowers 7.0.2 (plugin manifest). Where its skills differ from CLAUDE.md, CLAUDE.md wins:
  - brainstorming waits for the owner to approve the design doc; here a spec merges on green without the owner.
  - writing-plans saves plans to `docs/superpowers/plans/`; here the plan lives inside the spec.
  - executing-plans defers minor review findings to a ledger; here the fix round fixes every in-scope finding.
  - writing-plans asks the owner to review the plan and pick how it runs; here the owner approves only the finished
    result and product choices, and Settings fixes the models.
  - finishing-a-development-branch offers a local merge or leaving the branch as it is; here every change merges
    through a pull request on green (merge commit), and a pull request whose lane has opened is never left open.
- Session tools for the staged path (checked 2026-11-16): starting a separate session works through the project
  coordinator, which starts threads on request; messaging the coordinator and other threads works; tools named
  `switch_model` and `archive_session` are listed for this session but were not tried yet. Isolated review agents
  (subagents) work: one ran the audit of PR #1.

## Standing permissions

- None yet.

## Approvals

- 2026-11-16 16:14 UTC: the owner said "ok" to merging PR #1 once CI is green and to requiring the `gate` check on
  `main` with branch protection. Scope: PR #1 and that one repository setting.
- 2026-11-16 16:29 UTC: the owner accepted one fresh implementation audit for PR #1 in place of a spec and plan audit
  (decision card). Scope: PR #1 only.
- 2026-11-16 16:32 UTC: PR #1 merged as 31fa429. The owner ran the branch protection command; verified: `main` is
  protected and requires the `gate` check. Sessions cannot change repository settings or delete branches through
  their GitHub access, so those are owner CLI steps.

## Approved screens

- None yet.

## Lessons

- None yet.

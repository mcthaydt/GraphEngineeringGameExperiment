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
  (subagents) work: one ran the audit of PR #1 and one the first audit of PR #4. Since PR #4 the rules ban subagents
  unless the owner says so; reviews, builders and critics are threads the coordinator starts.

## Standing permissions

- None yet.

## Approvals

- 2026-11-16 17:13 UTC and 17:15 UTC: the owner gave the eight findings from the apps run, "Fable should never code",
  and the apps rules text. Scope: those exact edits to CLAUDE.md and the `release`, `vertical-slice` and
  `visual-check` skills. PR #4 merged as 686c8b9 (reviewed at 01890cd, tested at c4f9fc5, main 1024f71).
- 2026-11-16 17:45 UTC and 17:48 UTC: the owner replaced "Fable never writes code" with "Fable orchestrates, Sonnet
  builds, in separate threads", and cut run B (the slice B brief). Scope: that wording in CLAUDE.md and the
  `vertical-slice` skill, and removing `docs/superpowers/specs/2026-11-16-slice-b-brief.md`. PR #7, audited at d4d0d2c (PASS, `audits/2026-11-16-4-implementation-audit.md`); its merge commit is the PR #7 merge on `main` (af07cb3).
- 2026-11-16 18:17 UTC: the owner cut the CLAUDE.md "Fable orchestrates" bullet and its Settings wording and kept the
  `vertical-slice` Gauntlet change. Scope: those two edits only.
- 2026-11-16 19:21 UTC: the owner asked for a retro after every slice (instead of a daily one). Scope: the Retro bullet
  and Settings wording in CLAUDE.md, the retro stage in the `vertical-slice` skill and the lesson line in `review`.
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

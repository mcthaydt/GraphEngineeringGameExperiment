# Progress

Last updated: 2026-11-16 17:49 UTC (written by the implementer for the coordinator, which cannot write to the repo)

## Active milestone: setup, then milestone 0 (the vertical slice)

### Current work

- Milestone 0, the vertical slice, running in its own session (prompt: blind A/B bar, 60 fps, keyboard and touch).

### Completed outcomes

- Public repo `mcthaydt/GraphEngineeringGameExperiment` created by the owner.
- Setup merged (PR #1, 31fa429): rules files, scaffold on the 3D stack, CI gate, tracking files.
- `main` requires the `gate` check (owner ran the command; verified).
- Rules update merged (PR #4, 686c8b9, lane 3): the owner's eight findings from the apps run, the apps rules wording,
  no subagents, and "Fable never writes code". Audits: `audits/2026-11-16-2-implementation-audit.md` and
  `audits/2026-11-16-3-implementation-audit.md` (cycle 3 PASS at 01890cd).

### Remaining

- Finish the vertical slice, including CI screenshots and playtest video.
- Agree the delivery order after the slice.
- Delete the merged branch `setup/project-rules` (owner CLI step; still present at 16:33 UTC).
- Delete the merged branch `claude/project-thread-diycz9` after this docs pull request merges (owner CLI step:
  `git push origin --delete claude/project-thread-diycz9`).
- Owner decision on removing `--passWithNoTests` from `.github/workflows/ci.yml` (lines 87, 118, 119). The owner said
  yes, but the repo has 1 browser test file for 6 shards, so removal turns CI red; a decision card is open with a
  recommendation (separate follow-up pull request once there are enough browser tests).

### Blockers

- None.

### Previews

- None yet. The first preview will be the playable slice.

### Decisions

| Decision | Who | Notes |
|---|---|---|
| Core loop guess for the slice: run and jump across floating platforms to a flag; falling restarts | Agent (assumption) | Owner gave no core loop. |
| Real 3D: pixi.js 8.23.0 + @pixi/3d 0.1.0, rapier3d-deterministic 0.21.0 instead of rapier2d | Owner (decision card, 2026-11-16) | @pixi/3d needs pixi.js ^8.23.0, so the listed 8.22.0 was bumped. @pixi/3d is 0.1.0, days old. |
| Lint is ESLint 10 + typescript-eslint (strict) | Agent | The owner's tooling list named no linter. Easy to swap. |
| TypeScript 6.0.3, not 7 | Agent | typescript-eslint and svelte-check do not support 7 yet (their peer ranges stop at 6). |
| Playwright 1.63.0 | Agent | Matches the browser preinstalled in the cloud container; CI installs its own. |
| Setup PR #1 ran on the short path though it is lane 3: no spec and no plan audit; a fresh implementation audit ran (`audits/2026-11-16-1-implementation-audit.md`) | Agent (deviation) | Owner accepted it (decision card, 16:29 UTC). |
| PR #4 wording: the owner's apps rules text wherever it matched the eight findings; a slice is never a small change for `visual-check` | Owner (message, 2026-11-16 17:15 UTC) | Replaced the implementer's first wording after the cycle 2 audit failed it. |
| PR #4 ran lane 3 with two fresh audits instead of a spec and plan audit | Agent (deviation) | The owner's attached messages were the approval; an isolated subagent ran the first audit, threads ran the rest. |
| Fable orchestrates and Sonnet builds, in separate threads (replaces "Fable never writes code"); run B cut, its brief removed | Owner (messages, 2026-11-16 17:45 and 17:48 UTC) | Fable may touch code only to integrate or unblock, never to build a piece. After the slice the normal flow runs: plan Fable, plan audit Opus, execution Sonnet high, implementation audit Opus, advisor Fable. |
| Commit author is `mcthaydt <107786093+mcthaydt@users.noreply.github.com>` | Agent (assumption) | GitHub's no-reply address, so no private email is published. Owner may change it. |
| Wide and hard-to-undo paths in CLAUDE.md Risk | Agent (assumption) | Filled from this layout; revisit when the code grows. |

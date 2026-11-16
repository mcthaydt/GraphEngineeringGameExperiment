# Progress

Last updated: 2026-11-16 16:34 UTC

## Active milestone: setup, then milestone 0 (the vertical slice)

### Current work

- Milestone 0, the vertical slice, running in its own session (prompt: blind A/B bar, 60 fps, keyboard and touch).

### Completed outcomes

- Public repo `mcthaydt/GraphEngineeringGameExperiment` created by the owner.
- Setup merged (PR #1, 31fa429): rules files, scaffold on the 3D stack, CI gate, tracking files.
- `main` requires the `gate` check (owner ran the command; verified).

### Remaining

- Finish the vertical slice, including CI screenshots and playtest video.
- Agree the delivery order after the slice.
- Delete the merged branch `setup/project-rules` (owner CLI step; still present at 16:33 UTC).

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
| Commit author is `mcthaydt <107786093+mcthaydt@users.noreply.github.com>` | Agent (assumption) | GitHub's no-reply address, so no private email is published. Owner may change it. |
| Wide and hard-to-undo paths in CLAUDE.md Risk | Agent (assumption) | Filled from this layout; revisit when the code grows. |

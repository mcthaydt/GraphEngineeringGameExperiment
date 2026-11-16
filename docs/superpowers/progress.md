# Progress

Last updated: 2026-11-16 16:25 UTC

## Active milestone: setup, then milestone 0 (the vertical slice)

### Current work

- Setup pull request: rules files, project scaffold, CI gate, tracking files.

### Completed outcomes

- Public repo `mcthaydt/GraphEngineeringGameExperiment` created by the owner.
- CLAUDE.md and the five skills saved from the owner's message, placeholders filled (see Decisions).

### Remaining

- Merge the setup pull request (lane 3: it adds CI and the rules files, so it needs the owner's word).
- Turn on branch protection on `main` requiring the `gate` check (owner's word; repository setting).
- Start the vertical slice.
- Automatic screenshots and playtest video in CI, once the slice adds screens and playtests.

### Blockers

- None yet. The merge waits on the owner's approval for the lane 3 items above.

### Previews

- None yet. The first preview will be the playable slice.

### Decisions

| Decision | Who | Notes |
|---|---|---|
| Real 3D: pixi.js 8.23.0 + @pixi/3d 0.1.0, rapier3d-deterministic 0.21.0 instead of rapier2d | Owner (decision card, 2026-11-16) | @pixi/3d needs pixi.js ^8.23.0, so the listed 8.22.0 was bumped. @pixi/3d is 0.1.0, days old. |
| Lint is ESLint 10 + typescript-eslint (strict) | Agent | The owner's tooling list named no linter. Easy to swap. |
| TypeScript 6.0.3, not 7 | Agent | typescript-eslint and svelte-check do not support 7 yet (their peer ranges stop at 6). |
| Playwright 1.63.0 | Agent | Matches the browser preinstalled in the cloud container; CI installs its own. |
| Setup PR #1 ran on the short path though it is lane 3: no spec and no plan audit; a fresh implementation audit ran (`audits/2026-11-16-1-implementation-audit.md`) | Agent (deviation) | Owner asked whether that is enough. |
| Commit author is `mcthaydt <107786093+mcthaydt@users.noreply.github.com>` | Agent (assumption) | GitHub's no-reply address, so no private email is published. Owner may change it. |
| Wide and hard-to-undo paths in CLAUDE.md Risk | Agent (assumption) | Filled from this layout; revisit when the code grows. |

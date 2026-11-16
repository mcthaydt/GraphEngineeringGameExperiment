# Progress

Last updated: 2026-11-16 17:26 UTC (written by the implementer for the coordinator, which cannot write to the repo)

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
- Owner may reshape the vertical-slice workflow (one Sonnet implementer plus parallel fresh review threads); not
  started, waits for the coordinator.

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
| Commit author is `mcthaydt <107786093+mcthaydt@users.noreply.github.com>` | Agent (assumption) | GitHub's no-reply address, so no private email is published. Owner may change it. |
| Wide and hard-to-undo paths in CLAUDE.md Risk | Agent (assumption) | Filled from this layout; revisit when the code grows. |

## Milestone 0: the vertical slice (kept by the slice session; last updated 2026-11-16 17:20 UTC)

Goal: run and jump across a short course of floating platforms to reach a flag. Falling puts you back at the start.
Reaching the flag shows "You made it!" with one big "Play again" button.

Bar: in a blind A/B against stills of the opening course of a polished commercial 3D platformer, a judge cannot pick
ours as the amateur one on readability, game feel and polish. Also 60 fps in headless Chromium on the computer profile
(measured), playable with keyboard and touch on small phone, tablet and computer, and a new player knows what to do
within 10 seconds.

### Slice: current work

- Round 1 of 3: builders improve each piece, separate harsh critics judge it against the bar.

### Slice: completed outcomes

- First playable course, built by the slice lead: run, jump (tap for a hop, hold for a leap), fall and return to the
  start, reach the flag, "You made it!", "Play again". Keyboard (arrows or WASD, Space) and touch (stick and Jump
  button).
- Playtests in `tests/playtest/`: an autopilot wins the course with the keyboard and with the touch controls on each
  device size (computer 1280x720, tablet 810x1080, small phone 375x667), then presses "Play again"; a fall test.
- `npm run measure`: frame times of the built game in headless Chromium at 1280x720. First playable: mean 16.66 ms,
  median 16.7, p95 17.0, max 22.3, 0 of 571 frames over 25 ms (SwiftShader, no graphics card, light setting).
- `npm run capture`: screenshots on each device size and a 10 second clip, full setting, time stepped by hand.

### Slice: remaining

- Rounds 1 to 3 of build, judge, fix. Then the report: bar reached, evidence, what is left.
- Lane 2 review of the pull request by a fresh session, and the visual check, before it can merge.
- Automatic screenshots and playtest video in CI: needs a change to `.github/` (lane 3), so it waits for the owner.

### Slice: blockers

- None.

### Slice: previews

- Screenshot gallery, updated each round: https://claude.ai/artifact/AU49SLB3f6zpMbt3H1P5iu (private to the owner).
- Draft pull request #3. Local: `npm run dev`, or `npm run build && npm run preview`.
- No public preview link exists; publishing one needs the owner's permission.

### Slice: decisions

| Decision | Who | Notes |
|---|---|---|
| Fable 5.2 leads the slice; builders and critics on Sonnet, high | Owner ("that's fine", 2026-11-16) | From the `vertical-slice` skill's prompt. |
| Two picture settings, picked by the game: "lite" on machines with no graphics card, "full" elsewhere | Agent | Measured on this machine (SwiftShader): lit surfaces 37 to 52 ms a frame. Lite draws at half size with no smoothing; full draws at screen size (up to 2x) with smoothing. `?quality=lite` or `full` forces one. The 60 fps number is for lite. Full has not been run on a real graphics card. |
| Scenery lighting is baked into corner colours, not computed live | Agent | Live lighting on big surfaces was the cost above. Same look on both settings. No real shadows; a round shadow under the player shows where a jump lands. Moving things (player, flag) are lit live. Easy to change per object. |
| The sky is a CSS gradient behind a see-through canvas | Agent | Painting it in 3D cost 3 ms a frame; this costs nothing measurable. |
| "60 fps" is judged as: mean frame time at most 16.7 ms and under 1% of frames over 25 ms, over 10 s | Agent | The screen ticks every 16.67 ms, so single frames wobble around it by a fraction of a millisecond. |
| Physics tests run in the browser, not Node | Agent | The physics package only loads as a browser module. A small Vite plugin in `vite.config.ts` loads its wasm once. |
| Tuning lives in `src/features/tuning/library/game.toml`, not a top-level `config/` | Agent | A feature owns its data; the layer test rejects imports from outside `src/`. |
| Screenshots and the clip are taken on the full setting with time stepped by hand | Agent | So they repeat exactly and show what a player with a graphics card sees. Frame time is measured separately, on the real clock. |

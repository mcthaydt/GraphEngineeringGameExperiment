---
name: vertical-slice
description: Use when starting a new game, or when a game has no playable slice yet.
---

# Vertical slice

A game starts with a vertical slice: one short, playable path through the core loop, as good as it can be. Then the game
grows one milestone at a time from the slice, which evolves by default.

## Setting up

- Inspect the current repository, branch, remotes, project files and CI first. Reuse the existing repository; the
  absence of a playable slice is not a reason to create another one.
- Determine the platform and repository visibility from the brief and existing project. Ask the owner only for
  missing choices. This kit assumes a browser game with Playwright playtests and screenshots; another platform needs
  a suitable playtest tool and screenshot method recorded in the brief and covered by its permissions.
- If no repository exists, create one with the `gh` CLI only within the authorized destination and visibility. If a
  repository exists, preserve its history, remotes and existing project configuration.
- Perform needed setup on a branch, adding only missing project structure and tracking files:
  `docs/superpowers/progress.md`, `history.md` and `docs/superpowers/roadmap.md`. Reuse suitable existing setup and run
  the `release` setup check. CI workflow changes retain lane 3 checks and require explicit or applicable standing
  permission, except at first-time setup (see Risk in CLAUDE.md). Merge required setup changes before the slice starts; skip a setup pull request when nothing changes.

## Making the slice

The slice inherits the limits in Settings; where the prompt below says to keep looping or not to fix a number of rounds,
those limits win. A try is one round: build, judge, fix. Its builders and critics count toward the work-session limit
and run within it. The bar is met when the checks the coordinator wrote down before the run (what the slice must do, on
which devices and hardware, within what frame time) pass in a recorded playthrough, and there are no unresolved blocking
defects against the agreed criteria (optional improvements are notes and do not hold it up).

The coordinator fills in the two blanks below, runs this prompt once, and tells the owner the bar it chose, in one
sentence. It is Matt Shumer's Claude of Duty prompt, with the models added:

I want to run a Gauntlet Loop for this goal:

[GOAL]

Possible references or quality bars:

[OPTIONAL REFERENCES]

Choose the strongest concrete bar that an agent can actually inspect and compare its work against. If I have not supplied one, propose a useful comp or measurement that plays the same role for this task that real Call of Duty screenshots played for Matt Shumer's Claude of Duty game (read the prompt: https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md). Explain the bar in one sentence.

Then write a short prompt for Claude Code or Codex in the style of Matt's prompt (minimal is better here, we want the agent to decide the specifics!).

Give the lead agent the goal and the bar, but let it choose the approach. Tell it to divide the goal into the smallest pieces that can be improved and judged independently. For each important piece, it should ask for a builder and a separate critic, each in a fresh session.

Each critic must inspect the real output, compare it directly with the bar—using a blind A/B comparison when possible—identify the biggest remaining gap, and send it back for another round. Keep looping until our output wins or I stop the run.

Have the lead agent keep the existing progress record current and send early playable previews and material decisions to the coordinator, following the owner visibility rules.

The lead orchestrates. It runs on Fable at medium effort, splits the work and writes a self-contained brief (goal, files, acceptance check, branch) for each builder and critic, and the coordinator starts each one as its own thread on Sonnet high. The lead's first step is sending builder briefs, not building. It touches code only to integrate or unblock, such as merge conflicts or wiring pieces together, never to build a piece. Do not prescribe the architecture, exact decomposition, or a fixed number of rounds. Keep the final prompt short, just like Matt's.

- `[GOAL]` is the game's one-line pitch and core loop, from the owner. `[OPTIONAL REFERENCES]` are the owner's reference
  games or screenshots, if any.
- The prompt writes a shorter prompt. The coordinator adds one line to the prompt it hands the slice session, so the
  limit travels with it: "Stop after N rounds and report the bar reached, the evidence and what is left", with N the
  slice rounds in Settings. That line wins over anything in the prompt about rounds.
- The slice session runs where it can run and play the game: a cloud session with a headless browser when that is
  enough, the owner's computer only when the slice needs a GPU or real input feel. Its builders and critics are separate
  threads that follow the Delegation rule and session limits; required reviews are separate threads too.
- The slice lead is tracked like a stage: it reports to the coordinator, which keeps `progress.md`, one line per piece
  finished. The lead orchestrates and does not build pieces; its builders count as writing code.

## From the slice to the game

- The slice is the game's first version, not a throwaway. When it is finished, the owner approves it as a finished
  result and later work starts from it. Each piece of later work takes the short or the staged path by its own risk, with
  the slice as the starting point of its brief.
- It evolves by default. Assess it first: for each part, keep, refactor or replace, with a reason, written into the
  brief. Refactor or replace a part only for a constraint shown by evidence: a test it cannot take, a measured budget it
  misses, a defect its structure keeps causing. Code not fitting the folder layout alone never justifies replacing
  working gameplay; it moves into the layout as it is touched. Behavior is preserved by repeatable playthroughs and
  recorded parameters with their units (speeds per second, sizes in pixels or metres, timings in milliseconds), not by
  copying numbers alone.
- Before a part is replaced, the brief names a runnable baseline when one helps: a commit the playtest runs on, to
  compare the new part against.
- The coordinator and the owner agree a delivery order: a short list of milestones in
  `docs/superpowers/decompositions/<date>-<topic>-delivery-order.md`. Milestone 0 is the slice. Each milestone gets its
  brief and follows the shared risk rules: work inside it takes the short or the staged path by its own risk, and
  independent pieces run side by side within the limits in Settings. Later work follows those shared paths; the
  Gauntlet prompt is not run again.
- `docs/superpowers/roadmap.md` lists everything left, in order, with who does each step (the owner or a session) and
  where it stands. The coordinator keeps it current. A milestone is done when it is merged to `main`, green there, its
  screens have been through the design review loop (`visual-check`), and the owner has approved the finished result.

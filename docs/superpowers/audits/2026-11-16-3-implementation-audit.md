# Implementation audit, cycle 3: fixes for the cycle 2 findings on the rules update

**Verdict: FAIL** (1 red finding, 8 notes). R1 and R2 from cycle 2 are fixed. R3 is not: `vertical-slice` still
starts the staged path and a spec after every slice, which a small app no longer does.

Commit examined: `986542474b047186cb8e8672beaf12808e2328ce` on `claude/project-thread-diycz9` (PR #4), compared with
`1024f71` (the whole change) and with `a85385f` (what this round changed). HEAD matched this commit when the audit
started. Audit written 2026-11-16 17:20 UTC (from `date -u`). The audit changed nothing except this file.

Lane: 3 (CLAUDE.md and the `release`, `vertical-slice` and `visual-check` skills).

Brief: the owner's eight findings, "Fable should never code", and the owner's apps rules text (message of 2026-11-16
17:15 UTC), which the author adopted as the wording wherever it matches.

Prompt: Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to
the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## What ran

- Read the cycle 2 audit, `git diff 1024f71..9865424` and `git diff a85385f..9865424`, and CLAUDE.md, `release`,
  `vertical-slice` and `visual-check` as they stand at `9865424`.
- Compared each changed passage with the owner's apps rules text, sentence by sentence.
- `git grep` at `9865424` across CLAUDE.md and `.claude/` for: subagent, isolated review, review agent, stages start,
  only staged, slice session, lane 3, small app, passWithNoTests.
- Read PR #4 through the GitHub API: its body's last line is "Requested by **The Realest Alive**" (rule 7 holds).
- Commit `9865424`: author mcthaydt; no co-author, no Claude-Session trailer, no "Generated with Claude Code" line.
- Did not run lint, typecheck, tests or build: the change touches only `.md` files.

## Cycle 2 findings

| Finding | Result | Evidence |
|---|---|---|
| R1: `vertical-slice` setup still made first-setup CI lane 3 | Fixed | Line 22-23 now ends "except at first-time setup (see Risk in CLAUDE.md)", agreeing with CLAUDE.md "First-time setup" and `release` line 12 |
| R2: "the setup PR is the only staged unit" against "lane 3 is staged" | Fixed | CLAUDE.md line 43-44 now reads, in the owner's apps wording, "A small app with no users or real data takes the short path, its first-time setup included." First-time setup is lane 2, so it no longer meets the lane 3 staging rule. Later lane 3 work stays staged by lines 48-49 and the "When" bullet, which are the owner's own words |
| R3: `vertical-slice` starts the stages after the slice | **Not fixed** | See R3 below. `git diff a85385f..9865424 -- .claude/skills/vertical-slice/SKILL.md` touches only lines 22-23 and 60-68 |

## Criteria against the owner's wording

| # | Criterion | At `9865424` | Result |
|---|---|---|---|
| 1 | Rules govern from the first message | CLAUDE.md "How work goes", first bullet, verbatim apps text | Met |
| 2 | Bootstrap lane 2; the request is the standing permission | CLAUDE.md "First-time setup", verbatim; `release` line 12 verbatim; `vertical-slice` line 23 | Met |
| 3 | Delegate writes records; timestamps from `date` | CLAUDE.md Writing and Report honestly | Met (N3 on order) |
| 4 | Owner-only steps as one CLI batch | `release` setup check, first bullet, verbatim | Met |
| 5 | Who runs visual-check step 1 for a first slice | `visual-check`, verbatim apps text | Met |
| 6 | No `--pass-with-no-tests` in CI | CLAUDE.md Tests, verbatim | Rule met; CI file still uses it (N1) |
| 7 | Check the PR body's last line | CLAUDE.md Identity; PR #4 body ends correctly | Met |
| 8 | Small app takes the short path | CLAUDE.md line 43-44, verbatim | Written in; `vertical-slice` still contradicts it (R3) |
| 9 | Fable never writes code; threads, not subagents | CLAUDE.md Limits (verbatim), Delegation, "Fable never writes code", staged-path bullet (verbatim), Settings; `vertical-slice` lines 54, 62-65 | Met |

Every hunk maps to a criterion. Nothing unrelated changed.

## Red findings

### R3 (carried from cycle 2, still open)

- UNIT: `.claude/skills/vertical-slice/SKILL.md`, "From the slice to the game", lines 69-71.
- VERDICT: red
- REQUIREMENT: Criterion 8 ("A small app with no users or real data takes the short path"), and the cycle 2 fix round,
  which must fix every in-scope finding.
- REASON: After the slice, the skill still says "the stages start" and asks for a spec, so a small app is sent down the
  staged path by default.
- EVIDENCE: Line 69-70: "the owner approves it as a finished result and the stages start, with the slice as the spec's
  starting point." Line 70-71: "keep, refactor or replace, with a reason, written into the spec." This repo is "a super
  simple 3D platformer" with no users or real data, so criterion 8 applies. The same skill's delivery-order bullet
  already says work "takes the short or the staged path by its own risk", which disagrees with "the stages start".
- EXPECTED: The skill says work after the slice takes the short or the staged path by its own risk (for a small app,
  the short path), and the keep/refactor/replace assessment goes into the milestone's brief.
- FIX: In that file only, replace "and the stages start, with the slice as the spec's starting point" with "and later
  work starts from it, on the short or the staged path by its own risk", and replace "written into the spec" with
  "written into the brief". Line 74 ("Before a part is replaced, the spec names a runnable baseline") becomes "the
  brief names". Touch only `.claude/skills/vertical-slice/SKILL.md`.

## Notes (recorded, not fixed here)

- **N1. CI still uses `--passWithNoTests`.** `.github/workflows/ci.yml` lines 87, 118 and 119 at `9865424`. The PR body
  records this under "Open, not in this PR", waiting on the owner's decision card (1 browser test file today, so most of
  the 6 shards would be empty). That is correct handling: `ci.yml` is its own lane 3 unit. Until it is decided, `main`
  breaks rule 6. It is still not in `progress.md` or `roadmap.md` (grep found nothing).
- **N2. "Isolated reviewer" against "no subagents".** CLAUDE.md "Can this runtime start sessions?" (line 230-231) still
  allows "an isolated reviewer it supports". "Starting a game" now says reviews are threads the coordinator starts, and
  Limits says no subagents unless the owner says so. This is the owner's own apps text, kept as written, so it is not
  red; it reads best as "an isolated reviewer the owner has allowed".
- **N3. Writing bullet order.** The branch puts "Otherwise the implementer owns those records" before the delegate
  sentence; the apps text puts it after. Same meaning, and the branch order keeps "Otherwise" next to "while active",
  which is clearer. No change needed.
- **N4. The same sentence three times.** "Sessions the coordinator starts are threads, not subagents" appears in Limits,
  Delegation and the staged path. The owner's text has it twice; the Delegation copy is the platformer's addition.
  They agree.
- **N5. Unwrapped lines.** The edits left lines past the file's 120-column wrap: CLAUDE.md lines 115 and 137, and
  `vertical-slice` line 23. Cosmetic.
- **N6. "Slice session".** `vertical-slice` lines 58 and 61 still say "slice session" while line 64 and CLAUDE.md say
  "slice lead"; line 61's "where it can run and play the game" is now about where the builders and critics run.
- **N7. Lead keeps the progress record.** The Gauntlet prompt (`vertical-slice` line 52) still tells the lead to "keep
  the existing progress record current", while the coordinator is the only writer of `progress.md`. Not caused by this
  change.
- **N8. Models named outside Settings.** `vertical-slice` line 54 and CLAUDE.md "Fable never writes code" name Fable and
  Sonnet high, while Settings says to change a model there and nowhere else. Expected for this brief; a future model
  change edits three places.

Cycle 2 notes N2 and N3 (placement and wording of rules 6 and 7) and N6 (dangling "builders") are resolved by this
round. N5 (who creates the repo) is resolved by the apps wording "every step only the owner can run".

## Re-check of R3 at `01890cd`

**Verdict: PASS** (R3 fixed; no red findings left. The 8 notes above stand as follow-ups.)

Commit examined: `01890cd` on `claude/project-thread-diycz9`. Re-check written 2026-11-16 17:22 UTC (from `date -u`).

- Since `9865424`, the only changes are this audit file (`a132c6b`) and `.claude/skills/vertical-slice/SKILL.md`
  (`01890cd`): `git diff --stat a132c6b 01890cd` lists only that skill, 7 lines.
- R3: "the stages start, with the slice as the spec's starting point" now reads "later work starts from it. Each piece
  of later work takes the short or the staged path by its own risk, with the slice as the starting point of its brief."
  "written into the spec" and "the spec names a runnable baseline" now say "the brief". `git grep` finds no "stages
  start" and no "spec" left in the skill outside the Gauntlet prompt's ordinary words. This agrees with criterion 8
  and with the skill's own delivery-order bullet.
- Commit `01890cd`: author mcthaydt; no co-author, no Claude-Session trailer, no "Generated with Claude Code" line.

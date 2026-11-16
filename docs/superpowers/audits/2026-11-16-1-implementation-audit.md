# Implementation audit, cycle 1: setup pull request

Commit examined: `171b2d6c3b426fe5d283973e5afbc8639258ebb9` on `setup/project-rules` (PR #1). `git rev-parse HEAD`
matched before the audit started. Nothing in the repo was changed except this file.

Brief: the body of PR #1 (acceptance criteria, lane, choices, "Not done here"), plus CLAUDE.md and the five skills as
saved, compared with the owner's original text in the setup message.

Prompt: Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to
the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## What ran, and what it showed

| Check | Result |
|---|---|
| `npm ci` | exit 0. `npm audit` reports 9 advisories (2 low, 7 moderate), all in dev tools (see N10) |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 (tsc, then svelte-check: 0 errors, 1 warning, "No svelte input files were found") |
| `npm test` | exit 0: 2 files, 4 tests (unit: architecture; browser: WebGL2 in headless Chromium) |
| `npm run build` | exit 0 (`dist/index.html` 0.29 kB, `dist/assets/index-*.js` 0.70 kB) |
| Verbatim check | The five skills are identical to the owner's text. CLAUDE.md differs only on the placeholder lines (`# [PROJECT]`, `[WHAT IT IS FOR]`, `[STACK]`, the five commands, `[COMMIT AUTHOR]`, `[OWNER NAME]`, `[WIDE PATHS]`, `[HARD-TO-UNDO PATHS]`) |
| Stack versions | `npm ls` shows pixi.js 8.23.0, @pixi/3d 0.1.0 (peer `pixi.js ^8.23.0`), @dimforge/rapier3d-deterministic 0.21.0, koota 0.6.6, effect 3.22.2, zod 4.6.6, svelte 5.57.1, smol-toml 1.9.1, TypeScript 6.0.3, Vite 8.3.8, Vitest 5.1.0, Playwright 1.63.0 |
| Stack builds | In a scratch copy, a `main.ts` importing rapier3d-deterministic, @pixi/3d, pixi.js, koota, effect, zod and smol-toml builds with `vite build` and typechecks |
| TypeScript 6 claim | Confirmed: typescript-eslint 8.72.2 peer `typescript >=4.8.4 <6.1.0`; svelte-check 4.7.8 peer `^5 \|\| ^6` |
| Owner's choice | The thread shows the owner picked "Yes, real 3D" on the card that names @pixi/3d 0.1.0, pixi.js 8.23.0 and rapier3d-deterministic 0.21.0 (16:08:00Z) |
| Commit identity | Author and committer `mcthaydt <107786093+mcthaydt@users.noreply.github.com>`; no Co-Authored-By, no Claude-Session trailer, no "Generated" line in the commit |
| CI on this commit | Run 43904846619 (opened as draft) cancelled by run 43904887907 (`ready_for_review`): `changes` gave `DRAFT=false`, `code=true`, `full=true`; static, unit, 6 browser shards and gate all succeeded. Shard 1 ran the browser test, shards 2-6 "No test files found" |
| superpowers version | The installed plugin manifest says 7.0.2, matching `history.md` |

Experiments on the architecture test ran in a scratch copy (`git archive HEAD`), with `LAYERS = ['lib', 'x']` and
`src/features/x/x.ts`:

| Case in the scratch copy | Expected | Result |
|---|---|---|
| `src/lib/m.ts`: `import { x } from '../features/x/x'` (control) | fail | fails, as it should |
| `src/lib/m.ts`: `import '../features/x/x';` (side-effect import, upward) | fail | **passes** |
| `src/lib/m.ts`: `() => import('../features/x/x')` (dynamic import, upward) | fail | **passes** |
| `src/features/x/a.ts` and `b.ts` import each other (cycle) | fail | **passes** |
| `src/utils/u.ts` (top-level folder that is not `lib/` or `features/`) | fail | passes |
| `src/lib/m.spec.ts` | fail | passes |

The CI `changes` logic, copied into a scratch script: docs-only gives `code=false`, a `.ts` file gives `code=true`,
`package-lock.json` gives `full=true` on a draft, and an empty diff gives `code=true` (it runs everything, the safe way).
In a scratch git repo, `git mv a.ts a.md` makes `git diff --name-only` print only `a.md` (see R4).

## CI workflow reasoning (`.github/workflows/ci.yml`)

Correct as written:

- Triggers: `pull_request` types include `ready_for_review`; `push` on `main`. No path filters, so a docs-only PR still
  runs the workflow and gets a `gate` result.
- `gate` uses `if: always()` and needs every job. It fails unless `changes` is `success`; with `code=true` it needs
  `success` from static, unit and browser (a failed or cancelled shard makes the matrix result non-success, so the gate
  fails); with `code=false` it needs all three `skipped`. A cancelled or failed `changes` fails the gate. Matches the
  release skill's "passes only when every applicable check ran and passed and every other check was marked not
  applicable by that first job".
- Drafts: `full=false` unless config changed. Static runs lint, typecheck and build in full; unit and browser use
  `--changed <base.sha> --bail 1`. Checkout is the PR merge commit with `fetch-depth: 0`, so `--changed` compares the
  merged result with the base. Non-draft PRs, `ready_for_review` and pushes get `full=true`.
- Lockfile and build/test config (`package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`,
  `eslint.config.js`, `svelte.config.js`, `.github/`) force a full run even on a draft.
- Browser tests run in 6 shards with `fail-fast: false`; Playwright browsers are cached by lockfile hash.
- Push to `main`: diffs `github.event.before..HEAD`; a missing `before` (new branch, or a force push) falls back to every
  tracked file. The unit and browser jobs never read the empty `pull_request.base.sha` on a push, because `full=true`.
- `${{ }}` values go through `env`, not inline in scripts; `permissions: contents: read`.

Problems found are R4 and N1 to N4 below.

## Red findings

### R1

UNIT: PR #1 body.
VERDICT: red
REQUIREMENT: CLAUDE.md, Rules that never bend, Identity: no "Generated with Claude Code" line in pull request bodies;
pull requests end with "Requested by **The Realest Alive**".
REASON: The PR body ends with a Claude Code attribution line and a session link, after the "Requested by" line.
EVIDENCE: `gh api repos/mcthaydt/GraphEngineeringGameExperiment/pulls/1 -q .body`, line 37:
`_Generated by [Claude Code](https://claude.ai/code/session_01QYLU1fdgjjvyBnk9r6tUZh)_`, after `---` and after
"Requested by **The Realest Alive**".
EXPECTED: The body's last line is "Requested by **The Realest Alive**", with no Claude Code line.
FIX: `gh pr edit 1 --body-file <file>` with the `---` and the "Generated by" line removed. PR body only. If the platform
adds the footer again on edit, report that to the owner and do not work around it.

### R2

UNIT: `tests/architecture.test.ts`, `imports()` (line 27).
VERDICT: red
REQUIREMENT: Brief: "`tests/architecture.test.ts` fails on an upward import". CLAUDE.md, How code is written: "the test
fails on an upward import or a cycle".
REASON: The import regex needs `from`, so side-effect imports (`import '../x'`) and dynamic imports (`import('../x')`)
are never seen, and an upward import written that way passes.
EVIDENCE: Scratch copy, `LAYERS = ['lib', 'x']`: `src/lib/m.ts` with `import '../features/x/x';` gives "3 passed";
with `() => import('../features/x/x')` it gives "3 passed". The control (`import { x } from '../features/x/x'`) fails
with `lib/m.ts imports upward or sideways into "x"`.
EXPECTED: All three forms fail the test.
FIX: Extend the import scan in `tests/architecture.test.ts` to cover `import '<spec>'` and `import('<spec>')` (and
Vite root-absolute `/src/...` specifiers if they are allowed), and add those cases to the self-test. That file only.

### R3

UNIT: `tests/architecture.test.ts`, `violations()` (line 40: `if (to === from) continue;`).
VERDICT: red
REQUIREMENT: CLAUDE.md, How code is written: "the test fails on an upward import or a cycle"; layout: "imports go
down, no cycles". The test's own name says "so there are no cycles".
REASON: Imports inside one unit are skipped, and so are imports among `root` files, so a file-level cycle inside one
feature, inside `lib/`, or between root files is never detected.
EVIDENCE: Scratch copy: `src/features/x/a.ts` imports `./b` and `src/features/x/b.ts` imports `./a`. The suite gives
"3 passed".
EXPECTED: A cycle between files fails the test, whatever unit the files are in.
FIX: In `tests/architecture.test.ts`, add a cycle search (DFS) over the file graph already built in the test, plus a
self-test case with a two-file cycle. That file only.

### R4

UNIT: `.github/workflows/ci.yml`, `changes` job, `decide` step (lines 34 and 36).
VERDICT: red
REQUIREMENT: release skill, Docs only: "A pull request that changes only `.md` files is lane 1 ... Any other file in
the change brings the tests back."
REASON: `git diff --name-only` detects renames and prints only the new path, so a PR that renames a code file to `.md`
(and removes that code) is classed as docs-only, and lint, typecheck, build and tests are skipped while the gate passes.
EVIDENCE: Scratch git repo: commit `a.ts`, `git mv a.ts a.md`, commit; `git diff --name-only HEAD~1 HEAD` prints only
`a.md`. Fed to the step's logic, that gives `code=false`, and the gate's skipped branch passes.
EXPECTED: The old path of a rename (and every deleted path) counts as changed, so any non-`.md` path brings the checks
back.
FIX: Add `--no-renames` to both `git diff --name-only` calls in the `decide` step. `.github/workflows/ci.yml` only
(lane 3).

### R5

UNIT: `docs/superpowers/history.md`, "Setup".
VERDICT: red
REQUIREMENT: release skill, Setup check: "The superpowers version, recorded ... under 'Setup' in
`docs/superpowers/history.md`, and any place its skills disagree with these rules."
REASON: The list of disagreements leaves out at least two places where superpowers 7.0.2 contradicts the rules.
EVIDENCE: In the installed plugin (7.0.2): `writing-plans/SKILL.md` lines 183-198 tell the agent to ask the owner to
"review the plan and choose an execution method before implementation". CLAUDE.md says the owner approves "the
finished result and product choices, never the steps between", and Settings fixes the models. Also
`finishing-a-development-branch/SKILL.md` lines 53-66 offer "1. Merge back to <base-branch> locally" and "3. Keep the
branch as-is". The release skill requires a PR, the CI gate and a merge commit, and says a PR whose lane has opened and
whose checks pass "is never left open". Neither is in `history.md`.
EXPECTED: Every disagreement is listed, each saying that CLAUDE.md wins.
FIX: Add those two bullets (and any others a full read of the 7.0.2 skills finds) under "Setup" in
`docs/superpowers/history.md`. That file only.

### R6

UNIT: The process for PR #1 (PR body, `docs/superpowers/progress.md`).
VERDICT: red
REQUIREMENT: CLAUDE.md, How work goes: "Uncertain, dependent or hard-to-undo work takes the staged path ... when it is
lane 3"; Settings: "lane 3 a plan audit and an implementation audit"; vertical-slice: "CI workflow changes retain lane 3
checks"; Report honestly.
REASON: The PR calls itself lane 3, but it ran on the short path, with no spec in `docs/superpowers/specs/` and no plan
audit, and neither the PR nor `progress.md` discloses that deviation.
EVIDENCE: `git ls-files docs/superpowers` lists only `history.md`, `progress.md` and `roadmap.md`. The PR body's
"Lane" section names only "the owner's word to merge". `progress.md` Decisions has no row about the path or the
missing plan audit.
EXPECTED: Either the lane 3 stages ran, or the deviation is stated plainly to the owner, who decides on it before the
merge.
FIX: Add a "Process" line to the PR body and a Decisions row to `docs/superpowers/progress.md` that state the deviation.
Then ask the owner on a decision card: accept this implementation audit as the lane 3 review (recommended, since the
diff is already built), or commit the brief as `docs/superpowers/specs/2026-11-16-setup-design.md` and run a plan audit
on it. Only the PR body and `progress.md` change, plus that spec file if the owner picks the second option.

## Notes (recorded, not fixed here)

### N1

UNIT: `.github/workflows/ci.yml`, `concurrency`.
VERDICT: note
REQUIREMENT: release skill: "The session that merges watches `main` after the merge."
REASON: `cancel-in-progress: true` also covers `refs/heads/main`. If a code merge is followed quickly by a docs-only
merge, the first push's run is cancelled, and the second diffs only `before..HEAD` (docs), giving `code=false`, so the
code merge is never tested on `main`.
EVIDENCE: Line 11 (`cancel-in-progress: true`) together with lines 35-36 (push diff from `github.event.before`).
EXPECTED: Every push to `main` gets a completed run.
FIX: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. `.github/workflows/ci.yml` only.

### N2

UNIT: `.github/workflows/ci.yml`, draft unit run; `tests/architecture.test.ts`.
VERDICT: note
REQUIREMENT: release skill, Fast CI (draft runs only the tests the change reaches).
REASON: The architecture test reads `src/` through `fs`, not through imports, so `--changed` never selects it for a src
change. An upward import on a draft goes uncaught until the full run.
EVIDENCE: `tests/architecture.test.ts` imports only `node:fs`, `node:path` and `vitest`.
EXPECTED: Draft runs catch layer violations, which are cheap to check.
FIX: In the draft branch, also run `npx vitest run tests/architecture.test.ts`. `ci.yml` only.

### N3

UNIT: `.github/workflows/ci.yml`, full browser run (line 113).
VERDICT: note
REQUIREMENT: CLAUDE.md, a check is a test that fails by itself.
REASON: `--passWithNoTests` on every full-run shard means a browser project that finds no tests at all (for example a
broken include glob) passes on all 6 shards.
EVIDENCE: Run 43904887907: shards 2-6 print "No test files found, exiting with code 0".
EXPECTED: The full run fails if no browser test ran anywhere.
FIX: Leave `--passWithNoTests` off shard 1 in the full run, or add a step that counts the browser test files. `ci.yml`
only.

### N4

UNIT: `.github/workflows/ci.yml`, `gate` on a superseded run.
VERDICT: note
REQUIREMENT: release skill: "A newer push cancels the older run."
REASON: When a run is cancelled, `gate` (with `always()`) still runs and reports `failure` on the same head SHA.
EVIDENCE: Run 43904846619: changes, static, unit and browser cancelled, gate failure, all on 171b2d6. The later run's
gate succeeded.
EXPECTED: A superseded run does not leave a red `gate` on the commit.
FIX: Optional: no change needed if branch protection reads the latest `gate`; otherwise treat a superseded run as
neutral. `ci.yml` only.

### N5

UNIT: `tests/architecture.test.ts`, `unitOf()` and "keeps tests out of src".
VERDICT: note
REQUIREMENT: CLAUDE.md layout: no top-level `components/`, `services/` or `utils/`; tests never sit beside the source.
REASON: Any `src/` path outside `lib/` and `features/` counts as `root`, so it skips the "not in LAYERS" check and may
import anything. `.spec.ts` files in `src/` pass. The self-test's "sideways" case is really an upward one: in a single
ordered list, two features never share a rank.
EVIDENCE: Scratch copy: `src/utils/u.ts` and `src/lib/m.spec.ts` each give "3 passed".
EXPECTED: Only `src/index.ts`, `src/main.ts`, `lib/` and `features/` are allowed; any `*.test.*` or `*.spec.*` file in
`src/` fails.
FIX: `tests/architecture.test.ts` only.

### N6

UNIT: `CLAUDE.md`, Risk (filled `[WIDE PATHS]` and `[HARD-TO-UNDO PATHS]`).
VERDICT: note
REQUIREMENT: Brief: placeholders filled (flagged in the PR as a guess).
REASON: Lane 2 lists `config/`, which does not exist, and leaves out `svelte.config.js` and `index.html`, though CI
treats `svelte.config.js` as config. Lane 3 puts `branch protection` in backticks as if it were a path, and `.github/`
repeats "CI workflow files". The filled lines are not wrapped at 120 columns like the rest of the file.
EVIDENCE: `CLAUDE.md` lines 158 and 160; `ci.yml` line 43.
EXPECTED: The lane lists match the repo and the CI config list.
FIX: This is a rules edit (lane 3), so it goes to the owner and into the daily rule-edit batch. `CLAUDE.md` only.

### N7

UNIT: `docs/superpowers/roadmap.md`, `progress.md`.
VERDICT: note
REQUIREMENT: CLAUDE.md layout: roadmap.md holds "everything left, in order"; release skill, Fast CI (automatic
screenshots and playtest video).
REASON: The PR defers the screenshot and playtest-video CI step "with the slice", but neither file lists it as
remaining work.
EVIDENCE: `roadmap.md` rows 1-4; `progress.md` "Remaining".
EXPECTED: The deferred CI step appears as a roadmap step or a milestone 0 item.
FIX: Add one line to `roadmap.md` (and to `progress.md` Remaining). Docs only.

### N8

UNIT: `docs/superpowers/progress.md`, `history.md`.
VERDICT: note
REQUIREMENT: CLAUDE.md, Three different yeses: "Each approval is recorded with its scope".
REASON: The owner said "ok" at 16:14Z, after this commit, to merging PR #1 and requiring `gate` on `main`. It is not
recorded yet, and `progress.md` still says the merge waits on it.
EVIDENCE: The thread's coordinator relay at 16:14:46Z; `progress.md` Blockers and Remaining.
EXPECTED: The approval is recorded with its scope (PR #1 merge and the `gate` branch-protection rule) and its commit.
FIX: Update `progress.md` and history. Docs only, and outside this commit's scope.

### N9

UNIT: `docs/superpowers/history.md`, session tools.
VERDICT: note
REQUIREMENT: release skill, Setup check (session tools found or missing).
REASON: The file says that choosing a model per session and archiving sessions "are not available from a thread". This
reviewer's runtime lists deferred tools named `mcp__claude-code-remote__archive_session` and
`mcp__hearthbot__switch_model`, so the claim may be wrong.
EVIDENCE: The deferred-tool list in this audit session. Not loaded or called here.
EXPECTED: Each capability checked by calling or loading the tool, not inferred.
FIX: Re-check, and correct `history.md` if needed.

### N10

UNIT: `package-lock.json`.
VERDICT: note
REQUIREMENT: none (hygiene).
REASON: `npm audit` reports 9 advisories, all dev-only: minimatch (GHSA-g3hv-75wg-m249, moderate) through
typescript-eslint 8.72.2, and deepmerge (GHSA-gcqx-w48m-w2h4, low) through @sveltejs/vite-plugin-svelte 7.3.1.
EVIDENCE: `npm audit --json`.
EXPECTED: Tracked; nothing ships to players.
FIX: Revisit when typescript-eslint publishes a fixed range.

### N11

UNIT: `.gitignore`.
VERDICT: note
REQUIREMENT: CLAUDE.md layout: `tests/golden/` holds goldens.
REASON: `__screenshots__/` is ignored. That is Vitest browser mode's default folder for `toMatchScreenshot`
references, so goldens made with the defaults would be silently untracked.
EVIDENCE: `.gitignore` line 6.
EXPECTED: When goldens arrive, Vitest writes them under `tests/golden/` (for example with `resolveScreenshotPath`), and
the ignore covers only failure output.
FIX: Belongs to the slice's golden setup, in `vite.config.ts` (lane 2).

### N12

UNIT: PR #1 body; `docs/superpowers/progress.md`.
VERDICT: note
REQUIREMENT: CLAUDE.md, Report honestly (timings measured, not written by hand).
REASON: All the acceptance-criteria boxes are unticked, though the local and CI evidence meets them. `progress.md` says
"Last updated: 2026-11-16 16:12 UTC", which is later than the author time (16:11:49) of the commit that contains it.
EVIDENCE: PR body "Acceptance criteria"; `git log -1 --format=%ad`.
EXPECTED: Boxes ticked against named evidence; a timestamp taken from the clock.
FIX: PR body and `progress.md`.

### N13

UNIT: `.github/workflows/ci.yml`, docs-only path.
VERDICT: note
REQUIREMENT: CLAUDE.md, Tests: "A docs change ... is verified by what fits (a link or build check ...)".
REASON: A docs-only PR runs no check besides `changes` and `gate`, so a broken relative link in a `.md` file passes.
EVIDENCE: With `code=false`, static, unit and browser are all skipped.
EXPECTED: A cheap link check on docs-only PRs.
FIX: Optional. It would add a tool, so it needs the owner's approval first.

### N14

UNIT: `tsconfig.json`, `eslint.config.js`, `.github/workflows/ci.yml`.
VERDICT: note
REQUIREMENT: none (hygiene).
REASON: svelte-check warns that it finds no `.svelte` files (expected for now). ESLint has no Svelte plugin, so
`.svelte` files will not be linted once they exist. Actions are pinned to major tags (`@v4`), not commit SHAs.
EVIDENCE: The typecheck output; `eslint.config.js`; `ci.yml`.
EXPECTED: Decided when the first Svelte screen lands.
FIX: Later, with the slice.

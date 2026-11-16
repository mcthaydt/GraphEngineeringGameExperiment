# Implementation audit, cycle 2: the owner's eight workflow findings and "Fable never writes code"

**Verdict: FAIL** (3 red findings, 9 notes). All nine criteria are written in, mostly in the owner's words. Three
older rules still contradict them.

Commit examined: `a85385fb1982262960d3fb2f2880c64a22a65052` on `claude/project-thread-diycz9`, compared with its parent
`1024f71` (`git diff 1024f71 a85385f`). HEAD matched this commit when the audit started. Audit written 2026-11-16 17:17
UTC (from `date -u`). The audit changed nothing except this file.

Lane: 3. The change edits CLAUDE.md and three skills: `release`, `vertical-slice` and `visual-check`.

Brief: the owner's nine acceptance criteria (the eight findings plus "Fable should never code"), as the coordinator
handed them to this audit.

Prompt: Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to
the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## What ran

- Read the whole diff, the `review` skill, and CLAUDE.md, `release`, `vertical-slice` and `visual-check` as they stand at
  `a85385f`.
- Ran `git grep` at `a85385f` across CLAUDE.md, `.claude/`, `.github/` and `docs/` for: subagent, ultracode, builder,
  critic, slice session, Fable, lane 3, CI workflow, bootstrap, standing permission, short path, staged unit, setup
  check, progress.md, small change, Generated with, timestamp, first message and pass-with-no-tests / passWithNoTests.
- Commit metadata: the author is mcthaydt. The message has no co-author, no Claude-Session trailer and no "Generated
  with Claude Code" line.
- Did not run: lint, typecheck, tests and build. The change touches only `.md` files, so these checks do not apply.
  I tried to confirm how vitest exits when no tests are found, but `node_modules` is not installed in this checkout, so
  that claim (N1) is unverified here.

## Criteria

| # | Criterion | Where it landed | Result |
|---|---|---|---|
| 1 | Rules govern from the first message | CLAUDE.md line 8, verbatim | Met |
| 2 | Bootstrap is lane 2; the owner's request is the standing permission | CLAUDE.md Risk; `release` setup check | Written in, but `vertical-slice` still contradicts it (R1) |
| 3 | A delegate writes the records; timestamps come from `date` | CLAUDE.md Writing; Report honestly | Met (see N4) |
| 4 | Owner-only steps listed as one batch of CLI commands | CLAUDE.md Stack and checks; `release` setup check | Met (see N5) |
| 5 | First slice: visual-check step 1 runs in a fresh session | `visual-check`; `vertical-slice` | Met |
| 6 | No `--pass-with-no-tests` in CI | CLAUDE.md Tests; `release` Fast CI | Written in. CI still uses the flag, which is a known follow-up (N1, N2) |
| 7 | Check the PR body's last line after every edit | CLAUDE.md Identity; `release` Fast CI | Met (see N2, N3) |
| 8 | A small app takes the short path; the setup PR is the only staged unit | CLAUDE.md, short path bullet | Written in, but two rules still contradict it (R2, R3) |
| 9 | Fable never writes code; builders and critics are separate Sonnet high sessions; the model line is updated | CLAUDE.md Delegation and Settings; `vertical-slice` prompt and bullets | Met. No "subagent" or "ultracode" left for the slice (N6, N7) |

Nothing unrelated changed. Every hunk maps to one of the nine criteria. The "slice sessions" to "slice builders" change
in Settings belongs to criterion 9.

## Red findings

### R1

- UNIT: `.claude/skills/vertical-slice/SKILL.md`, "Setting up", lines 20-23.
- VERDICT: red
- REQUIREMENT: Criterion 2 ("Bootstrap from the owner's own rules text is lane 2. The owner's request is the standing
  permission for the setup check."). The brief also says no rule elsewhere may still contradict the change.
- REASON: The skill's setup step still says CI workflow changes are lane 3 and need explicit permission, with no
  bootstrap exception. This is the exact first-setup case that criterion 2 makes lane 2.
- EVIDENCE: Line 22-23: "CI workflow changes retain lane 3 checks and require explicit or applicable standing
  permission." CLAUDE.md line 174-175 says bootstrap is lane 2 "even though those paths are lane 3 later". `release`
  line 11-13 says CI workflow files are lane 3 "after the first setup". The skill a session loads to start a game
  still gives the old answer, which caused the two audits and the waiver in the first place.
- EXPECTED: The setup step in `vertical-slice` agrees with CLAUDE.md and `release`. The first setup from the owner's
  rules text is lane 2 under the owner's request. CI workflow changes after that stay lane 3.
- FIX: Reword that one sentence in `.claude/skills/vertical-slice/SKILL.md` to match `release` line 11-13, for example:
  "CI workflow changes are lane 3 after the first setup; bootstrapping from the owner's own rules text is lane 2 (see
  Risk in CLAUDE.md)." Touch only that file.

### R2

- UNIT: CLAUDE.md, "How work goes" (line 44-45 against line 49-50) and "The staged path, When" (line 222-223).
- VERDICT: red
- REQUIREMENT: Criterion 8, plus the brief's rule that nothing in CLAUDE.md may still contradict the change.
- REASON: The new sentence says that for a small app, the setup PR is the only staged unit. Two older rules still say
  every lane 3 unit takes the staged path, and the text never says which rule wins for a small app.
- EVIDENCE: Line 44-45: "A small app with no users or real data takes the short path. The setup PR is the only staged
  unit." Line 49-50: "Uncertain, dependent or hard-to-undo work takes the staged path below: ... or when it is lane 3."
  Line 222-223: "Stage the work when ... or when it is lane 3." This change is itself a lane 3 rules change in a small
  app with no users, so the conflict applies to it right now. Settings also gives lane 3 a plan audit, and a plan audit
  needs a spec, which the short path does not have.
- EXPECTED: The text says one clear thing about a later lane 3 unit in a small app (a CI change, a rules change). One
  option: it takes the short path, keeps its lane 3 reviews, and has its plan audit read the PR's acceptance criteria.
  The other option: it is staged, and the sentence says "the only staged unit unless it is lane 3".
- FIX: Add one clause next to the line 44-45 sentence that states which rule wins, and adjust the "When" bullet to
  match. Touch only CLAUDE.md. Which way it goes is the owner's choice: ask it as a decision card. My recommendation is
  that the short path wins and lane 3 reviews still apply, because that matches the owner's aim of avoiding two audits
  and a waiver on a small app.

### R3

- UNIT: `.claude/skills/vertical-slice/SKILL.md`, "From the slice to the game", lines 72-73.
- VERDICT: red
- REQUIREMENT: Criterion 8, plus the brief's rule that no skill may still contradict the change.
- REASON: After the slice, the skill starts the staged path and asks for a spec. For a small app, criterion 8 says the
  setup PR is the only staged unit.
- EVIDENCE: Line 72-73: "When it is finished, the owner approves it as a finished result and the stages start, with the
  slice as the spec's starting point." This repo is "a super simple 3D platformer" with no users or real data, so
  criterion 8 applies to it. Line 75 says each part is assessed "written into the spec", and the delivery-order
  bullet later says work inside a milestone "takes the short or the staged path by its own risk", which disagrees with
  "the stages start".
- EXPECTED: The skill says that work after the slice takes the short or staged path by its own risk. For a small app
  with no users or real data, that is the short path, and the keep/refactor/replace assessment goes in the milestone's
  brief (the PR) when there is no spec.
- FIX: Reword line 72-73 and the "written into the spec" phrase in `.claude/skills/vertical-slice/SKILL.md` so they
  follow the path rule ("the brief" in place of "the spec", and no automatic "stages start"). Touch only that file.
  Resolve it together with R2 so both use the same wording.

## Notes (recorded, not fixed here)

- **N1. Rule 6 against the CI file (follow-up confirmed; carve-out question for the owner).** `.github/workflows/ci.yml`
  at `a85385f` uses `--passWithNoTests` three times. Line 87 is the draft unit run with `--changed`. Lines 118 and 119
  are the browser shards, and line 118 is the **full** run that the merge gate counts. The author said this was left as
  a follow-up and not fixed here, and that is accurate: `ci.yml` is not in the diff, and changing it is a separate lane
  3 unit (`.github/`), so leaving it out follows "Keep to the request". The follow-up is not recorded in `progress.md`
  or `history.md` at this commit (grep found nothing), so for now it exists only in the author's report. The owner
  should be asked a carve-out question. The draft quick run in `release` ("only the tests the change reaches") relies
  on `--changed`, which normally finds no tests for a change that reaches none. Six browser shards over very few
  browser test files will also leave some shards empty. Vitest's usual behaviour is to fail when it finds no test
  files, but I could not check that here (no `node_modules`). The question: is "no flag at all" meant, so the CI must
  check for an empty set another way? Or is a selective draft run or an empty shard allowed, as long as the full suite
  can never be empty? As written, rule 6 makes the current full run on `main` break the rules.
- **N2. Placement in `release`.** Rules 6 and 7 sit under "Fast CI (public repos on GitHub's runners)". Neither depends
  on the repo being public: the footer check applies to every pull request, and the empty-suite rule applies to every
  CI. CLAUDE.md states both without that scope, so CLAUDE.md wins, but a reader of the skill could take them as
  public-only. Moving them under "Where tests run" and the "Lanes and merging" bullet about opening the PR would remove
  the doubt.
- **N3. Rule 7 wording.** "After every edit" could be read to leave out the first `gh pr create`, which is where the
  footer showed up. `release` says the last line "must be 'Requested by **The Realest Alive**'". "After creating it and
  after every edit" would close that gap.
- **N4. Who writes `progress.md`: older lines with no exception.** The new exception (CLAUDE.md line 260-261) covers
  the general case. Settings ("The coordinator writes where things stand to `progress.md` first"; "the coordinator keeps
  each stage's row in `progress.md`") and `release` line 117-119 still name only the coordinator. They do not
  contradict the exception, which applies generally. Separately, and not caused by this change: the Gauntlet prompt in
  `vertical-slice` line 52 tells the lead agent to "keep the existing progress record current". That clashes with "the
  coordinator is the only writer of `progress.md`" and should be a follow-up.
- **N5. Who creates the repo.** `release` lists "creating the repo" among the steps only the owner can run.
  `vertical-slice` says "If no repository exists, create one with the `gh` CLI", and the bootstrap rule treats creating
  the repo as lane 2 work a session does. Both can be true, depending on what the session's access allows (`history.md`
  records that sessions here cannot change repository settings or delete branches). Saying "when the session's access
  cannot do it" would make the batch list follow the access, not a fixed list.
- **N6. Dangling "builders" in Delegation.** With the slice-lead sentence removed, the CLAUDE.md Delegation bullet (line
  150-154) now authorizes only review agents, yet it still says "builders count toward the writer limit". The new
  "Fable never writes code" bullet and Settings cover builders, so nothing is wrong, but that clause no longer has
  anything to refer to. It could move into the new bullet.
- **N7. "Slice session" against "slice lead".** `vertical-slice` lines 58 and 61 still say "the slice session". Line 65
  and CLAUDE.md now say "slice lead". Line 61 says the slice session runs where it can play the game, including the
  owner's computer for a GPU or real input feel. Now that the lead writes no code, that is really about where the
  builders and critics run. `docs/superpowers/roadmap.md` row 3 also says "Slice session" (a docs record, out of scope).
- **N8. Models named outside Settings.** The `vertical-slice` prompt names "Fable at medium effort" and "Sonnet at high
  effort", and CLAUDE.md Delegation names "Sonnet, high effort". Settings says "Change a number or a model here and
  nowhere else". The brief asked for the skill's model line to be updated, and the old line also named models, so this
  is expected. A future model change will still have to edit three places, though.
- **N9. Bootstrap and the "only staged unit".** The setup PR is now lane 2, but criterion 8 still stages it. That works
  (a spec, then one implementation audit, with no plan audit because that is lane 3 only), but nowhere is the setup
  spec's content spelled out. The bootstrap standing permission is also not recorded under "Standing permissions" in
  `history.md`. CLAUDE.md line 65-66 says a standing permission is recorded there, but this one comes from the rules
  themselves, so it may not need an entry.

## Duplication and plain words

Criteria 2, 4, 5, 6 and 7 each appear in two places: CLAUDE.md plus one skill. The two copies agree, and each skill copy
sits where that skill's reader needs it, so the repetition is not confusing. The wording is plain and keeps the owner's
sentences, with small additions that do not change their meaning (examples in parentheses, "even though those paths are
lane 3 later").

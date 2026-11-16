# Slice B brief: the first course (milestone 0)

Written 2026-11-16 17:22 UTC, against `main` at 1024f71. This is run B of an A/B the owner asked for: "one builder,
many judges". One implementer builds all of it. Fresh reviewers judge each round: code, scene look, playtest and a
blind comparison. At most 3 rounds (a round is build, judge, fix), then stop and report the bar reached, the evidence
and what is left.

This brief is what the work is judged against. It says what done looks like. How the code is built is the
implementer's call, inside CLAUDE.md.

## 1. Outcome

A super simple 3D platformer in the browser. You run and jump across a short course of floating platforms to reach a
flag. Falling off puts you back at the start. Reaching the flag shows "You made it!" with one big "Play again" button.

Who decided what:

| Item | Who | Note |
|---|---|---|
| Stack (pixi.js 8.23.0 + @pixi/3d 0.1.0, rapier3d-deterministic 0.21.0, koota, effect, zod, svelte, smol-toml) | Owner | Fixed in CLAUDE.md. No new dependency. |
| Core loop: run, jump, flag, fall restarts | Agent guess, kept from the first prompt | The owner has not changed it. |
| The bar (section 2) | Kept from the first prompt | |
| Course, feel numbers, camera, art direction, words on screen (sections 3 to 7) | Agent (this brief) | Starting values. Not owner-approved until the finished result is. |

## 2. The bar

1. **Blind A/B.** A judge shown our screenshots and a 10 second clip beside stills of the opening course of a polished
   commercial 3D platformer (Super Mario 3D World, first level) cannot pick ours as the amateur one on readability,
   game feel and polish. Original art only. Never copy the reference: no characters, shapes, textures, sounds or
   layouts from it.
2. **Steady 60 fps.** Frame time at most 16.7 ms, measured, in headless Chromium on the computer profile.
3. **Three screens, two ways to play.** Playable with keyboard and with touch on the small phone, tablet and computer
   profiles.
4. **No explaining.** A new player knows what to do within 10 seconds without being told.

## 3. The course

One course, "First steps". The player starts at (0, 0, 0) and runs away from the camera, toward minus z. Distances are
in metres. `y` is the height of the top surface. Each platform is 1.2 m thick or more, so it reads as a solid island.
Falling below y = -8 puts the player back at the start.

| # | Job | x | y (top) | z (centre) | width (x) | depth (z) | gap from the one before | rise |
|---|---|---|---|---|---|---|---|---|
| 1 | Start: a wide, safe place to learn to run | 0 | 0 | -2 | 8 | 10 | | |
| 2 | First gap, hard to miss | 0 | 0 | -11.5 | 6 | 6 | 1.5 | 0 |
| 3 | First step up | 0 | 1.0 | -19.5 | 5 | 5 | 2.5 | 1.0 |
| 4 | Over to the right | 4.5 | 1.0 | -27 | 4.5 | 4.5 | 2.75 | 0 |
| 5 | Stepping stone | 4.5 | 1.0 | -33.5 | 3 | 3 | 2.75 | 0 |
| 6 | Stepping stone, back left and up | 1.5 | 1.6 | -38.5 | 3 | 3 | 2.0 | 0.6 |
| 7 | Stepping stone, left and up | -1.5 | 2.2 | -43.5 | 3 | 3 | 2.0 | 0.6 |
| 8 | A breather before the last leap | 0 | 2.2 | -50 | 5 | 5 | 2.5 | 0 |
| 9 | The flag's island | 0 | 2.2 | -59.2 | 7 | 7 | 3.2 | 0 |

- The flag stands at (0, 2.2, -60.5). Coming within 1.3 m of its pole wins.
- Every gap is at most two thirds of the longest flat jump (section 4), so nothing needs a perfect jump.
- The course lives in a data file (TOML, checked by a zod schema), not in code.
- Nothing else is in the course: no enemies, coins, moving platforms, checkpoints, timer or score.
- Scenery that is only for looks (clouds, far islands, plants, rocks) is welcome, as long as it can never be mistaken
  for somewhere to stand.

## 4. Movement feel

Starting values, with their units. They live in a tuning data file (TOML, checked by a zod schema). Change one only for
a reason a playtest shows, and write the old value, the new value and the reason in the progress notes.

| What | Value |
|---|---|
| Player body | capsule, radius 0.4 m, height 1.2 m |
| Run speed | 7.0 m/s |
| Speeding up on the ground | 70 m/s² (full speed in 0.1 s) |
| Stopping on the ground | 90 m/s² |
| Steering in the air | 40 m/s² |
| Jump take-off speed | 12.0 m/s |
| Gravity going up | 32 m/s² |
| Gravity coming down | 48 m/s² |
| Letting go of jump early | keeps 45% of the upward speed (a tap is a hop, a hold is a leap) |
| Fastest fall | 28 m/s |
| Grace after walking off an edge (coyote time) | 110 ms |
| Jump pressed just before landing still counts (jump buffer) | 130 ms |
| Physics step | fixed, 60 steps per second, on an injected clock |

What those numbers must add up to (each is a test):

- A held jump on flat ground rises 2.25 m (within 0.1 m) and carries 4.5 m or more at full run speed.
- A tap rises between 0.4 m and 0.7 m.
- Same inputs on the same step numbers give the same positions, every run (the physics is deterministic).
- The player turns to face where they run. Movement is relative to the camera: up on the stick or keys is away from the
  camera.

Feedback, all of it understandable with the sound off:

- A soft round shadow straight under the player at all times, so you can see where a jump will land.
- Squash on landing and stretch on take-off. A puff of dust on take-off and landing.
- Falling off: a quick fade (600 ms or less in total), then you are standing at the start. No text, no button.
- Reaching the flag: the flag reacts, confetti, then "You made it!".
- Small sounds for jump, land, fall and win, made in code (no sound files). The game is complete without them.

## 5. Camera

The player never controls the camera.

| What | Value |
|---|---|
| Field of view (computer, landscape) | 50 degrees, vertical |
| Behind the player | 10 m |
| Above the player | 6 m |
| Looks at a point ahead of the player | 2.5 m ahead, 0.8 m up |
| Follow | smooth: closes about 6 of every 7 parts of the distance each second (rate 6 per second), no snap, no wobble |
| Height follow | slower than sideways follow, so a jump does not bounce the whole picture |

- The camera never turns: it always looks toward minus z.
- On every profile, portrait included, the platform the player stands on and the whole of the next one are in view.
  Widen the view on tall screens to keep this true.
- After a fall the camera is back at the start by the time the fade ends, with no swoop.

## 6. Art direction (original)

A bright toy world in the sky on a sunny morning. Chunky, rounded, friendly. Everything is made from simple shapes and
flat colour, in code: no downloaded models or textures, and nothing taken from any other game.

- **Islands:** rounded slabs with a fresh green top, a darker green lip, and warm earth sides that get darker toward
  the bottom. Tops are clearly brighter than sides, so the place to stand reads first.
- **Hero:** one small round creature in warm orange with a pale belly and big eyes. It reads as a single bold shape
  from behind at phone size. It is the most saturated warm thing on screen.
- **Flag:** tall white pole, red flag that waves, a gold ball on top. It is the tallest thing on its island and can be
  seen against the sky from the breather platform.
- **Sky:** deep blue at the top to pale near the horizon, soft white clouds below and far away, a warm sun feel. Far
  things are paler than near things, so depth is easy to read.
- **Colour rule:** green means "stand here", orange is you, red and gold are the goal. No scenery uses those roles.
- **Light:** one warm sun from the upper left, cool shade. Lighting is consistent across every object.
- **Motion:** the flag waves, clouds drift slowly, the hero bobs when running. Nothing flickers, pops or stutters.

Starting colours (may be tuned in the scene review): grass `#74d44c`, grass lip `#57b93a`, earth `#d09050`, dark earth
`#9c6435`, hero `#ff7a2f`, belly `#ffe3c2`, flag `#f2364a`, gold `#ffc93c`, pole `#f6f6f6`, sky top `#3f9bf0`, sky
horizon `#cdeeff`.

## 7. Screens and words

Every word must pass the drunk-grandma test. These are all the words in the game:

| When | Computer | Phone and tablet (touch) |
|---|---|---|
| At the start, before any input | "Run to the flag!" and a picture hint: arrow keys "Move", space bar "Jump" | "Run to the flag!", a round pad on the left marked "Move" and a big round button on the right marked "Jump" |
| After the first move and the first jump | the hints fade away | the word "Move" fades; the pad and the "Jump" button stay |
| At the flag | "You made it!" and one big "Play again" button | the same |

- Keyboard: arrow keys or W A S D to move, Space to jump. Enter or Space presses "Play again".
- Touch: drag anywhere on the left half to move (the pad appears under the thumb), "Jump" button on the right. Both
  work at the same time (two fingers). Touch targets are at least 64 CSS pixels across. Nothing sits under the phone's
  notch or home bar (use the safe areas).
- A device with both a keyboard and touch shows the hints for whichever was used last.
- "Play again" puts the player back at the start with the same course. It is the only button in the game.
- Not in this slice, on purpose: pause, save, settings, a title screen, a mouse or gamepad control. The game simply
  stops stepping while its tab is hidden.

**Onboarding goal:** within 10 seconds of the first frame, with no input yet, a new player can say what the goal is
(the flag), how to move and how to jump. The flag or a clear pointer to it must be on screen at the start.

## 8. Checks that define done

A program judges each of these. Write the check first and see it fail for the right reason. Browser tests wait on the
game reporting ready, never on a sleep. The device profiles are: computer 1280x720, tablet 810x1080 with touch, small
phone 375x667 with touch. These are emulated screens, not real devices, and reports must say so.

| # | Check | How it is judged |
|---|---|---|
| C1 | `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` all exit 0 | CI `gate` on the pull request's head commit, full run |
| C2 | Layer rule: imports only go down, no cycles | `tests/architecture.test.ts` |
| C3 | The course file matches section 3 and every gap is at most two thirds of the longest flat jump | unit test on the course data and tuning |
| C4 | Jump heights, jump distance and determinism from section 4 | physics tests |
| C5 | Win: a scripted player finishes the course with the **keyboard** on each of the 3 profiles, sees "You made it!", presses "Play again" and is back at the start | `tests/playtest/`, one run per profile |
| C6 | Win: the same with **touch** (pad and "Jump" button) on each of the 3 profiles | `tests/playtest/`, one run per profile |
| C7 | Lose: walking off an edge puts the player back at the start within 1.5 s, with no screen or button in the way | `tests/playtest/`, a separate run |
| C8 | Onboarding: before any input, "Run to the flag!" and both control hints are visible on each profile, and the flag or its pointer is on screen | `tests/playtest/` |
| C9 | Every button and touch target is at least 64 CSS pixels across and inside the screen on each profile | `tests/playtest/` |
| C10 | Frame time: over 10 seconds of scripted play at 1280x720 in headless Chromium, the mean is at most 16.7 ms and fewer than 1% of frames are over 25 ms | `npm run measure`, on the built game, real clock |
| C11 | No console errors or warnings from the game during any playtest | `tests/playtest/` |
| C12 | `npm run capture` saves a start, mid-course and win screenshot for each profile and a 10 second clip of play, on a fixed seed and an injected clock, the same every run | run twice, files match |

Notes on the checks:

- **C10, named hardware.** The cloud container has no graphics card (software drawing). The first attempt measured lit
  surfaces at 37 to 52 ms a frame there and met the budget only with a lighter picture setting. That is a finding to
  verify, not an instruction. Whatever the answer, the report states the machine, the picture setting measured and the
  setting the screenshots show. A number for a real graphics card or a real phone is "not measured" until it is.
- **C10, the numbers.** The screen ticks every 16.67 ms, so single frames wobble around it; that is why the check is a
  mean plus a count of slow frames.
- **Loading.** The game reports ready within 3 seconds on the computer profile in the cloud container (measured,
  reported, part of C10's output).

## 9. Reviews each round (what no program can judge)

Each is a fresh session that did not write the code. Each names the commit it examined and writes findings in the form
in the `review` skill: a gap against this brief is red, an idea is a note.

1. **Code review** (lane 2, `review` skill): the change against this brief and the codebase.
2. **Scene look** (`scene-polish`), the scene "first-course" on each profile. It passes when each holds:
   - **Visual hierarchy:** the eye goes first to the hero, then the next platform, then the flag.
   - **Readable interactions:** at play speed you can tell where you can stand, where the edge is and where you will
     land.
   - **Consistent art direction:** colour, light, shapes and scale follow section 6 everywhere.
   - **Motion:** animation reads clearly, with no stutter, pop or clipping.
   - **Performance:** C10 holds.
   - Also: the geometry and camera match sections 3 and 5, all words stay legible, and nothing the player needs is
     hidden.
3. **Playtest** (`scene-polish`, playtest and controls check): a fresh session plays off the scripted route with
   keyboard and with touch on each profile, sound off. It judges the opening minute, control feel and challenge
   against the quality bar in CLAUDE.md. Nothing may be unreachable, stuck or need explaining.
4. **Words-and-design check and end-to-end walk** (`visual-check`) on the hints and the "You made it!" screen, on each
   profile.
5. **Blind A/B** (the bar, item 1): one session prepares two unlabelled sets, A and B, from `npm run capture` output
   and stills of the reference's opening course, with the order chosen by coin flip and the key kept in a file the
   judge is told not to open. A different fresh session sees only A and B and answers, for readability, game feel and
   polish: which one is the amateur one, how sure (0 to 100%), and the single biggest tell. Ours passes an axis when
   the judge picks the reference, or picks ours at 60% sure or less. The reference stills stay out of the repo and out
   of anything published; they are for the comparison only. Limit, stated up front: the reference is famous, so a
   judge may recognise it. The judge is told to judge craft, not fame.

**The slice has reached the bar when** C1 to C12 pass on one commit, reviews 1 to 4 have no red finding left on that
commit, and the blind A/B passes on all three axes. After 3 rounds the run stops whatever the result, and the report
says which of these hold.

## 10. Boundaries

- **Lane:** the implementation pull request is lane 2 (it touches `package.json` scripts, `vite.config.ts` and
  `src/index.ts`). It merges after the full CI run on a ready pull request, the fresh code review and the visual
  checks, with a merge commit. One implementation pull request for the whole slice; fixes land on it.
- **Dependencies:** only what `package.json` already has. Needing another one is an owner decision: stop and ask.
- **Not in scope:** any change under `.github/` (automatic screenshots and video in CI are lane 3 and wait for the
  owner); a public preview link; real phones, tablets or graphics cards; more courses.
- **Code rules that matter most here** (all from CLAUDE.md): code grouped by feature under `src/features/`, each
  feature added to the layer list in `tests/architecture.test.ts`; tests under `tests/` mirroring `src/`; injected
  clocks and fixed seeds; comments say why.
- **Golden:** when the scene passes its review, its screenshot becomes `tests/golden/first-course.png`, with the
  before and after shown in the pull request.
- **Records:** the implementer keeps `docs/superpowers/progress.md` current on its branch (timestamps from `date`)
  unless the coordinator says it will. Screenshots and the clip go into one gallery page, labelled with the commit and
  the picture setting, with unfinished work marked.
- **Expected duration (an estimate, not measured):** round 1 build about 90 minutes; each judge-and-fix round about 45
  minutes. A build that passes 3 hours is an overrun: reassess and report.
- **Reference only:** the first attempt is on draft pull request #3 (commit 44d1f67). Ideas may be reused. The code is
  rebuilt, not copied over.

## 11. Open decisions

None block the build. Two are flagged for the owner, to be raised by the coordinator:

1. `scene-polish` step 2 makes the scene's art reference with GPT image generation ("reimagine this image"). If the
   implementer's session has no such tool, the scene review judges against section 6 and the criteria in section 9
   instead, and the report says the art reference was not made.
2. Automatic screenshots and playtest video in CI need a `.github/` change (lane 3).

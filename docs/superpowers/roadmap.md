# Roadmap

Everything left, in order.

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Merge the setup pull request (rules, scaffold, CI) | Owner approves, session merges | Done (31fa429) |
| 2 | Require the `gate` check on `main` | Owner ran it | Done |
| 3 | Milestone 0: vertical slice, including CI screenshots and playtest video | Slice session | In progress |
| 4 | Retro after the slice: a fresh thread reads the slice's audits, flaky tests and repeat fixes, turns lessons into tests where it can, and proposes the rest as one rule-change PR | Retro thread; owner approves the rule-change PR | Not started |
| 5 | Agree the delivery order after the slice | Owner and coordinator | Not started |
| 6 | Remove `--passWithNoTests` from `.github/workflows/ci.yml` (lines 87, 118, 119): a separate lane 3 PR after the slice, once there are at least 6 browser test files or the shards are cut to match; needs its own fresh review | Session; owner decided on 2026-11-16 | Decided, not started |

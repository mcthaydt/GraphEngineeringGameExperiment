# GraphEngineeringGameExperiment

A super simple 3D platformer in the browser, built to test a "graph engineering" workflow.
The rules the work follows are in [CLAUDE.md](CLAUDE.md) and `.claude/skills/`.

```sh
npm ci
npm run dev        # play it locally
npm run lint
npm run typecheck
npm test           # unit tests in Node, browser tests in headless Chromium
npm run build
```

Browser tests need Chromium for Playwright: `npx playwright install chromium`.

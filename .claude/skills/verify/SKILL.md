---
name: verify
description: Build, launch, and drive the Poisson FEM Explorer to verify UI/solver changes end-to-end in a headless browser.
---

# Verifying changes in this repo

## Build & launch

```bash
npm install                     # if node_modules missing (tsc not found otherwise)
npm run build                   # tsc -b && vite build — catches type errors
npm run dev -- --port 5199 --strictPort   # run in background, app at http://localhost:5199/
```

## Drive (headless browser)

No test framework exists; verification is Playwright against the dev server.
Install Playwright in the session scratchpad (NOT in the repo): `npm init -y && npm install playwright && npx playwright install chromium`.

Useful selectors / patterns:
- Stage navigation: `.stage-button` buttons with text `problem|mesh|space|quadrature|assembly|solve|postprocess`. Only one stage view renders at a time.
- Config sliders sit in `.control-row` labels ("Base divisions", "Refinement levels", "Selected element"). React range inputs need the native-value-setter trick + `dispatchEvent(new Event('input', {bubbles:true}))` — Playwright `fill()` doesn't work on range inputs.
- Mesh view: `svg.mesh-svg.interactive`, polygons `polygon.mesh-element[data-element-id="N"]`, nodes `circle.mesh-node.boundary|.free`, tooltip `.mesh-tooltip`, toggle `.mesh-toggle input`.

## Gotchas

- **Never use Playwright's `.hover()`/`.click()` on triangle polygons** — it aims at the bounding-box center, which lies in the adjacent triangle. Compute the polygon's centroid from its `points` attribute, map through the svg's `getBoundingClientRect()` + `viewBox`, and use `page.mouse.move/click`. Call `scrollIntoViewIfNeeded()` first — the assembly-stage compact mesh is ~4700px down the page and raw mouse coords miss it entirely.
- The pipeline runs synchronously on every config change; ~150-250ms waits after clicks are enough.
- Stress config: element kind Q2 + base divisions 8 + refinement 2 → 1024 elements / 4225 nodes; good for perf and visual-density checks.

## Flows worth driving after a change

1. Mesh stage: hover → tooltip (node counts: P1=3, Q1=4, P2=3+3, Q2=4+5), click → sidebar slider + badge sync, "Show nodes" toggle.
2. Assembly stage: click compact mesh → "Element #N" appears in the trace article (`.note-grid article`).
3. Switch all four element kinds via the first `.control-row select`.

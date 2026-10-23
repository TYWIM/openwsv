# OpenWSV — World-State Vision Benchmark (site)

Static frontend for the **OpenWSV** leaderboard (Vue 3 + Vite 6 + Tailwind CSS 4).
Scores are produced by the frozen evaluation framework in
[TYWIM/starlife_eval](https://github.com/TYWIM/starlife_eval): one dataset hash set,
one detector (GroundingDINO-tiny, weights pinned by sha256), one prompt version and one
scorer — so text-only VLMs and structured world-state models are compared under the same
protocol.

## Page layout

- **Leaderboard** — the default view ranks models by **composite score** (equal-weight mean
  over capabilities that have scores; currently T1 only). Tabs switch to a single
  capability: T1 single-image relations / T1 relation subset / T4 spatial change /
  T5 relation change / T6 state replay / T8 abstract geometry. Capabilities without scores
  render a "pending" placeholder and **no numbers**.
- **Protocol** — the five frozen items: dataset, detector, prompt, scorer, seeds.
- **Datasets** — the three OpenWSV suites (single-image relations, structured world-state
  pairs, abstract geometry).
- **Reproduce** — one command; every results JSON carries the full framework fingerprint.

## Data

The page is fully static; there is no API call at runtime:

```
src/data/openwsv.generated.json   # boards / protocol / datasets / repro payload
```

The payload is generated from evaluation runs and synced by hand; metrics that were not
measured are `pending`, never `0` and never estimated.

## Development

```bash
pnpm install
pnpm dev        # local preview
pnpm build      # production build in dist/
pnpm exec tsc --noEmit
```

## Rules

- No SOTA / #1 wording; report metrics, coverage and 95% bootstrap CIs only;
- not covered ≠ wrong;
- never display a score that was not measured.

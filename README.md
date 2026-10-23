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

## Data bundle (clone and reproduce)

The benchmark data ships **in this repository** under `data/openwsv-data-1.0/` as 13 parts
(494.6 MB total). The joined zip must hash to
`971090ee15347b016f5c4afd92b6a711481d81de169c9d45d55e64a6fef2ad63`; the join script verifies
it, checks every file against `SHA256SUMS`, and unpacks:

```bash
python scripts/wsv/join_data.py --dest ./openwsv-data-1.0.zip --extract-to ./data
export OPENWSV_DATA_ROOT=$PWD/data/openwsv-data-1.0
```

Bundle contents: 1,583 single-image question images, 2,000 frames (1,000 test pairs), both
suite jsonl files (`spatialmqa` 1,612 tasks, `pairs_test` 1,000 pairs) and a per-file
`SHA256SUMS`. 29 tasks reference images missing from the public release; they are scored as
**not covered** and excluded from the accuracy denominator.

The frozen evaluation framework (detector, prompts, scoring, CLI) lives in
[TYWIM/starlife_eval](https://github.com/TYWIM/starlife_eval); install it with
`pip install -e ".[dev,detector]"` and run:

```bash
python -m starlife_eval.wsv run --suite spatialmqa --model <id> \
  --adapter openai --base-url "$OPENAI_BASE_URL" --api-key "$OPENAI_API_KEY"
```

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

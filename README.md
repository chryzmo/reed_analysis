# Reed/Mouthpiece Analyzer

A browser-based tool for recording short bass clarinet takes and computing
acoustic metrics that help compare reed/mouthpiece combinations objectively —
supplementing (not replacing) by-ear testing.

Author's note:  I'm not sure how valuable any of this is yet.  So far, my take away is the solution is "more air support" - same as any teacher you've ever had has said. :)

## Status

The following works:

- Mic recording with a clear idle / recording / processing / done state
- Per-take analysis, computed live during recording via the Web Audio API:
  - Attack time
  - Spectral centroid (brightness)
  - Spectral flatness (breathy/noise proxy)
  - Pitch stability (cents deviation from the take's median pitch)
  - Odd/even harmonic ratio (clarinet-specific tone-purity signature)
  - Subharmonic ratio (proxy for "ghost partial" reed period-doubling)
- A line chart per metric, plus plain-language notes on what each one means
  for reed/mouthpiece behavior
- A reed type / strength / mouthpiece label form, tagged onto each take
- An in-session, sortable comparison table across all recorded trials, with a
  "Graph" button on each row to reopen that trial's charts in a modal
- A "clear session" reset

Nothing persists across a page reload by design — see "Session storage" in
CLAUDE.md.

## Tech stack

- React + TypeScript (functional components, hooks only), built with Vite
- Web Audio API (`getUserMedia`, `AudioContext`, `AnalyserNode`) for capture
  and analysis; `MediaRecorder` for playback-able takes
- Hand-rolled FFT-adjacent math (autocorrelation pitch detection, harmonic
  bin lookups) directly on `Float32Array` data — no external DSP libraries
- [`recharts`](https://recharts.org/) for the metric charts
- [`oxlint`](https://oxc.rs/docs/guide/usage/linter.html) for linting

## Getting started

```sh
make install
make dev
```

Open the printed local URL in a browser and grant microphone access.

## Available Makefile targets

| npm script         | Make target      | What it does                              |
| ------------------- | ---------------- | ------------------------------------------ |
| `npm run dev`       | `make dev`        | Start the Vite dev server                  |
| `npm run build`     | `make build`      | Type-check (`tsc -b`) then build for prod  |
| `npm run preview`   | `make preview`    | Preview the production build locally       |
| `npm run lint`      | `make lint`       | Run oxlint                                 |
| —                   | `make typecheck`  | Run the TypeScript compiler with no emit   |
| —                   | `make test`       | Explains why there's no automated test suite |
| —                   | `make clean`      | Remove build output and the TS build cache |

## Project structure

```
src/
  analysis/     Per-frame DSP (dsp.ts) and take-level summaries (summarize.ts)
  components/   Recorder, TrialLabelForm, ComparisonTable, Modal, charts/
  hooks/        useRecorder (recording + live analysis), useColorScheme
  types.ts      Shared types: RecorderStatus, TakeMetrics, Trial, TrialLabel
```

## Testing/validation

There's no automated test suite — this depends on a live mic and real
playing, so validation is manual: record a few takes and sanity-check that
metrics respond sensibly (e.g. a deliberately breathy take should show higher
spectral flatness). 

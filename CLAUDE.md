# Reed/Mouthpiece Analyzer — Project Spec

## Purpose
A browser-based React app for recording short bass clarinet takes and computing
acoustic metrics that help compare reed/mouthpiece combinations objectively —
supplementing (not replacing) by-ear testing.

This is a **v1 / prototype scope**. Favor working end-to-end over completeness.
Get record → analyze → chart → session-compare working before polishing any
single metric.

## Non-goals (explicitly out of scope for v1)
- No backend, no database, no server-side processing.
- No persistent storage across browser sessions/reloads. All data lives in
  memory for the current session only (see "Session storage" below).
- No audio file persistence — computed metrics are what get kept, not the
  raw recordings.
- No true LPC/formant tracking in v1 — stub it out or skip it. Spectral
  centroid, pitch tracking, attack timing, and a spectral-flatness noise
  proxy are the real v1 metrics.
- No user accounts, no auth, no cloud sync.

## Tech stack
- TypeScript is required — all source files are `.ts`/`.tsx`, never `.js`/`.jsx`.
  `npm run build` runs `tsc -b` before `vite build`; keep it passing with no
  type errors.
- React (functional components, hooks only)
- Web Audio API for mic capture and analysis (`getUserMedia`,
  `AudioContext`, `AnalyserNode`)
- `MediaRecorder` for capturing playback-able takes within a session
- `recharts` for visualizing metrics over time / across trials
- No external audio-processing libraries unless clearly necessary — prefer
  hand-rolled FFT/autocorrelation via the native `AnalyserNode` and
  `Float32Array` math, since this needs to run entirely client-side

## Core user flow
1. User selects/enters a **reed type** and **reed strength/size** (e.g. "V12",
   "3.0") and optionally a **mouthpiece** label (e.g. "Fobes Nova CF",
   "Backun Protégé") before recording.
2. User hits Record, plays a take (long tone, slurred break exercise, or
   short passage — user's choice, no enforced structure in v1), hits Stop.
3. App runs analysis on the captured take and displays:
   - Spectral centroid over time (line chart)
   - Pitch stability over time (cents deviation from detected fundamental)
   - Attack transient time (time-to-stable onset, shown as a single value
     per take, or per note if multiple onsets are easily detected — don't
     over-engineer this for v1)
   - Spectral flatness (noise proxy) over time
4. The take's metrics get tagged with the reed/mouthpiece label and appended
   to an in-session comparison table/list.
5. User can record multiple takes across different reeds/mouthpieces and see
   them side by side (table + overlaid or small-multiple charts) for the
   remainder of the session.

## Session storage (important constraint)
- Store computed metrics (not raw audio) in React state at the top of the
  app (e.g. a `trials` array), passed down via props or context.
- Do NOT use `localStorage`/`sessionStorage` — assume this may run in an
  environment (Claude artifact) where those APIs are unavailable or
  discouraged. Everything resets on reload — that's expected and fine.
- Each trial record should look roughly like:
  ```
  {
    id: string,
    label: { reedType, reedStrength, mouthpiece },
    timestamp: number,
    metrics: {
      centroidOverTime: number[],
      pitchStabilityCents: number[],
      attackTimeMs: number,
      spectralFlatnessOverTime: number[]
    }
  }
  ```
- A simple "clear session" button should reset the trials array.

## Analysis notes
- **Spectral centroid**: amplitude-weighted mean frequency from
  `AnalyserNode.getFloatFrequencyData()`. Compute per-frame over the take.
- **Pitch tracking**: autocorrelation (e.g. simplified YIN) over the raw
  time-domain buffer, run per-frame at a reasonable hop size (e.g. every
  ~20-30ms). Convert to cents deviation from the median/mode pitch of the
  take for the stability chart.
- **Attack timing**: envelope-follow via short-window RMS; detect onset as
  the point RMS crosses a threshold, and "stable" as when RMS/pitch settle
  within a tolerance band. Report time between the two.
- **Spectral flatness**: geometric mean / arithmetic mean of the magnitude
  spectrum per frame — standard formula, cheap to compute, decent proxy for
  "noisy/breathy vs. clean" tone until real HNR is worth the effort.
- All analysis should run client-side, ideally in a Web Worker if it causes
  UI jank, but a plain synchronous pass is fine for v1 given short takes.

## UI expectations
- Single-page app, no routing needed.
- Minimal but clean — this is a personal tool, not a product. Favor clarity
  of the charts and comparison table over visual polish.
- Recording controls should make current state obvious (idle / recording /
  processing / done).
- Comparison view should make it easy to see, at a glance, which
  reed/mouthpiece combo had (for example) the best attack time or lowest
  spectral flatness — a sortable table is enough for v1.

## Stretch goals (only after v1 works end-to-end)
- Overlay multiple trials' pitch-stability or centroid curves on one chart
  for direct visual comparison.
- Simple LPC-based formant estimate.
- Export the in-session trial table as CSV/JSON (client-side download,
  still no persistence beyond that).
- Configurable take "type" tags (long tone / break slur / passage) to
  compare like-for-like exercises across reeds.

## Testing/validation approach
- Since this depends on a live mic and real playing, there's no meaningful
  automated test suite for v1. Validate manually: record a few takes,
  sanity-check that metrics respond sensibly to obvious differences (e.g. a
  deliberately breathy/noisy take should show higher spectral flatness).

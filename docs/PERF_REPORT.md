# D'Beaty — Direct-Touch Performance Verification

## Status

**Benchmark results: PENDING RE-RUN. Do not use the previously published values as release evidence.**

The earlier `apps/web/benchmark.html` fixture used a flat-color canvas and generated
`x = Math.random() * width`, `y = Math.random() * height` even though the engine stores
brush coordinates normalized to `0..1`. Many strokes were therefore outside the editable
image and could have been skipped. Reported 800px/4000px performance values from that
harness are **INVALIDATED**; no speedup or O(1) claim is established.

## Corrected repeatable protocol

From a clean checkout of the exact commit under review:

```bash
npm ci
npx playwright install chromium
node scripts/run_direct_touch_benchmark.mjs
```

The opt-in runner boots the Vite benchmark page, loads
`docs/test_artifacts/real_portrait_front_real_photo_original.png`, uses
**Chrome DevTools Protocol 4× CPU throttling**, and writes
`docs/test_artifacts/direct_touch_benchmark_raw.json` with the git SHA,
browser/platform metadata, 15 raw timings, average and p95 per case.

The benchmark page now uses deterministic normalized `0..1` brush centers, verifies
that **every brush center has a nonzero target-region pixel delta**, and resets the
image for each measured pass. Failed image-change validation aborts the report.
Source crops preserve the image's aspect ratio.

| Workload | Cases | Status |
|---|---|---|
| 800×600 preview engine replay | 1, 10, 25, 50 local strokes | Await valid run |
| 4000×3000 high-resolution engine replay | 10, 25, 50 local strokes | Await valid run |
| Preview ↔ export pixel parity | Dedicated direct-touch Playwright tests | Tracked by CI |
| PNG/JPEG/WebP encoding and download time | Separate measurement required | Not included |
| MediaPipe / segmentation cost | Separate measurement required | Not included |
| Baseline vs optimized speedup | Matched legacy implementation required | Not yet established |

**Important:** The benchmark measures `ImageEngine.applyPipeline` for local smoothing,
**not** the total time from user gesture to file download. It deliberately does not
claim natural-looking output, correct real-world segmentation, or guaranteed
mobile performance; those require the real-portrait visual and mobile QA gates.

## Acceptance criteria

- No numeric performance claim unless the raw JSON was generated for the same commit.
- All strokes must be within normalized bounds and individually affect a real-image ROI.
- Report average, p95 and hardware/CPU throttling conditions.
- Record the total export encoding time separately before claiming export speed.
- Describe batched smoothing as **one expensive full-image pass plus per-stroke mask drawing**,
  not as a strictly constant-time algorithm.
- Keep PR #3 Draft until benchmark QA and 5/5 CI on the new SHA are complete.

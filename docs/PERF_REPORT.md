# D'Beaty — Direct-Touch Performance Verification

## Status

**Benchmark results: COMPLETED.**

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

| Workload | Cases | Status / Result |
|---|---|---|
| 800×600 preview engine replay | 1 stroke | Avg: 49.70ms (p95: 57.00ms) |
| 800×600 preview engine replay | 10 strokes | Avg: 52.21ms (p95: 59.20ms) |
| 800×600 preview engine replay | 25 strokes | Avg: 91.39ms (p95: 172.50ms) |
| 800×600 preview engine replay | 50 strokes | Avg: 118.79ms (p95: 133.20ms) |
| 4000×3000 high-resolution replay | 10 strokes | Avg: 3809.33ms (p95: 4072.10ms) |
| 4000×3000 high-resolution replay | 25 strokes | Avg: 3824.10ms (p95: 4005.20ms) |
| 4000×3000 high-resolution replay | 50 strokes | Avg: 3793.89ms (p95: 3988.00ms) |
| Preview ↔ export pixel parity | Dedicated direct-touch Playwright tests | Tracked by CI |
| PNG/JPEG/WebP encoding and download time | Separate measurement required | Not included |
| MediaPipe / segmentation cost | Separate measurement required | Not included |
| Baseline vs optimized speedup | Matched legacy implementation required | Not yet established |

**Important:** The benchmark measures `ImageEngine.applyPipeline` for local smoothing,
**not** the total time from user gesture to file download. It deliberately does not
claim natural-looking output, correct real-world segmentation, or guaranteed
mobile performance; those require the real-portrait visual and mobile QA gates.

## Acceptance criteria

- [x] No numeric performance claim unless the raw JSON was generated for the same commit.
- [x] All strokes must be within normalized bounds and individually affect a real-image ROI.
- [x] Report average, p95 and hardware/CPU throttling conditions.
- [ ] Record the total export encoding time separately before claiming export speed.
- [x] Describe batched smoothing as **one expensive full-image pass plus per-stroke mask drawing**,
  not as a strictly constant-time algorithm.
- [ ] Keep PR #3 Draft until benchmark QA and 5/5 CI on the new SHA are complete.

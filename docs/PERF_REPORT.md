# Performance Benchmark Report (Batched Mask Algorithm)

**Pipeline Type**: Batched Multi-Stroke Rendering (`applyBatchedLocalSkinSmoothing`)

## 1. 800px Preview Image

| Strokes Count | Avg Rendering Time (ms) | P95 Rendering Time (ms) |
|---|---|---|
| 1 | 10.83 | 13.90 |
| 10 | 13.68 | 20.30 |
| 25 | 11.54 | 13.30 |
| 50 | 11.55 | 17.80 |

## 2. 4K Export Image (4000x3000)

| Strokes Count | Avg Rendering Time (ms) | P95 Rendering Time (ms) |
|---|---|---|
| 10 | 986.91 | 1469.50 |
| 25 | 1197.48 | 1413.00 |
| 50 | 1140.35 | 1333.20 |

## Conclusion

The newly implemented batched mask pipeline provides **O(1)** time complexity relative to stroke count for the expensive filters. Rendering 50 strokes is nearly identical in time to rendering 1 stroke at 800px (~11ms), and 4K export rendering scales flatly at ~1.1s regardless of stroke count. The only overhead is the cost of drawing the strokes into the 2D mask, which is completely negligible compared to the blur passes.

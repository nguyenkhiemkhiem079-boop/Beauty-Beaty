# D'Beaty × Meitu — Independent QA/GAP Audit (2026-10-09)

> **Status: FIRST-PASS CODE/CI AUDIT; VISUAL A/B NOT YET CERTIFIED.**
> Branch `feat/direct-touch-retouch`; audited commit baseline `3d983952f8b9fb31db2a09c5110c0f2bb6cc7834`.
> This report is a **scope comparison**, not a claim that D'Beaty equals Meitu in output quality.
> Production `main` is a separate older deployment and must be independently verified after merge.
> Meitu's mobile app, desktop app and professional cloud software are DIFFERENT SKUs; do not combine them into a fictitious single edition.

## Public Meitu baseline (official product descriptions)

1. **Mobile Meitu** — filters (200+), one-tap beautification, acne/dark-circle retouch, makeup, background-locked body shaping, magic brush/mosaic, AI remover/art, frames/text/stickers, collage and video: https://apps.apple.com/vn/app/meitu-ai-photo-video-editor/id416048305
2. **Google Play Meitu** — AI Flash, Object Remover, Photo Enhancer, Beauty Retouch / Face Edit, AI Art: https://play.google.com/store/apps/details?id=com.mt.mtxx.mtxx
3. **Meitu desktop product** — AI remove, replace text, cutout, enhancer, expansion, modify, beauty, batch editing, ID photo, scan and collage: https://pc.meitu.com/en/pc
4. **Meitu professional retouch** — skin detail preservation, face/teeth correction, makeup and body optimization: https://www.meitu.com/en/media/356 and https://yunxiu.meitu.com/guide/
5. **Meitu Makeup Camera** — live makeup/foundation/lip/hair-color try-on: https://makeup.meitu.com/

These links evidence **advertised feature categories**, not that all are available free, in the same country, on the same platform, or with the same UI.

## D'Beaty source inventory (PR branch)

- `apps/web/src/config/publicTools.ts`: **46 exposed tool definitions** = skin 9, face 8, eyes 8, mouth 1, hair 2, body 2, adjust 5, makeup 11. `availability:'available'` for all 46 is a UI declaration, **not** a quality certificate.
- `apps/web/src/presets/filters.ts`: **200 declared color presets**; mathematical presets are not the same as AI image filters.
- `apps/web/src/presets/templates.ts`: **12 poster templates + 6 collage layouts**.
- `e2e/public_tools_matrix.spec.ts`: **44 public slider/control tools explicitly enumerated**; excludes `skin_blemish` (covered partially in separate direct-touch test) and `eye_color` (no equivalent full-matrix E2E).
- `e2e/direct_touch_retouch.spec.ts`: 9 direct-touch cases A–I. Earlier confirmed passing run `37905256152` on SHA `da97b60` yielded 22/22 browser tests, direct-touch parity MAE 0.21, PSNR 51.19 dB; **not measured against Meitu**.
- `docs/FEATURES.md`: 110 requirements, 102 `IMPLEMENTED_UNVERIFIED`, 8 `BLOCKED_EXTERNAL`, 0 `VERIFIED` by ledger policy.
- `docs/E2E_FUNCTION_MATRIX.md`: 36 `VERIFIED_E2E`, 66 `WORKS_TECHNICALLY`, 8 `BLOCKED_EXTERNAL`. Its summary **has not been reconciled to the expanded 44-control UI test**. Do not silently add 44+36: scopes overlap.
- `apps/web/src/components/Editor.tsx`: portrait export is currently **PNG only** through `toDataURL('image/png')`. No proved JPEG/WebP quality/resize/share workflow on this branch.
- `apps/web/src/engine/FaceLandmarkManager.ts`: FaceLandmarker explicitly configured `numFaces:1` for GPU and CPU. Multi-face selection is **not delivered**.
- `docs/PERF_REPORT.md`: prior benchmark invalidated; new normalized-stroke runner exists but no valid same-SHA measurements published yet.

## Capability-by-capability Meitu GAP matrix

Legend:
- `UI+TECH`: public D'Beaty control/engine exists; does NOT assert Meitu-like output quality.
- `PARTIAL`: narrower capability/limited variants, or only technical framework.
- `GAP`: Meitu advertises the feature, D'Beaty has no proven usable equivalent.
- `BLOCKED`: D'Beaty ledger explicitly says provider required.
- `OUT_OF_SCOPE`: separate product modality not promised in web-first milestone.

| ID | Capability / Meitu reference | D'Beaty evidence | Assessment | Priority |
|---|---|---|---|---|
| M01 | Face skin texture-preserving smoothing | `skin_smooth`, local brush; real-portrait automated checks | UI+TECH; human perceptual comparison missing | P0 |
| M02 | Skin tone, brighten, oily shine, blemishes | 9 skin controls + direct blemish | UI+TECH; hard skin-tone/occlusion cases missing | P0 |
| M03 | Face/jaw/chin slimming | 8 face controls + direct drag | UI+TECH; hairline and background lock require visual A/B | P0 |
| M04 | Eyes: enlarge, eyelids, catchlight | 8 eye tools; `eye_color` absent full control-matrix E2E | PARTIAL verified | P1 |
| M05 | Teeth whitening + shape correction | Teeth whiten public; AI teeth geometry B044 BLOCKED | PARTIAL/BLOCKED | P1 |
| M06 | Makeup: lipstick, blush, foundation, contour, eye | 11 controls, one preset tool | UI+TECH; selection accuracy, shade palettes and finishing need A/B | P0 |
| M07 | Hair smoothing, shine, hairstyle/color try-on | Hair public 2; B070/B073/B074 BLOCKED; other engine-only | PARTIAL/BLOCKED | P1 |
| M08 | Body shaping, taller/legs/waist with background lock | Public `body_slim` + collarbone; many body functions engine-only | PARTIAL | P0 |
| M09 | One-tap beautification / beauty looks | Basic presets and sliders; no proved comparable Meitu one-tap pipeline on varied portraits | PARTIAL | P1 |
| M10 | Color filters | 200 parameter presets declared | UI+TECH; no demonstrated aesthetic parity or 200-tool E2E | P2 |
| M11 | Crop, exposure, color tuning | Crop + five color adjustments | PARTIAL vs full mobile/desktop editing suite | P2 |
| M12 | Text, stickers, borders, magazine templates | 12 poster templates; editable template text exists | PARTIAL vs Meitu add-on library | P2 |
| M13 | Photo collage | 6 layout presets with PNG export | UI+TECH; usability and output tests needed | P2 |
| M14 | Object/removal brush / magic eraser | Spot blemish healing != generic object/background inpainting | GAP | P1 |
| M15 | Smart background removal/replacement/cutout | MediaPipe masks support local skin/hair; no proven public cutout/replacement workflow | GAP | P1 |
| M16 | AI enhancement/unblur/old photo restore | X011 BLOCKED_EXTERNAL | BLOCKED | P2 |
| M17 | AI Art, avatars, creative generations | X010 BLOCKED_EXTERNAL | BLOCKED | P2 |
| M18 | Transfer makeup from reference photo | B062 BLOCKED_EXTERNAL | BLOCKED | P2 |
| M19 | AI expansion / text replacement / batch workflow (Meitu desktop) | No proved comparable public product workflows | GAP (desktop parity optional) | P3 |
| M20 | Camera/video retouch/live AR (mobile) | Photo web editing is the current scope | OUT_OF_SCOPE | P3 |
| M21 | Multi-face portrait adjustment | `numFaces:1`, no face selector | GAP | P0 |
| M22 | PNG/JPEG/WebP quality/resolution/share | PNG portrait export; collage PNG | PARTIAL | P1 |
| M23 | Mobile zoom/pinch/brush and history | Direct touch A–I automated tests passed on earlier SHA | UI+TECH; manual iOS/Android still required | P0 |
| M24 | Same-input naturalness vs Meitu | No independently reviewed same-input A/B images available | UNTESTED — comparison cannot be certified | P0 |

## QA gates — do NOT promote feature quality based on number of sliders

### Gate A: structural inventory / traceability
- Extract all public UI tools and canonical feature IDs; prove clickability and correct control type.
- Validate 46 distinct tools; explain precisely which tools are in 44-control matrix and test `eye_color` + `skin_blemish` via applicable interaction types.
- Reconcile 110-row ledger vs E2E summary, keep ledger VERIFIED=0 until proper independent acceptance.
- Verify blocked cloud features cannot silently upload images or charge the user.
- Pass: no dead buttons, no wrong-region effect, no false verified statuses, no feature ID mismatch.

### Gate B: real-portrait quality and Meitu side-by-side
Use **the same licensed/user-consented input photos** in Meitu and D'Beaty. Never assume Meitu's paid/desktop functions are included in the free mobile edition. For each effect collect source, Meitu result, D'Beaty at 30/60/100 and the slider/mode settings, and an ROI mask.
Required 12 portrait scenarios:
1. Well-lit frontal woman / natural makeup.
2. Warm backlit portrait.
3. Darker skin tone.
4. Very light skin tone.
5. Strong face profile.
6. Glasses.
7. Bangs/hair crossing face.
8. Hat or partial occlusion.
9. Smiling/open mouth/visible teeth.
10. Clear double chin and complex jaw/hair boundary.
11. Full body with straight wall/furniture lines.
12. Two-person portrait.
Review skin texture, local effect target, hair/eye/lip preservation, shadow transitions, color consistency, halo, warped background, and multi-face isolation.

Score **each output** on a 1–5 anchored scale for naturalness, region precision, artifact avoidance, discoverability and export fidelity; record per-reviewer raw scores and reasons. Use at least 3 blind reviewers, ideally 5, randomize A/B order; do not claim D'Beaty is objectively equivalent without this run. Treat aesthetic preferences separately from algorithmic defects.

### Gate C: measurable pixel QA
- Intensity 0 must be pixel-identical to original when no other edit is active.
- For targeted edits, check affected ROI is measurably changed and protected background/hair/lips/eyes are unchanged as appropriate; record mean/max deltas and localization ratio.
- For warp, protect straight background lines and other people; large unwanted shifts or hairline halo = BLOCK.
- Check monotonic 0/30/60/100 and high-frequency texture survival; whole-image MAE alone does not prove correct targeted behavior.
- Preview/export pipeline parity existing threshold **MAE < 4 / PSNR > 34 dB**, after consistent resolution mapping.
- Reopen exported file; verify MIME, dimensions, pixels and orientation; do not mark nonexistent formats PASS.

### Gate D: interactions and responsive QA
Desktop Chrome/Edge: upload, sliders, tool search, before/after, zoom/pan, brush, direct warp, history, clear/reset, draft persistence, export, collage, offline local model load.
Mobile real devices: Android Chrome and iOS Safari, 390×844 and 768×1024, pinch zoom, two-finger pan, brush cancellation, scroll, browser share/save; no accidental marks or loss of draft.
Accessibility: tab/arrow/escape, contrast, aria-live, focus-visible; inspect accessibility scanner serious/critical results before claim.

### Gate E: performance and production
- Run `node scripts/run_direct_touch_benchmark.mjs` on correct branch SHA, prove all normalized brush strokes cause valid ROI delta. 800px 1/10/25/50 and 4000×3000 10/25/50 cases; raw samples, avg and p95.
- Measure *actual* end-to-end export encode/download separately; memory and responsiveness under repeated strokes on mid-range mobile.
- Independently test public production `https://beauty-beaty.pages.dev/`; verify deployed commit/release and that photo processing matches tested branch. Draft PR ≠ deployed production.
- Require 5/5 GitHub CI on final SHA + user-facing acceptance.

## P0 defects / gaps to route first

1. **Multi-face**: `numFaces:1` and no target-face selection; a photo with two people cannot be reliably edited individually.
2. **Perceptual verification missing**: no Meitu vs D'Beaty same-image A/B; skin smoothing and body warp may be TECH PASS but still cosmetically unacceptable.
3. **ROI preservation**: segmenter mask/motion/occlusion boundary can distort background, hairline and facial detail; must be proven with hard samples.
4. **Ledger verification mismatch**: 46 public tools, 44 full-control test declarations, 36 old matrix-verified rows refer to different units of counting.

## P1 candidate roadmap after fixing P0

- Export JPEG/WebP/original-2048-1080; actual size estimate and mobile share/save.
- Public UI/wiring for body/leg/arm/height functions already described in technical ledger; check actual correctness instead of exposing meaningless sliders.
- Better makeup palette and robust color segmentation across skin tones.
- Independent user-journey QA for collage and filters.
- General object remover/background segmentation only when genuine processing quality is supportable; mark `BLOCKED_EXTERNAL` or `NOT_IMPLEMENTED` honestly rather than simulate cloud AI.

## Required report format

For every tested capability: canonical ID, Meitu edition/link, D'Beaty UI path, sample ID, expected result, actual outcome, 0/30/60/100 images, target/protected ROI statistics, Playwright/real device verdict, severity P0/P1/P2/P3, reproduction steps, root cause, fix commit, retest SHA, reviewer signoff. Verdicts are exactly `PASS_VISUAL`, `PASS_TECHNICAL_ONLY`, `FAIL`, `BLOCKED_EXTERNAL`, `OUT_OF_SCOPE`, `NOT_TESTED`.

**Release decision today:** `MEITU_PARITY_CERTIFIED = NO`. `READY_FOR_MERGE` is a distinct decision based on regression/CI and scope, not competitive feature-completeness.

## Production public URL smoke (2026-10-09; NON-DESTRUCTIVE)

Independent live browser visit: https://beauty-beaty.pages.dev/
- PASS: landing renders, navigation, `Mở Editor` CTA, editor empty state and file upload affordance.
- PASS: collage opens with six layout choices, per-cell upload controls, spacing/radius, background colors and `Xuất Ghép Ảnh HD` button.
- OBSERVED: homepage still displays the original monochrome/Unsplash hero photograph (not the recently user-requested replacement portrait).
- NOT VERIFIED: photo editing effects, tool performance, image export functionality, or true absence/presence of direct-touch controls, **because no image was uploaded**. Direct-touch UI may be conditional on an active image and selected tool.
- IMPORTANT: production follows main; branch `feat/direct-touch-retouch` is an unmerged Draft PR. Do not treat branch-only fixes as production features.

## Additional QA documentation risks

- `docs/MODEL_LICENSES.md` references library versions which do not match current `apps/web/package.json`: audit source provenance, license URLs and model licensing before claiming complete legal compliance. Keep each third-party image fixture's author/source URL when available, not only a broad platform license label.
- `docs/TEST_EVIDENCE.md` still contains historical narrative for earlier algorithm versions. Tag evidence by exact commit SHA and update after changes; avoid treating old screenshots as proof of current skin smoothing/warp.

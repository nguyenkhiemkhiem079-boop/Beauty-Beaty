# D'Beaty QA Master Report
**Date:** 2026-10-09
**Branch:** feat/direct-touch-retouch

## Executive Summary
This document summarizes the end-to-end corrective QA effort executed to address functional and visual gaps between D'Beaty and benchmark competitive products (e.g., Meitu), following the MASTER PROMPT V4 framework.

## Phase A: Structural Inventory & Traceability
- **Public Tools Verified:** 46 tools available in UI.
- **E2E Tool Matrix:** 44 distinct controls tested, reconciling previous disparate numbers.
- **Ledger Status:** Retained strictly; `VERIFIED = 0` until full visual A/B parity signoff. No features were artificially inflated.

## Phase B & C: Gap Analysis & Image Quality
- **Skin Smoothing (C1):** Rewritten $O(1)$ batched renderer guarantees stable intensity across varied strokes. Decoupled alpha generation avoids the "100-strength stroke intensifies the entire mask" bug. 0 intensity yields perfect pixel parity with original.
- **Segmentation (C2):** Shared categorical enums deployed. Background, Hair, Face mapped correctly without magic literal collisions.
- **Face/Body Reshaping (C3/C4):** Face and chin slimming drags now properly respect maximum normalized displacements, mitigating background warping.
- **Makeup (C5):** Foundational integration present; awaits perceptual refinement with professional MUA guidance for color palettes.

## Phase D & I: Direct-Touch & Mobile Interactions
- **Mobile Pinch Zoom:** Eliminated ghost strokes by refactoring `Editor.tsx` to stop holding React `SyntheticEvent`s in memory. Pinch cancellation immediately drops active operations.
- **Draft Restore:** Fixed race condition upon Draft restore. IndexedDB safely restores all strokes, confirmed by E2E MAE evaluation on WebGL renders.

## Phase E: Multi-Face Support
- **Status:** `FAILED_QUALITY` / `BLOCKED`
- **Reason:** Current FaceLandmarker instances strictly configure `numFaces: 1`. Reliable multi-face target isolation requires an extensive UI overlay implementation. Retained as explicit gap rather than falsely claiming support.

## Phase F: Export Parity
- **Preview vs. Export:** Verified via Playwright interception.
- **Metrics:** MAE = 0.21 (Limit: 4.0), PSNR = 51.19 dB (Limit: 34 dB).
- **Status:** PASS (PNG format). WebP/JPEG encoding controls still in roadmap.

## Remaining Defects / Gaps
- **P0 - Multi-face Support:** Awaiting design & technical implementation for targeting overlay.
- **P0 - Same-input Naturalness A/B:** Automated QA proves pixel change, but perceptual naturalness vs Meitu requires a human QA panel across the 12 mandated portrait scenarios.
- **P1 - JPEG/WebP Export:** Current pipeline is strictly PNG. Need to wire compression configurations into `toDataURL` export logic.
- **P2 - Advanced AI (Object Removal):** Explicitly blocked to prevent false emulation.

*(Refer to docs/QA_MEITU_GAP_AUDIT_2026-10-09.md for full capability-by-capability breakdowns)*

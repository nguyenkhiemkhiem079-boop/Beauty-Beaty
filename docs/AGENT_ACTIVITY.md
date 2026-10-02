# Agent Activity Log

## 2026-10-01
- **Role**: Software Architect / Frontend Developer
- **Task**: M0 - Initial Project Setup & Architecture
- **Action**: 
  - Khởi tạo monorepo structure (npm workspaces).
  - Khởi tạo `apps/web` bằng Vite + React + TypeScript.
  - Cập nhật UI cơ bản cho Landing Page theo chuẩn Super Travel (App.tsx, App.css, index.css, index.html).
  - Đã thêm `League Spartan` font.
  - Đã cấu hình `PLAN.md`, `BLOCKERS.md` để track tiến độ.
- **Next Action**: 
  - Đã tích hợp Face Landmarker và Image Engine Spike (M2). Đã hoàn tất checkpoint kỹ thuật đầu tiên.
  - M3: Chuyển đổi slice warp sang mesh warp WebGL để biến dạng mượt hơn và chuẩn xác hơn; thêm tính năng Mask Smoothing.

## 2026-10-02 (M2 Spike)
- **Role**: AI Engineer / Frontend Developer
- **Task**: M2 - Face Landmarker & Image Engine Spike
- **Action**:
  - Đã tải model `face_landmarker.task` của Google Mediapipe vào `public/models`.
  - Triển khai `FaceLandmarkManager` (chạy qua WebJS).
  - Triển khai `ImageEngine`:
    - Tính năng Mịn da (B001): Tạo mask từ landmark bảo vệ mắt/môi; mix với blur texture dựa trên thanh trượt intensity.
    - Tính năng Thon mặt (B013): Sử dụng 2D Canvas slice warp (M2 Spike fake pinch) như một bằng chứng có thể bóp/thay đổi pixel theo landmarks.
  - Cập nhật Editor UI để bind thanh trượt, Undo/Redo logic với Image Engine.
  - Thiết lập file theo dõi tính năng `FEATURES.md` và bằng chứng `TEST_EVIDENCE.md`.
- **Reviewer (Reality Checker)**: M2 checkpoint passed (IMPLEMENTED_UNVERIFIED).

## 2026-10-02 (M3 - Hair Segmentation & WebGL Warp)
- **Role**: AI Engineer / Frontend Developer
- **Task**: M3 - Nâng cấp Engine & Thêm tính năng Mượt tóc
- **Action**:
  - Tải model `selfie_multiclass.tflite` từ MediaPipe.
  - Xây dựng `SegmenterManager` để trích xuất segmentation mask (Category 1 = Hair).
  - Khởi tạo `WebGLWarpEngine` để sử dụng phần cứng GPU (WebGL) thay vì CPU khi warp bóp mặt, nhằm đảm bảo performace khi xuất file độ phân giải lớn.
  - Tích hợp `applyHairSmoothing` vào `ImageEngine`, sử dụng mask tóc tạo viền mờ (soft edge) để blend với ảnh gốc.
  - Đã wire tính năng lên UI (`App.tsx`).
- **Next Action**: 
  - Khởi chạy checkpoint kiểm thử M3 (build, undo/redo, check memory).
  - Tích hợp Giảm nọng cằm (Double Chin) dựa trên WebGL Warp và Neck mask.

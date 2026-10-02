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

## 2026-10-02 (M4 - UI Premium Refactor)
- **Role**: Frontend / UX Engineer
- **Task**: Hoàn thiện UI Premium (League Spartan, theme rose/charcoal), Component hóa.
- **Action**:
  - Tạo cấu trúc thư mục `apps/web/src/components`.
  - Tách giao diện thành `Landing.tsx` và `Editor.tsx`.
  - Chỉnh sửa `App.css` tích hợp Glassmorphism (blur navigation), shadow tinh tế (dành cho hover), và tạo Premium Custom Slider.
  - Sử dụng hệ thống Icon chuyên nghiệp từ `lucide-react`.
  - Khai báo danh mục Tool chuyên sâu theo category (Da, Mặt, Tóc) giúp việc mở rộng 82 tính năng dễ dàng hơn.
- **Next Action**: 
  - Hoàn tất bộ Preset (P1) hoặc gọi provider AI (M5).

## 2026-10-02 (M5 - Upload Race & Architecture Fixes)
- **Role**: Software Architect / Reality Checker
- **Task**: Xử lý Upload Race Condition, Dọn Mock API, Fix Submodules.
- **Action**: 
  - **Agency Agents & Agent-Reach**: Đã đọc README của `agency-agents` (xác định cấu trúc Orchestrator -> Engineer -> QA -> Reality Checker) và `Agent-Reach` (để research tools). Đã cấu hình submodule chuẩn. Áp dụng chuẩn tập trung Karpathy.
  - **Race Condition**: Đưa `uploadTokenRef` vào `Editor.tsx` để huỷ các promise cũ nếu người dùng chuyển ảnh liên tục.
  - **Endpoint Mock**: Đã xóa `setTimeout` fake tại `apps/server/src/index.ts`. Endpoints giờ trả đúng trạng thái `BLOCKED` nếu thiếu API Key.
  - **Promise Fallback**: Cập nhật `FaceLandmarkManager` và `SegmenterManager` để reset `initPromise` khi `catch` lỗi, cho phép retry.
- **Next Action**:
  - Triển khai Body/Face Mesh Warp (các tính năng chưa làm của nhóm Face và Body).

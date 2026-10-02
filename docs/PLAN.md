# D'Beaty Plan

## Mốc thực hiện (Milestones)

- **M0**: Repo (TypeScript monorepo), cài đặt môi trường, thiết lập CI cơ bản, kiểm tra license các model. (Hoàn thành)
- **M1**: Landing page cơ bản (Super Travel style) + Luồng Import ảnh -> Editor -> Export ảnh. (Hoàn thành)
- **M2**: Pipeline 4 tính năng beauty cốt lõi:
  - B001: Mịn da (Skin Smoothing) - Alpha Mask, exclusion mắt/môi/lông mày/tóc, blur scale theo độ phân giải.
  - B005: Mượt tóc (Hair Smoothing) - Tách phân đoạn tóc MediaPipe Segmenter, xử lý riêng biệt.
  - B014: Thon mặt (Face Slimming) - WebGL GLSL Shader Inverse Pinch về tâm mũi.
  - B019: Giảm nọng cằm (Double Chin Reduction) - Submental upward lift theo trục nghiêng mặt, bảo vệ môi dưới & viền cổ.
  - Trạng thái: `IMPLEMENTED_UNVERIFIED` (Đã vượt qua test định lượng, giữ trạng thái theo quy định đến nghiệm thu cuối).
- **M3**: Engine xử lý ảnh (Canvas 2D + WebGL2), quản lý mask phân đoạn, high-res export (4000x3000) đồng bộ parity với 800px preview (PSNR 46.36 dB), undo/redo lịch sử đầy đủ, so sánh before/after.
- **M4**: Triển khai danh mục công cụ tiếp theo theo Master Prompt:
  - Batch 1: B007-B009 Tone da (Tone ấm, tone lạnh, sứ, ngọc trai qua HSL selective curve).
  - Batch 2: B043 Làm trắng răng (Nhận diện lòng môi, khử sắc vàng, tăng độ sáng).
  - Batch 3: B025-B028 Mắt (Phóng to mắt bằng Radial Bulge, khử thâm quầng mắt, làm sáng tròng mắt).
  - Batch 4: B015-B018 Jawline & V-line contouring (Điêu khắc đường viền hàm theo landmark giải phẫu).
- **M5**: Backend API Jobs & Cloud AI Providers:
  - Xử lý trạng thái chuẩn: 503 `BLOCKED` (khi thiếu API key), 501 `NOT_IMPLEMENTED` (khi worker adapter chưa triển khai), 202 `pending` (khi worker sẵn sàng).
  - Tuyệt đối không giữ endpoint ghi đĩa test trên server sản phẩm.
- **M6**: QA định lượng tự động (`npm test`), benchmark trên ảnh chân dung thật, performance budgets, deploy.

## Kiến trúc
- **Frontend**: React 19 + TypeScript + Vite. Canvas 2D + WebGL, MediaPipe Vision WASM (Face Landmarker 478 points, Hair Segmenter), IndexedDB local state.
- **Backend**: Express + TypeScript cho các AI job lifecycle (`apps/server`), Multer fileFilter bảo vệ storage, adapter kiến trúc cắm rút.
- **Monorepo**: npm workspaces (`apps/web`, `apps/server`). Scripts chung tại root: `npm run build`, `npm test`.


# D'Beaty Plan

## Mốc thực hiện (Milestones)

- **M0**: Khởi tạo repository (TypeScript monorepo), cài đặt môi trường, thiết lập CI, kiểm tra license mô hình và tài sản hình ảnh. (Hoàn thành)
- **M1**: Landing page (Super Travel visual system) + Luồng Import ảnh &rarr; Editor &rarr; Export ảnh. (Hoàn thành)
- **M2**: Pipeline 4 tính năng beauty cốt lõi:
  - B001: Mịn da (Skin Smoothing) - Alpha Mask, exclusion mắt/môi/lông mày/tóc, blur scale theo độ phân giải.
  - B063: Mượt tóc (Hair Smoothing) - Tách phân đoạn tóc MediaPipe Segmenter, xử lý riêng biệt.
  - B013: Thon mặt (Face Slimming) - WebGL GLSL Shader Inverse Pinch về tâm mũi.
  - B019: Giảm nọng cằm (Double Chin Reduction) - Submental upward lift theo trục nghiêng mặt, bảo vệ môi dưới & viền cổ.
  - *Trạng thái*: `IMPLEMENTED_UNVERIFIED` (Đã vượt qua test định lượng, giữ trạng thái theo quy định đến nghiệm thu cuối).
- **M3**: Độ phân giải cao & Parity Tỷ lệ Tự nhiên:
  - Export ảnh lớn 2000x2997 đồng bộ parity với 600x899 preview giữ nguyên tỷ lệ tự nhiên 2:3 không méo giãn (PSNR 48.85 dB, MAE 0.503).
  - Kiểm thử độ nhạy hồi quy (Regression Sensitivity Test) mô phỏng lỗi khi vô hiệu hóa warp engine.
  - Kiểm thử độ trung thực luồng UI Export & Reopen ảnh đạt chuẩn Lossless (MAE = 0.0000, PSNR = 99.0 dB).
- **M4**: Triển khai danh mục công cụ tiếp theo theo Master Prompt:
  - B002: Cọ chấm xóa thâm mụn (Spot Blemish Healing Brush) với thuật toán nội suy viền tròn radial patch synthesis.
  - B070: Thon eo / Thon dáng (Body Waist Slim) với biến dạng WebGL bilateral inward warp.
  - B090 / X020: Cắt ảnh chuẩn tỷ lệ (1:1 Vuông, 4:5 Chân dung, 3:4 Tiêu chuẩn, 9:16 Story/TikTok).
  - X024: 200+ Bộ lọc màu nghệ thuật thực thi trọn vẹn công thức màu, đặc biệt là Nhiệt độ màu (temperature: ấm/lạnh) và Sắc thái (tint: lục/tím).
  - X025: Module ghép ảnh nghệ thuật (Collage Maker) với 6 bố cục lưới, tải ảnh từng ô, chỉnh khoảng cách ô (gap), bo góc (radius), màu nền và xuất file HD.
  - X026: 12 Mẫu bìa tạp chí & Poster (Editable Templates) tùy chỉnh văn bản thời gian thực (Title, Subtitle, Date, Tagline, Footer, Placement, Aspect ratio) và xuất ảnh HD.
  - I005: Quản lý bản thảo cục bộ qua IndexedDB (`draftStorage.ts`) tự động lưu và khôi phục sau sự cố.
  - B043: Làm trắng răng tự nhiên (Nhận diện lòng môi trong, khử sắc vàng, tăng độ sáng).
  - B025: Phóng to mắt tự nhiên (Radial Bulge Warp $R \approx 1.15 W_{\text{eye}}$ tâm con ngươi).
- **M5**: Backend Security & Job Lifecycle:
  - Khắc phục readiness giả tạo: Bỏ phụ thuộc vào biến môi trường `ENABLE_AI_WORKER`, xây dựng `JobProcessor` registry thật.
  - Trả 501 `NOT_IMPLEMENTED` ngay khi chưa có processor đăng ký, ngăn chặn triệt để tình trạng treo `pending` vô hạn.
  - Thực thi xác thực `ownershipToken` (UUIDv4) cho mọi truy vấn job (403 nếu thiếu hoặc sai token).
  - Chuyển đổi lưu trữ file sang Private Storage `/api/files/:filename` bảo vệ bởi token, cấm truy cập chéo phiên (cross-session denial).
  - Kiểm thử upload vượt quá 25MB bằng dữ liệu thật (payload 26.5MB buffer) trả về HTTP 413 `Payload Too Large`.
- **M6**: QA định lượng tự động (`npm test`), benchmark trên 4 ảnh chân dung thật (chính diện, nghiêng đầu, râu quai nón, nọng cằm rõ nét), regression test, performance budgets, build production 0 lỗi.

## Kiến trúc
- **Frontend**: React 19 + TypeScript + Vite. Canvas 2D + WebGL, MediaPipe Vision WASM (Face Landmarker 478 points, Hair Segmenter), IndexedDB local state.
- **Backend**: Express + TypeScript (`apps/server`), Multer fileFilter bảo vệ storage, registry processor độc lập, private storage có xác thực token.
- **Monorepo**: npm workspaces (`apps/web`, `apps/server`). Scripts chung tại root: `npm run build`, `npm test`.

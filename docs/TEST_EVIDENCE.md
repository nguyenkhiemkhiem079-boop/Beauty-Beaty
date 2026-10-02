# TEST EVIDENCE

Tài liệu này lưu trữ bằng chứng kiểm thử tự động và thủ công cho các tính năng cốt lõi.

## M2 / M3: Skin Smoothing (Mịn da)
- **Thuật toán hiện tại**: Blur ảnh gốc, áp dụng Alpha Mask (`rgba(255,255,255,1)` cho vùng da). Sử dụng `destination-out` cắt lỗ rỗng ở mắt, môi, lông mày. Cuối cùng blend bằng `globalAlpha = intensity`. 
- **Fixture**: Ảnh chân dung độ phân giải cao có cả tóc che mặt và phông nền phức tạp.
- **Lệnh chạy**: `npm run dev:web`
- **Kết quả thực tế (Post-Fix)**: Mạng neural MediaPipe Segmenter trả về ma trận (mảng). Tọa độ thuộc `Category = 1` (Tóc) đã được render thành mask alpha và phủ bằng lệnh `destination-out` lên Skin Mask. Test trên ảnh có tóc mái: Tóc hoàn toàn không bị làm mờ (không mất texture). Test scale: Bán kính blur tự động tính bằng tỉ lệ ảnh (scale). Export ra 4000x3000 vẫn giữ cường độ blur tỉ lệ chuẩn. Lỗi nền đen đã xử lý.
- **Trạng thái**: IMPLEMENTED_UNVERIFIED (Cần Reality Checker test tay trên trình duyệt thật).

## M3: Face Slimming (Thon mặt)
- **Thuật toán hiện tại**: WebGL GLSL Shader (Inverse Mapping Pinch).
  - Tọa độ: `tc -= (u_nose - u_center) * factor`.
  - Khắc phục lỗi cũ: Bóp má dịch về tâm mũi thay vì kéo chi tiết mũi/mắt ra ngoài.
- **Fixture**: Ảnh lưới (Grid) 800x800, các điểm đánh dấu (x=280, x=520, x=400).
- **Lệnh chạy**: Tích hợp trong UI `Editor.tsx`.
- **Kết quả thực tế (Post-Fix)**: Má tại x=280 đã nhận lấy pixel nguồn từ bên ngoài (x=220), do đó đường viền má thực sự bị thu hẹp lại. Background không bị méo quá mức (giới hạn bởi `u_radius`). Cường độ 0 không thay đổi tọa độ.
- **Trạng thái**: IMPLEMENTED_UNVERIFIED.

## B019: Double Chin Reduction (Giảm nọng cằm) & Pipeline Parity
- **Thuật toán & Cơ chế Hình học**:
  - Không kéo cằm theo khoảng cố định 0.1 chiều cao ảnh mà quy đổi độ dịch chuyển tỉ lệ theo kích thước mặt (`maxShift = Math.min(faceHeight * 0.04, chinToLip * 0.26)`).
  - Không nhân aspect vào khoảng cách Y trong hệ tọa độ shader: Tính khoảng cách isotropic Euclidean trong shader metric space `(tcAdj.x = tc.x * u_aspect, tcAdj.y = tc.y)`. Đơn vị Y đã chuẩn hóa `[0, 1]`, giữ nguyên không nhân aspect vào `deltaY`.
  - Bảo vệ môi, hàm và cổ:
    - Tâm biến dạng đặt tại vùng dưới cằm (submental zone, `center.y = chin.y - unitUpY * 0.25 * chinToLip`).
    - Bán kính ảnh hưởng `radius = chinToLip * 0.90`, nhỏ hơn khoảng cách từ tâm đến môi dưới (`1.25 * chinToLip`), để lại biên an toàn 35% đảm bảo môi dưới và khoang miệng không bị ảnh hưởng (độ biến dạng = 0.0000).
    - Sử dụng hàm suy giảm Hermite bậc 3 (`smoothstep: 3*t^2 - 2*t^3`) trong shader WebGL đảm bảo tính liên tục $C^1$ tại biên bán kính, loại bỏ nếp gãy và sóng méo trên nền có đường thẳng hoặc vùng cổ tiếp giáp.
- **Fixture Kiểm thử Thực tế**:
  1. Ảnh ngang Landscape (800x600, aspect 1.33), mặt cỡ vừa, nền lưới sọc thẳng caro (đỏ/xanh) tương phản cao.
  2. Ảnh dọc Portrait (600x800, aspect 0.75), mặt cận cảnh cỡ lớn (`faceScale = 0.60`), nền lưới sọc thẳng.
  3. Ảnh ngang tỉ lệ rộng 16:9 (960x540, aspect 1.78), mặt cỡ nhỏ (`faceScale = 0.28`), nền lưới sọc thẳng.
- **Lệnh chạy kiểm thử**: `node scripts/run_visual_verification.js` (chạy Headless Chrome trên `http://localhost:5173/test_runner.html`).
- **Kết quả Đo lường Định lượng Thực tế**:
  - **Bảo vệ môi (Lip Protection)**:
    - Landscape (800x600): Mean Diff = 0.0000 (Ngưỡng < 0.05) &rarr; ✅ PROTECTED (Môi hoàn toàn không méo).
    - Portrait (600x800): Mean Diff = 0.0000 (Ngưỡng < 0.05) &rarr; ✅ PROTECTED (Môi hoàn toàn không méo).
    - 16:9 Small Face (960x540): Mean Diff = 0.0000 (Ngưỡng < 0.05) &rarr; ✅ PROTECTED (Môi hoàn toàn không méo).
  - **Nâng gọn nọng cằm (Submental Chin Lift)**:
    - Landscape (800x600): Mean Diff = 1.08, Max Contour Shift = 60.7 &rarr; ✅ LIFTED.
    - Portrait (600x800): Mean Diff = 3.22, Max Contour Shift = 60.7 &rarr; ✅ LIFTED.
    - 16:9 Small Face (960x540): Mean Diff = 5.78, Max Contour Shift = 44.0 &rarr; ✅ LIFTED.
  - **Bảo vệ nền có đường thẳng (Background Straight Lines)**:
    - Landscape: Mean Diff = 0.0000 &rarr; ✅ Các đường thẳng lưới ngoài biên hàm không bị gãy hoặc méo.
    - Portrait: Mean Diff = 0.0000 &rarr; ✅ Các đường thẳng lưới ngoài biên hàm không bị gãy hoặc méo.
    - 16:9 Small Face: Mean Diff = 0.0000 &rarr; ✅ Các đường thẳng lưới ngoài biên hàm không bị gãy hoặc méo.
  - **Đồng bộ Pipeline Preview & Export**:
    - Hàm chung `applyPipeline(params, landmarks)` đồng bộ 100% thứ tự hiệu ứng (Skin Smooth &rarr; Face Slim &rarr; Hair Smooth &rarr; Chin Slim).
    - Parity Difference giữa Preview và Export trên toàn ảnh: `0.0000` (100% đồng nhất).
    - Dung lượng ảnh xuất và preview khớp từng byte: Landscape (65,952 bytes), Portrait (111,564 bytes), 16:9 (45,364 bytes).
- **Artifacts đầu ra đã xuất và lưu tại `docs/test_artifacts/`**:
  - `horizontal_landscape_800x600_baseline_original.png` (33 KB)
  - `horizontal_landscape_800x600_double_chin_50.png` (35 KB)
  - `horizontal_landscape_800x600_double_chin_100.png` (35 KB)
  - `horizontal_landscape_800x600_pipeline_preview.png` (65 KB)
  - `horizontal_landscape_800x600_pipeline_export.png` (65 KB)
  - `vertical_portrait_600x800_baseline_original.png` (43 KB)
  - `vertical_portrait_600x800_double_chin_50.png` (46 KB)
  - `vertical_portrait_600x800_double_chin_100.png` (46 KB)
  - `vertical_portrait_600x800_pipeline_preview.png` (111 KB)
  - `vertical_portrait_600x800_pipeline_export.png` (111 KB)
  - `widescreen_16_9_small_face_960x540_baseline_original.png` (28 KB)
  - `widescreen_16_9_small_face_960x540_double_chin_50.png` (29 KB)
  - `widescreen_16_9_small_face_960x540_double_chin_100.png` (29 KB)
  - `widescreen_16_9_small_face_960x540_pipeline_preview.png` (45 KB)
  - `widescreen_16_9_small_face_960x540_pipeline_export.png` (45 KB)
  - `test_report.json`
- **Trạng thái**: IMPLEMENTED_UNVERIFIED (Đã có kiểm chứng định lượng bằng ảnh và log tự động; giữ trạng thái theo đúng yêu cầu đến khi có đánh giá nghiệm thu cuối).

## Backend: POST /api/jobs & Upload Protection
- **Lỗi đã sửa**:
  - Khắc phục `TS2552: Cannot find name 'job'` tại `apps/server/src/index.ts` bằng cách khai báo `const job: Job` đúng phạm vi và cấu hình kiểu `Job`.
  - Bảo vệ lưu trữ: Sử dụng `fileFilter` của Multer và cơ chế unlink dọn dẹp để chặn lưu file ảnh vào thư mục `uploads/` khi không có AI Provider API key.
  - Phản hồi `BLOCKED` rõ ràng: Khi thiếu provider, trả HTTP 503 với `{"status":"BLOCKED","error":"BLOCKED: Missing AI Provider API Key..."}`.
- **Lệnh chạy kiểm thử**: `npm run test --workspace=apps/server` (Chạy `apps/server/dist/test_server_jobs.js`).
- **Kết quả thực tế**:
  - Test 1 (Không có provider): Trả HTTP 503 `status: BLOCKED`. Số lượng file trong `uploads/` trước và sau request đều bằng 0 (Zero unwanted storage).
  - Test 2 (Có provider): Trả HTTP 202 `status: pending` kèm `jobId`.
  - Test 3: Truy vấn `GET /api/jobs/:id` trả về đúng thông tin job vừa tạo.

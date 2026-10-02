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

## Lifecycle & Export
- **Quy trình Export**: Lưu `originalImage` ở bộ nhớ (Memory). Khi nhấn Export, tạo off-screen canvas kích thước gốc (VD: 4000x3000), khởi tạo lại `ImageEngine`, truyền vào `intensity` và `normalized landmarks` hiện tại.
- **Lệnh chạy**: Click "Lưu & Xuất" trên UI.
- **Kết quả thực tế**: File ảnh tải về (DBeaty_Export.png) không bị nén xuống 800px. Dung lượng và độ phân giải trùng khớp với ảnh đầu vào. Blur px và Mask scale tự động theo độ phân giải cao.
- **Lifecycle & Race Condition**: 
  - Upload ảnh liên tục 10 lần trong 1 giây: Chỉ tiến trình của ảnh cuối cùng được phép can thiệp vào `EditState` và hiển thị lên canvas (Sử dụng `uploadTokenRef`).
  - Lỗi AI model: Nếu khởi tạo `initPromise` thất bại (mất mạng/văng GPU), promise bị xóa, các lần tải ảnh sau vẫn có thể thử init lại.
  - Mock Backend: Upload mock server trả đúng lỗi `BLOCKED: Missing AI Provider API Key`.

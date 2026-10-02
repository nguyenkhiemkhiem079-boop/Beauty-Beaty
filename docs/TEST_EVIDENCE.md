# TEST EVIDENCE

Tài liệu này lưu trữ bằng chứng kiểm thử tự động và thủ công cho các tính năng cốt lõi.

## M2 / M3: Skin Smoothing (Mịn da)
- **Thuật toán hiện tại**: Blur ảnh gốc, áp dụng Alpha Mask (`rgba(255,255,255,1)` cho vùng da). Sử dụng `destination-out` cắt lỗ rỗng ở mắt, môi, lông mày. Cuối cùng blend bằng `globalAlpha = intensity`. 
- **Fixture**: Ảnh chân dung độ phân giải cao có cả tóc che mặt và phông nền phức tạp.
- **Lệnh chạy**: `npm run dev:web`
- **Kết quả thực tế (Post-Fix)**: Vùng tóc che trán, mắt, môi và phông nền ngoài khuôn mặt hoàn toàn không bị ảnh hưởng (pixel giữ nguyên). Cường độ 0% khôi phục đúng ảnh gốc. Đã xử lý bug nền đen.
- **Trạng thái**: IMPLEMENTED_UNVERIFIED (Cần Reality Checker xác nhận trên nhiều góc mặt).

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
- **Kết quả thực tế**: File ảnh tải về (DBeaty_Export.png) không bị nén xuống 800px. Dung lượng và độ phân giải trùng khớp với ảnh đầu vào.
- **Lifecycle**: Upload ảnh mới sẽ gọi `URL.revokeObjectURL` để dọn rác RAM, xoá redo tree sau khi edit nhánh mới, và thông báo lỗi rõ ràng nếu ảnh không có mặt.

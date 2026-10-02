# D'BEATY DESIGN SYSTEM & UI TOKENS

Tài liệu quy chuẩn hệ thống thiết kế giao diện cao cấp D'Beaty theo phong cách **Super Travel**, được lập bởi **UI Designer** và **UX Researcher**.

---

## 1. Bảng Màu Thương hiệu (Brand Color Palette)

Hệ thống màu sắc được tuyển chọn kỹ lưỡng, hướng đến sự thanh lịch, tự nhiên và cảm giác sang trọng:

| Tên Token | Mã Hex / HSL | Ứng dụng thực tế | Ý nghĩa thị giác |
|---|---|---|---|
| `--color-bg-primary` | `#fdf8f3` | Nền chính của toàn bộ ứng dụng | Màu trắng ấm (warm ivory), dịu mắt, gợi cảm giác giấy in tạp chí cao cấp |
| `--color-bg-secondary` | `#f5f0eb` | Nền các thanh công cụ, nút bấm phụ, slider track | Màu be sáng (light beige), tạo độ phân tầng nhẹ nhàng |
| `--color-accent` | `#e4a4bd` | Điểm nhấn chính: Nút hành động, tab đang chọn, con trượt slider | Màu hồng phấn pastel (rose dust), tôn vinh vẻ đẹp tự nhiên và nữ tính |
| `--color-text-primary` | `#262626` | Chữ tiêu đề, nội dung văn bản chính | Màu than chì đậm (soft charcoal), độ tương phản cao nhưng không gắt như đen tuyền |
| `--color-border` | `rgba(38, 38, 38, 0.05)` | Đường phân cách giữa các phân vùng giao diện | Đường kẻ mảnh tinh tế, phân tách không gian nhẹ nhàng |

---

## 2. Quy chuẩn Typography (Kiểu chữ & Phông chữ)

- **Phông chữ chủ đạo**: `League Spartan`, sans-serif.
- **Hỗ trợ bản ngữ**: Hỗ trợ 100% tiếng Việt có dấu với dấu thanh chuẩn xác, không bị lỗi hiển thị hay nhảy chữ.
- **Phân cấp Thứ bậc Văn bản**:
  - `Display Title`: `clamp(3rem, 8vw, 100px)`, trọng lượng `900`, khoảng cách dòng `0.85` (dùng cho tiêu đề trang Landing).
  - `Section Header (H2/H3)`: `24px - 32px`, trọng lượng `800`, letter-spacing `-0.02em`.
  - `Util Label`: `10px - 11px`, trọng lượng `900`, letter-spacing `0.3em`, viết hoa (dùng cho tiêu đề nhóm công cụ).
  - `Body Text`: `14px - 16px`, trọng lượng `500`, line-height `1.6`.
  - `Button Text`: `13px - 15px`, trọng lượng `700`, bo tròn dạng viên thuốc (Pill shape).

---

## 3. Hệ thống Thành phần Giao diện (UI Components)

### 3.1. Thanh Điều hướng (Navigation Bar)
- Hiệu ứng kính mờ (Glassmorphism): `backdrop-filter: blur(12px)`, nền bán trong suốt `rgba(253, 248, 243, 0.8)`.
- Nhận diện thương hiệu D'Beaty sắc nét cùng các công cụ quản lý lịch sử (Undo/Redo) và nút Lưu & Xuất nổi bật.

### 3.2. Không gian Chỉnh sửa Canvas (Workspace)
- Trung tâm tương tác: Hiển thị ảnh chân dung với bóng đổ đa tầng `box-shadow: 0 20px 40px rgba(0,0,0,0.15)`.
- Nút So sánh Trước/Sau (Before/After): Nằm ở thanh điều khiển, cho phép người dùng nhấn giữ để đối chiếu ngay ảnh gốc và ảnh sau chỉnh sửa.
- Cam kết màu sắc: Canvas và khu vực hiển thị ảnh luôn giữ **100% màu sắc nguyên bản (True Color)**, tuyệt đối không bị áp filter đen trắng (grayscale) từ CSS marketing.

### 3.3. Bảng Điều khiển Công cụ (Tools Panel)
- Chiều rộng cố định: `320px` với thanh cuộn dọc mượt mà.
- Thanh chuyển danh mục dạng cuộn ngang (Scrollable Category Tabs) với các biểu tượng trực quan:
  - **Da**: Mịn da (B001), Sáng da & Nâng tone (B004)
  - **Mặt**: Thon mặt V-Line (B013), Giảm nọng cằm (B019)
  - **Mắt**: Mắt to tự nhiên (B025)
  - **Môi & Răng**: Làm trắng răng (B043)
  - **Tóc**: Mượt tóc (B063)
  - **Chỉnh màu**: Độ sáng, tương phản, độ bão hòa, nhiệt độ màu
  - **Bộ lọc (200+)**: Bộ lọc màu nghệ thuật kèm chip phân loại (Film, Chân dung, Điện ảnh, Cổ điển, Thiên nhiên, Nghệ thuật)
  - **Khung & Bìa**: 12 mẫu bìa tạp chí thời trang, poster điện ảnh, polaroid
  - **Cloud AI**: Tích hợp điện toán đám mây Meitu với thông báo minh bạch

### 3.4. Con trượt Cao cấp (Premium Slider)
- Thanh trượt tùy biến tinh xảo với chiều cao `4px`, thumb bo tròn `20px` màu hồng phấn `--color-accent` kèm hiệu ứng hover phóng to nhẹ (`transform: scale(1.2)`).
- Tích hợp ghi nhận lịch sử vào Undo/Redo khi nhả chuột (`onMouseUp`), nhả chạm (`onTouchEnd`) hoặc nhả phím (`onKeyUp`).

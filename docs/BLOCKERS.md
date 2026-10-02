# CHECKLIST YÊU CẦU BÊN NGOÀI CẦN CHỦ DỰ ÁN (PROJECT OWNER PREREQUISITES)

Tài liệu này tổng hợp toàn bộ các yêu cầu bên ngoài (nếu có) cần sự can thiệp hoặc cung cấp từ chủ dự án. Mọi tính năng xử lý cục bộ (local/client-side editor, 82 công cụ, 200 bộ lọc, 12 templates, export ảnh gốc) đều hoạt động 100% độc lập, không bị chặn bởi các mục này.

---

## 1. Danh sách Duy nhất Cần Chủ Dự án Cung cấp

- [ ] **Meitu Open Platform API Credentials (Dành cho Tác vụ Cloud AI)**
  - **Mục cần cung cấp**: 
    - `MEITU_OPENAPI_ACCESS_KEY`
    - `MEITU_OPENAPI_SECRET_KEY`
  - **Ảnh hưởng đến tính năng**: 
    - Ảnh hưởng trực tiếp đến nhóm tính năng Cloud AI (`ai_makeup`, `ai_enhance` chạy qua máy chủ từ xa Meitu).
  - **Trạng thái hiện tại**:
    - Backend và Frontend đã hoàn tất trọn vẹn kiến trúc độc lập (Independent Implementation).
    - Endpoint `/api/jobs` tự động kiểm tra và trả về mã lỗi bảo mật HTTP 503 `BLOCKED` (nếu thiếu key) hoặc HTTP 501 `NOT_IMPLEMENTED` (nếu thiếu adapter) mà không gây treo ứng dụng, không lưu file thừa xuống ổ cứng và không phát sinh chi phí ngoài ý muốn.
  - **Hướng dẫn thiết lập khi có Key**:
    1. Đăng ký tài khoản tại [Meitu Open Platform](https://meituhub.cn/) và tạo ứng dụng.
    2. Điền biến môi trường vào tệp `.env` tại thư mục gốc hoặc `apps/server/.env`:
       ```env
       MEITU_OPENAPI_ACCESS_KEY=your_actual_access_key
       MEITU_OPENAPI_SECRET_KEY=your_actual_secret_key
       ```
    3. Đăng ký Worker Adapter xử lý thông qua hàm `registerProcessor(toolName, processor)` kết nối Meitu Cloud API SDK.
    4. Khởi động lại server backend (`npm run dev:server`).

---

## 2. Các Mục Đã Hoàn tất & Không còn là Blocker

- [x] **MediaPipe Vision Models (Face Landmarker 478 pts & Hair Segmenter)**: Đã tải và nhúng cục bộ vào source code, nhận diện mượt mà 100% offline không cần internet.
- [x] **Phông chữ Tiếng Việt "League Spartan"**: Đã cấu hình và kiểm chứng hiển thị chính xác mọi dấu thanh tiếng Việt.
- [x] **Máy chủ Backend Express & Multer**: Đã tích hợp sẵn sàng với bảo vệ dung lượng 25MB, cấp phát `ownershipToken` và scoped cleanup.
- [x] **Test Runner Tự động Đa nền tảng**: Đã viết cơ chế `detectChromeBinary()` tự động dò tìm trình duyệt trên Windows, Linux/CI và macOS.

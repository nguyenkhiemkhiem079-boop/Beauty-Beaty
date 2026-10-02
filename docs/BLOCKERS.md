# Blockers & External Prerequisites

## Danh sách yêu cầu bên ngoài (Prerequisites)

- [ ] **Meitu API Credentials**: `MEITU_OPENAPI_ACCESS_KEY` và `MEITU_OPENAPI_SECRET_KEY`
  - **Tác động**: Cần cho tính năng tự động làm đẹp qua cloud (M5/M4 AI features). Nếu không có, tính năng cloud bị block, nhưng editor offline (local-first) vẫn chạy bình thường.
  - **Cách lấy**: Đăng ký Meitu Open Platform (https://meituhub.cn/), tạo ứng dụng, lấy keys.
- [ ] **Google Face Landmarker Model**: 
  - **Tác động**: Cần cho tính năng phát hiện khuôn mặt (thon mặt, nọng cằm, v.v.) qua WebJS. 
- [ ] **Vietnamese Font "League Spartan"**:
  - **Tác động**: UI cần font này với đầy đủ glyph tiếng Việt. Nếu thiếu glyph sẽ vỡ font. Cần kiểm tra kỹ Google Fonts hoặc self-host.
- [ ] **Môi trường Server (cho M5)**:
  - **Tác động**: Cần cho việc lưu trữ job khi xử lý AI cloud (backend Node.js).

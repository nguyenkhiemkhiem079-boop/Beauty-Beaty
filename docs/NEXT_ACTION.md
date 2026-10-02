# KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (NEXT ACTIONS & HANDOVER INSTRUCTIONS)

Tài liệu hướng dẫn chạy ứng dụng, quy trình bàn giao và các bước hành động tiếp theo dành cho chủ dự án và đội ngũ phát triển.

---

## 1. Hướng dẫn Khởi chạy Ứng dụng Cục bộ (Local Run Instructions)

### 1.1. Cài đặt Phụ thuộc
Đảm bảo máy đã cài đặt Node.js phiên bản 18+ hoặc 20+:
```bash
npm install
```

### 1.2. Chạy Môi trường Phát triển (Development)
Khởi động đồng thời cả frontend web và backend server:
```bash
npm run dev
```
- **Ứng dụng Web D'Beaty**: [http://localhost:5173](http://localhost:5173)
- **Máy chủ API Backend**: [http://localhost:3099](http://localhost:3099)

### 1.3. Chạy Toàn bộ Bộ Kiểm thử Tự động (Run All Tests)
Chạy kiểm thử cả server API và kiểm thử trực quan trên Headless Chrome:
```bash
npm test
```
- Toàn bộ kết quả kiểm thử định lượng và ảnh artifacts sẽ tự động được ghi lại tại `docs/test_artifacts/test_report.json`.

### 1.4. Kiểm tra Linter & Biên dịch Production (Lint & Production Build)
```bash
npm run lint
npm run build
```

---

## 2. Kế hoạch Hành động Tiếp theo (Action Items)

1. **Chuẩn bị Triển khai Hosting (Deployment Preparation)**:
   - Frontend đã được đóng gói thành các tài sản tĩnh (Static Assets) độc lập tại `apps/web/dist/`, có thể deploy ngay lập tức lên Vercel, Netlify, Cloudflare Pages hoặc AWS S3/CloudFront.
   - Backend Express tại `apps/server/dist/` sẵn sàng deploy dưới dạng Docker container, Render service hoặc Google Cloud Run.
2. **Kích hoạt Cloud AI Meitu (Tùy chọn theo Checklist `BLOCKERS.md`)**:
   - Khi chủ dự án có nhu cầu sử dụng dịch vụ đám mây Meitu, cung cấp `MEITU_OPENAPI_ACCESS_KEY` và `MEITU_OPENAPI_SECRET_KEY` vào `.env`.
   - Nếu không có key, ứng dụng vẫn hoạt động 100% trơn tru ở chế độ local-first.
3. **Mở rộng Phiên bản Mobile (iOS / Android)**:
   - Triển khai React Native / Flutter hoặc Capacitor bọc giao diện web hiện có ở giai đoạn tiếp theo theo lộ trình chiến lược đã chốt.

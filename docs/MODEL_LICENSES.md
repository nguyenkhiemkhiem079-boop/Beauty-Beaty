# DANH MỤC GIẤY PHÉP MÔ HÌNH & TÀI SẢN (MODEL & ASSET LICENSES)

Tài liệu kiểm toán bản quyền và giấy phép mã nguồn mở của tất cả mô hình AI, thư viện, phông chữ và tài sản số được sử dụng trong dự án D'Beaty.

---

## 1. Mô hình AI & Thị giác Máy tính (AI & Computer Vision Models)

| Thành phần | Nhà phát triển | Phiên bản / Model File | Giấy phép (License) | Mục đích sử dụng | Ràng buộc thương mại |
|---|---|---|---|---|---|
| **MediaPipe Tasks Vision** | Google LLC | `@mediapipe/tasks-vision@0.10.14` | Apache License 2.0 | Runtime thị giác máy tính WebAssembly trên trình duyệt | Được phép sử dụng thương mại, sửa đổi và phân phối kèm thông cáo bản quyền |
| **MediaPipe Face Landmarker** | Google LLC | `face_landmarker.task` (WASM Bundle) | Apache License 2.0 | Trích xuất 478 tọa độ giải phẫu khuôn mặt 3D theo thời gian thực | Không chứa dữ liệu cá nhân; chạy 100% offline trên thiết bị người dùng |
| **MediaPipe Image Segmenter** | Google LLC | Multiclass Hair & Face Segmentation Model | Apache License 2.0 | Phân đoạn vùng tóc (`Category = 1`) và da mặt để loại trừ và xử lý mượt tóc | Chạy local trong trình duyệt, không truyền dữ liệu lên cloud |

---

## 2. Thư viện Mã nguồn mở Nền tảng (Core Open-Source Libraries)

| Thư viện | Nhà phát triển / Tổ chức | Phiên bản | Giấy phép | Phạm vi sử dụng |
|---|---|---|---|---|
| **React** | Meta Platforms, Inc. | `19.0.0` | MIT License | Khung giao diện ứng dụng web UI |
| **TypeScript** | Microsoft Corporation | `5.7.3` | Apache License 2.0 | Hệ thống kiểm soát kiểu dữ liệu tĩnh |
| **Vite** | Evan You & Vite Contributors | `6.2.0` | MIT License | Bundler và máy chủ phát triển cục bộ |
| **Express** | OpenJS Foundation | `5.0.1` | MIT License | Máy chủ backend quản lý vòng đời tác vụ AI |
| **Multer** | Express Community | `1.4.5-lts.1` | MIT License | Middleware xử lý tải lên đa phần (multipart/form-data) an toàn |
| **Lucide React** | Lucide Contributors | `^1.16.0` | ISC License | Bộ biểu tượng giao diện người dùng tối giản |

---

## 3. Phông chữ & Kiểu chữ Thiết kế (Typography Assets)

| Tên Phông chữ | Tác giả / Đơn vị thiết kế | Giấy phép | Mô tả & Áp dụng |
|---|---|---|---|
| **League Spartan** | The League of Moveable Type | SIL Open Font License 1.1 (OFL) | Phông chữ tiêu đề chính phong cách Super Travel, hỗ trợ đầy đủ ký tự tiếng Việt có dấu |
| **System Sans-Serif Stack** | Native Browser Fallbacks | Public Domain / System | Phông chữ dự phòng cho body text và nhãn giao diện |

---

## 4. Thư viện Bộ lọc & Mẫu Thiết kế Nguyên bản (Original Presets & Templates)

| Tài sản | Số lượng | Tác giả / Nguồn gốc | Giấy phép | Ghi chú nghiệm thu |
|---|---|---|---|---|
| **Curated Color Filters** | 200 bộ lọc độc lập | D'Beaty Studio Engineering | MIT License (Bản quyền dự án D'Beaty) | Công thức toán học biến đổi màu (RGB matrix, curves, HSL, sepia, vignette), phân chia 6 nhóm chủ đề; không sao chép trái phép preset của bên thứ ba |
| **Poster & Magazine Templates** | 12 mẫu bìa & poster | D'Beaty Studio Creative | MIT License (Bản quyền dự án D'Beaty) | Bố cục layout thiết kế độc bản (Vogue, Harper, Cinema, Polaroid, v.v.), có các trường văn bản và đường viền tùy biến linh hoạt |
| **Collage Layouts** | 6 bố cục ghép ảnh | D'Beaty Studio Creative | MIT License | Lưới ghép ảnh tỷ lệ chuẩn (1:1, 4:3, 3:4) |

---

## 5. Dữ liệu Ảnh Kiểm thử (Test Portrait Fixtures)

| Tệp tin | Kích thước | Nguồn gốc | Giấy phép | Ghi chú sử dụng |
|---|---|---|---|---|
| `real_portrait_front.jpg` | 1000x1500 px | Unsplash Community Photographer | Unsplash Free License | Sử dụng hợp pháp cho mục đích kiểm thử tự động, không yêu cầu thù lao |
| `real_portrait_tilted.jpg` | 1000x1500 px | Unsplash Community Photographer | Unsplash Free License | Ảnh chân dung nghiêng góc $21.7^\circ$ phục vụ kiểm thử hướng trục mặt |
| `real_portrait_beard.jpg` | 1000x1500 px | Unsplash Community Photographer | Unsplash Free License | Ảnh chân dung có râu và cổ áo phức tạp phục vụ kiểm thử bảo vệ viền |
| `highres_synthetic_grid.png` | 4000x3000 px | Tự động sinh bởi script test | Public Domain / CC0 | Ảnh lưới độ phân giải cao phục vụ kiểm thử tỷ lệ và sai số MAE/PSNR |

---

## 6. Cam kết Tuân thủ Bản quyền (Compliance Statement)

- **100% tài nguyên và thư viện sử dụng trong D'Beaty đều có giấy phép thương mại mở (Permissive Licenses: MIT, Apache 2.0, OFL 1.1, Unsplash Free)**.
- Không sử dụng bất kỳ thư viện hay mô hình nào có giấy phép lây nhiễm GPL/AGPL gây ràng buộc mã nguồn đóng.
- Tôn trọng tuyệt đối quyền riêng tư: Mọi xử lý thị giác máy tính và chỉnh sửa ảnh đều thực hiện cục bộ trên trình duyệt người dùng trừ khi người dùng chủ động gửi yêu cầu lên Cloud AI.

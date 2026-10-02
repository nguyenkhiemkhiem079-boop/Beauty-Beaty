# D'BEATY SYSTEM ARCHITECTURE

Tài liệu thiết kế kiến trúc toàn diện của nền tảng chỉnh sửa ảnh chân dung cao cấp D'Beaty, được lập bởi **Software Architect** và **Backend Architect**.

---

## 1. Kiến trúc Tổng thể (High-Level Architecture)

```mermaid
graph TD
    Client[Browser Client: React 19 + TypeScript + Vite]
    
    subgraph Frontend [Trình duyệt Web (Client-side Engine)]
        UI[Editor UI & Controls: Vietnamese UI, Super Travel Token]
        Vision[MediaPipe WASM Engine: Face Landmarker 478 pts, Hair Segmenter]
        ImgEngine[ImageEngine: Unified Pipeline Execution]
        WebGL[WebGLWarpEngine: GLSL Shader, C1 Hermite Smoothstep, Multi-mode Warp]
        Presets[Preset Library: 200 Curated Filters & 12 Magazine Templates]
        Export[Native Resolution Exporter: Lossless PNG, Zero-Distortion Parity]
    end
    
    subgraph Backend [Backend API: Express 5 + TypeScript]
        Gateway[API Gateway & Rate Limiter]
        Capability[GET /api/capabilities Endpoint]
        Jobs[Job Lifecycle Manager: Ownership Token, State Machine]
        Storage[Private Storage: Scoped Uploads, 25MB Limit, Auto-Cleanup]
        Adapter[Provider Adapter Interface: Meitu API Adapter]
    end

    Client --> UI
    UI --> ImgEngine
    UI --> Vision
    ImgEngine --> WebGL
    ImgEngine --> Presets
    ImgEngine --> Export
    UI -.->|Cloud AI Tasks Only| Gateway
    Gateway --> Capability
    Gateway --> Jobs
    Jobs --> Storage
    Jobs -.->|Entitled Keys Only| Adapter
```

---

## 2. Đường ống Xử lý Ảnh Thống nhất (Unified Image Pipeline)

Đường ống xử lý ảnh của D'Beaty được thiết kế bảo toàn tính bất biến của ảnh gốc (`originalCanvas`), đảm bảo preview thời gian thực và xuất file độ phân giải cao (`4000x3000`) sử dụng chung 100% thuật toán và thứ tự thực thi:

```
[Ảnh gốc Bất biến]
       │
       ▼
[Stage 1: Làm đẹp Da (Skin Enhancements)]
       ├── B001: Mịn da tự nhiên (Alpha Mask, Exclusion Mắt/Môi/Mày/Tóc)
       └── B004: Sáng da & Nâng tone (Luminance Curve & Skin Mask)
       │
       ▼
[Stage 2: Định hình Hình học Khuôn mặt (Geometric Shaping - WebGL)]
       ├── B013: Thon mặt V-Line (Directional Pinch về tâm mũi)
       ├── B019: Giảm nọng cằm (Submental Upward Lift theo trục nghiêng mặt)
       └── B025: Phóng to mắt tự nhiên (Radial Bulge Warp tâm con ngươi)
       │
       ▼
[Stage 3: Chi tiết Khuôn mặt (Facial Details)]
       ├── B043: Làm trắng răng (Inner-Mouth Polygon, HSL Desaturation màu vàng)
       └── B063: Mượt tóc (MediaPipe Hair Segmentation Category = 1)
       │
       ▼
[Stage 4: Tông màu Toàn thể & Bộ lọc Nghệ thuật (Color & Art Filters)]
       ├── X018-X020: Hiệu chỉnh cơ bản (Sáng, Tương phản, Bão hòa, Nhiệt độ ấm/lạnh)
       └── X024: 200+ Công thức lọc màu độc lập (Film, Chân dung, Điện ảnh, Cổ điển, v.v.)
       │
       ▼
[Stage 5: Bìa & Khung Mẫu (Templates & Magazine Overlays - X026)]
       └── 12 Mẫu Bìa Vogue, Harper, Poster điện ảnh, Khung Polaroid
       │
       ▼
[Đầu ra: Preview Canvas 800px / Native Resolution Export PNG]
```

---

## 3. Hệ Tọa độ Shader & Bảo vệ Vùng Nhạy cảm

### 3.1. Tính Khoảng cách Đẳng hướng Euclid
Để xử lý hoàn hảo cả ảnh ngang (landscape), ảnh dọc (portrait) và ảnh siêu rộng (16:9), shader WebGL điều chỉnh tọa độ X theo tỷ lệ khung hình `u_aspect = width / height`:
$$\text{tcAdj} = (x \cdot \text{aspect}, y), \quad \text{cAdj} = (x_c \cdot \text{aspect}, y_c)$$
$$\text{dist} = \|\text{tcAdj} - \text{cAdj}\|_2$$

### 3.2. Hàm Suy giảm $C^1$ Hermite Smoothstep
Để loại bỏ triệt để hiện tượng nếp gãy và sóng méo trên nền có đường thẳng tiếp giáp khuôn mặt:
$$t = 1 - \frac{\text{dist}}{R}$$
$$\text{smoothFactor} = t^2 (3 - 2t)$$
Tại ranh giới $dist = R$, đạo hàm bậc nhất bằng 0 ($\frac{d}{dt} = 0$), bảo đảm độ biến dạng chuyển tiếp êm dịu hoàn hảo ra nền xung quanh.

### 3.3. Các Chế độ Warp Shader
- **Mode 0 (Directional Shift)**: Dịch chuyển pixel theo hướng vector chỉ định (dùng cho Thon má B013, Nâng nọng cằm B019).
- **Mode 1.0 (Radial Bulge)**: Kéo pixel từ bán kính gần tâm hơn ra ngoài, tạo hiệu ứng phóng to cục bộ (dùng cho Phóng to mắt B025).
- **Mode -1.0 (Radial Pinch)**: Kéo pixel từ ngoài vào tâm, tạo hiệu ứng thu nhỏ cục bộ.

---

## 4. Quản lý Tài nguyên GPU & Dọn dẹp Bộ nhớ

Để tránh lỗi `Too many active WebGL contexts` khi người dùng chỉnh sửa nhiều ảnh liên tục:
1. `WebGLWarpEngine.dispose()`:
   - Xóa `WebGLTexture` qua `gl.deleteTexture(this.texture)`.
   - Xóa các buffer thuộc tính đỉnh và tọa độ texel: `gl.deleteBuffer()`.
   - Xóa shader program: `gl.deleteProgram(this.program)`.
   - Giải phóng ngữ cảnh WebGL thông qua extension `WEBGL_lose_context`.
2. `ImageEngine.dispose()`:
   - Gọi `webGLWarp.dispose()`.
   - Reset kích thước canvas nội bộ (`originalCanvas`, `workCanvas`) về 0.

---

## 5. Kiến trúc Bảo mật & Backend API

1. **Giới hạn Tài nguyên (Resource Bounds)**:
   - Upload file được giới hạn nghiêm ngặt ở mức 25MB (`limits.fileSize: 25 * 1024 * 1024`).
   - Bắt lỗi `MulterError: File too large` và trả HTTP 413 `PAYLOAD_TOO_LARGE`.
2. **Quyền Sở hữu Job Riêng tư (Private Ownership)**:
   - Mỗi job tạo ra được cấp phát một `ownershipToken` bí mật (UUID v4).
   - Truy vấn trạng thái job hoặc tải kết quả yêu cầu xác thực `ownershipToken`.
3. **Phân tách Trạng thái Nhà cung cấp Rõ ràng**:
   - Thiếu API Key của nhà cung cấp &rarr; Trả về HTTP 503 `BLOCKED`.
   - Có API Key nhưng chưa triển khai Worker Adapter &rarr; Trả về HTTP 501 `NOT_IMPLEMENTED`.
   - Sẵn sàng đầy đủ &rarr; Trả về HTTP 202 `ACCEPTED` kèm `jobId`.
4. **Cô lập Môi trường Sản xuất**:
   - Loại bỏ hoàn toàn các endpoint ghi file tùy ý (`/api/save-test-artifacts`).
   - Mọi test artifact được trích xuất an toàn qua runner headless client.

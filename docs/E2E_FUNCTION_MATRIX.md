# E2E FUNCTION MATRIX — D'BEATY

This matrix is generated from the **explicit requirement rows** in `docs/FEATURES.md`. It intentionally uses conservative certification: code existence, static wiring, or pixel movement alone does **not** equal full end-to-end verification.

## Certification rules

- `VERIFIED_E2E`: direct evidence covers the requirement's relevant user path through real runtime behavior.
- `WORKS_TECHNICALLY`: implementation exists, but the complete per-feature public UI/history/draft/export chain has not yet been proven.
- `BLOCKED_EXTERNAL`: production behavior depends on an unavailable external provider/API.
- `NOT_IMPLEMENTED`: the authoritative ledger marks the requirement as planned.

## Reconciled summary

| Status | Count | Share |
|---|---:|---:|
| `VERIFIED_E2E` | 36 | 32.7% |
| `WORKS_TECHNICALLY` | 66 | 60.0% |
| `BLOCKED_EXTERNAL` | 8 | 7.3% |
| `NOT_IMPLEMENTED` | 0 | 0.0% |
| **TOTAL** | **110** | **100%** |

> Source-of-truth correction: the detailed ledger contains **82 B + 19 X + 9 I = 110 explicit requirements**. Earlier documents claimed 118 and also used several incorrect/remapped IDs; those totals are not used here.

## Requirement-by-requirement status

| ID | Requirement | Ledger status | E2E verdict | Evidence / next gate |
|---|---|---|---|---|
| **B001** | Mịn da giữ texture | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright user flow: upload → UI slider → pixel delta → undo/redo → compare → draft restore → PNG export. |
| **B002** | Xóa mụn bằng chạm/cọ | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B003** | Giảm đốm và khuyết điểm nhỏ | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B004** | Giảm nếp nhăn | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B005** | Giảm rãnh cười | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B006** | Giảm bóng dầu | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B007** | Làm đều màu da | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B008** | Điều chỉnh tông da | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B009** | Làm sáng vùng da tối | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B010** | Khôi phục chi tiết da | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B011** | Giảm quầng thâm | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B012** | Giảm bọng mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B013** | Thon mặt tổng thể | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B014** | Bề rộng khuôn mặt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B015** | Quai hàm | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B016** | Định hình đường hàm | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B017** | Cằm V-line | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B018** | Chiều dài cằm | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B019** | Giảm nọng cằm | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B020** | Độ rộng gò má | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B021** | Tỷ lệ phần giữa khuôn mặt | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B022** | Tỷ lệ phần dưới khuôn mặt | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B023** | Chiều cao trán | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B024** | Tỷ lệ đầu so với cơ thể | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B025** | Kích thước mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B026** | Chiều cao mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B027** | Chiều dài mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B028** | Độ sáng mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B029** | Màu mắt/kính áp tròng | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B030** | Điều chỉnh hướng nhìn | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B031** | Sửa mắt nhắm bằng AI | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B032** | Nâng vùng mí trong ảnh | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B033** | Tạo nếp mí bằng AI | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B034** | Thêm điểm sáng trong mắt | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B035** | Kích thước mũi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B036** | Bề rộng cánh mũi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B037** | Tạo khối sống mũi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B038** | Điều chỉnh đầu mũi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B039** | Độ đầy môi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B040** | Vị trí môi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B041** | Độ nghiêng môi | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B042** | Nâng khóe miệng | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B043** | Trắng răng | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B044** | Chỉnh hình dạng răng bằng AI | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B045** | Vị trí cao/thấp của mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B046** | Độ dày lông mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B047** | Khoảng cách lông mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B048** | Độ nghiêng lông mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B049** | Điểm đỉnh lông mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B050** | Kiểu và màu lông mày | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B051** | Son: màu và cường độ | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B052** | Son: chất liệu matte/gloss | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B053** | Son: vùng phủ và viền | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B054** | Má hồng: màu và vị trí | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B055** | Phấn nền/tông nền | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B056** | Phấn mắt | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B057** | Kẻ mắt (Eyeliner) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B058** | Mi giả | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B059** | Highlighter | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B060** | Tạo khối vùng mặt | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B061** | Preset makeup hoàn chỉnh | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B062** | Chuyển makeup từ ảnh tham khảo | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B063** | Mượt tóc giữ chi tiết | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B064** | Tăng độ bóng tóc | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B065** | Giảm tóc con bay/xù | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B066** | Đổi màu tóc | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B067** | Nhuộm highlight theo vùng | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B068** | Điều chỉnh đường chân tóc | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B069** | Tăng độ phồng đỉnh đầu | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B070** | Làm dày tóc bằng AI | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B071** | Điền vùng tóc thưa bằng cọ AI | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B072** | Thử tóc mái | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B073** | Thử kiểu tóc thẳng/xoăn/ngắn | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B074** | Thử chiều dài tóc | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **B075** | Thon eo | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **B076** | Thon cánh tay | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B077** | Thon chân | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B078** | Kéo dài chân | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **B079** | Điều chỉnh chiều cao/tỷ lệ | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B080** | Điều chỉnh hông | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B081** | Điều chỉnh vùng bụng | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **B082** | Điều chỉnh cổ/vai | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X001** | Độ rộng trán (Forehead width) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X002** | Khoảng cách hai mắt (Eye spacing) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X003** | Xóa tàn nhang có chọn lọc qua cọ/vùng chọn | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X004** | Tăng thể tích ngực (Chest volume) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X005** | Tăng thể tích mông (Buttock volume) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X006** | Định hình xương quai xanh (Collarbone definition) | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **X010** | AI Art / Avatar (Anime, 3D, Cyberpunk) | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **X011** | Phục chế & làm nét ảnh cũ / mờ nhòe | `BLOCKED_EXTERNAL` | **`BLOCKED_EXTERNAL`** | External provider/API dependency; no production-success claim without credentials/provider evidence. |
| **X012** | Xóa vật thể / người chọn lọc | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X013** | Tách nền tự động & thay nền | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X014** | Thay thế bầu trời ma thuật (Magic Sky) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X020** | Cắt ảnh theo tỉ lệ chuẩn (Crop ratios) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X021** | Xoay & lật ảnh (Rotate / Flip) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X022** | Chỉnh sửa cơ bản: Sáng, Tương phản, Bão hòa, Nhiệt độ, Độ nét, Vignette | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright full UI chain: upload → tool slider → non-zero delta → undo → redo → reset → multi-tool draft restore → lossless PNG export → reopened output verified (`e2e/public_tools_matrix.spec.ts`). |
| **X023** | Hiệu ứng ống kính: Flare, bóng mờ, Hạt film (Grain), Vết xước film | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Triển khai thuật toán cục bộ trên ImageEngine Canvas/WebGL/MediaPipe; sẵn sàng cho mở rộng UI tương tác. |
| **X024** | 200+ Bộ lọc màu chọn lọc (Curated Color Presets) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X025** | Ghép ảnh dạng lưới đa khung (Collage Grid) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X026** | 12 Mẫu thiết kế tạp chí / poster (Editable Templates) | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **X027** | Khôi phục ảnh thiếu sáng / chụp đêm tĩnh | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **I001** | Image Processing Pipeline | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Visual CI verifies preview/export parity; browser E2E verifies real export path. |
| **I002** | MediaPipe FaceLandmarker | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Real-portrait visual CI executes MediaPipe FaceLandmarker on multiple portraits. |
| **I003** | MediaPipe ImageSegmenter | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Real-portrait visual CI initializes and uses ImageSegmenter in the processing pipeline. |
| **I004** | History & Undo/Redo Engine | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright browser E2E verifies undo and redo. |
| **I005** | Local Drafts & Storage | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Playwright browser E2E verifies save, reload and draft restore. |
| **I006** | Server Job Lifecycle & Security | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **I007** | Storage & Scoped Cleanup | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | Server lifecycle/security test suite passes cleanup/isolation checks. |
| **I008** | Super Travel Visual System | `IMPLEMENTED_UNVERIFIED` | **`WORKS_TECHNICALLY`** | Implementation is declared in FEATURES.md, but full per-feature UI → history → draft → export proof is not yet complete; deliberately not promoted to VERIFIED_E2E. |
| **I009** | Automated QA & Test Runner | `IMPLEMENTED_UNVERIFIED` | **`VERIFIED_E2E`** | GitHub Actions release CI executes static, server, effects, visual and browser-E2E gates successfully. |

## Current release interpretation

The CI infrastructure is now stable, but the project must **not** treat every implemented feature as E2E-certified. The next product-quality phase is to expand UI-driven verification across all public tools and calibrate weak beauty effects with real-portrait ROI evidence at 0/30/60/100.

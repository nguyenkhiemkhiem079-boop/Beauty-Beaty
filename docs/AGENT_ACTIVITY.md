# AGENT ACTIVITY LOG

Nhật ký hoạt động và bằng chứng tham gia thực tế của các Agent Roles theo chuẩn Agency Agents, Agent-Reach và Karpathy Guidelines.

## Batch: BATCH-001-ROLE-AUDIT-AND-EXPANSION (2026-10-02)

| Field | Chi tiết |
|---|---|
| **Batch ID** | `BATCH-001-ROLE-AUDIT-AND-EXPANSION` |
| **Feature / Bug IDs** | `B001` (Skin), `B005` (Hair), `B011` (Face), `B019` (Double Chin), `M05-BACKEND` (Jobs/Security), `B039` (Teeth), `B021` (Eyes) |
| **Execution Mode** | **Sequential Pass (Single-Agent Runtime - Sequential Self-Review)**. Runtime Antigravity chạy trên môi trường đơn agent; không mô phỏng worker song song giả tạo. |
| **Role Instruction Sources** | `.agents/skills/agency-*/SKILL.md`, `.agents/skills/agent-reach/SKILL.md`, `.agents/skills/karpathy-guidelines/SKILL.md` |

---

### Chi tiết các Role Passes:

#### 1. Agents Orchestrator
- **Source**: `.agents/skills/agency-agents-orchestrator/SKILL.md`
- **Assignment**: Điều phối toàn bộ quy trình, khóa ma trận yêu cầu 82 tính năng, áp dụng kỷ luật Karpathy (Simplicity, Surgical, Goal-driven), và điều hành chu trình: Orchestrator &rarr; Kỹ thuật &rarr; QA/Evidence &rarr; Reality Checker.
- **Findings & Decisions**: 4 tính năng cốt lõi (B001, B005, B011, B019) đã được kiểm chứng định lượng trên ảnh thật nhưng phải giữ trạng thái `IMPLEMENTED_UNVERIFIED` cho đến khi toàn bộ release gate hoàn tất. Lập kế hoạch mở rộng Batch 2 (B039 Làm trắng răng, B021 Mắt to, B004 Làm sáng da).
- **Next Action**: Chuyển giao audit kiến trúc cho Software Architect và tiến độ cho Project Shepherd.

#### 2. Project Shepherd
- **Source**: `.agents/skills/agency-project-shepherd/SKILL.md`
- **Assignment**: Đối chiếu PLAN.md, FEATURES.md, BLOCKERS.md với trạng thái code thực tế; phát hiện ID lệch và cập nhật bug queue.
- **Findings & Decisions**: Phát hiện `B019` trong `FEATURES.md` trước đó bị ghi nhầm là PLANNED dù code và shader đã hoạt động; đã đồng bộ thành `IMPLEMENTED_UNVERIFIED`. Đảm bảo các rào cản bên ngoài (Meitu API Key thiếu &rarr; 503 BLOCKED, Worker Adapter thiếu &rarr; 501 NOT_IMPLEMENTED) được cách ly minh bạch trong `BLOCKERS.md`.

#### 3. Software Architect
- **Source**: `.agents/skills/agency-software-architect/SKILL.md`
- **Assignment**: Audit kiến trúc xử lý ảnh (`ImageEngine.ts`, `WebGLWarpEngine.ts`), hệ tọa độ chuẩn hóa, tỉ lệ co giãn độ phân giải (Resolution Parity).
- **Findings & Decisions**: Kiểm tra tỷ lệ scale $\frac{\max(W, H)}{800}$ trên canvas export 4000x3000. Shader WebGL sử dụng metric space $(tc.x \cdot \text{aspect}, tc.y)$ để tính khoảng cách Euclid đẳng hướng, ngăn biến dạng bất thường trên ảnh ngang/dọc. Downsample từ 4000x3000 về 800px đạt PSNR 46.36 dB, chứng minh tính độc lập độ phân giải.

#### 4. AI Engineer
- **Source**: `.agents/skills/agency-ai-engineer/SKILL.md`
- **Assignment**: Audit mô hình MediaPipe Face Landmarker (478 điểm) và Image Segmenter (Hair mask Category 1); kiểm tra vector lực nâng nọng cằm và thiết kế giải thuật cho B039 (Teeth Whitening) và B021 (Eye Enlargement).
- **Findings & Decisions**: Xác nhận 478 landmarks thật được nhận diện trên 3 ảnh chân dung thật. Dot product của vector dịch chuyển vùng dưới cằm với trục mặt đạt 1.0000 (> 0.95), góc nghiêng mặt khớp 100% ($\Delta = 0.00^\circ$). Thiết kế B039 sử dụng đa giác lòng môi trong để khử sắc vàng $H \in [20^\circ, 70^\circ]$ kèm tăng sáng nhẹ parabol $L(1 - L)$.

#### 5. Frontend Developer
- **Source**: `.agents/skills/agency-frontend-developer/SKILL.md`
- **Assignment**: Kiểm tra luồng Editor UI, cơ chế chống race condition khi tải ảnh nhanh, đồng bộ Undo/Redo với phím và chuột.
- **Findings & Decisions**: Đã có `uploadTokenRef` để hủy promise cũ khi người dùng đổi ảnh liên tục. Event `onKeyUp` và `onMouseUp` trên slider kích hoạt `commitHistory`. Gỡ nhãn `(WIP)` và độ mờ khỏi nút giảm nọng cằm; bổ sung điều hướng danh mục công cụ (Da, Mặt, Tóc, AI).

#### 6. Backend Architect
- **Source**: `.agents/skills/agency-backend-architect/SKILL.md`
- **Assignment**: Audit API contracts, vòng đời job backend, bảo vệ chống ghi đĩa tùy ý và cô lập file upload.
- **Findings & Decisions**: Đã gỡ bỏ vĩnh viễn endpoint `/api/save-test-artifacts` khỏi `apps/server/src/index.ts`. Bổ sung kiểm tra `isAiAdapterImplemented()` trả HTTP 501 `NOT_IMPLEMENTED`. Multer `fileFilter` và cơ chế unlink tự động dọn sạch file upload khi bị chặn.

#### 7. UI Designer
- **Source**: `.agents/skills/agency-ui-designer/SKILL.md`
- **Assignment**: Audit hệ thống thiết kế "Super Travel" visual tokens: background `#fdf8f3`, accent `#e4a4bd`, primary text `#262626`, font `League Spartan`.
- **Findings & Decisions**: Đảm bảo hiệu ứng marketing grayscale(100%) chỉ áp dụng trên thẻ ảnh gallery ngoài Landing; canvas trong Editor, Before/After split view và ảnh Export luôn giữ 100% true color, không bị ảnh hưởng bởi CSS trang trí.

#### 8. UX Researcher
- **Source**: `.agents/skills/agency-ux-researcher/SKILL.md`
- **Assignment**: Đánh giá độ khả dụng, nhãn công cụ tiếng Việt rõ ràng, touch targets $\ge 44\text{px}$, minh bạch hóa việc gửi ảnh lên cloud.
- **Findings & Decisions**: Thông báo rõ ràng cho người dùng khi chọn công cụ Cloud AI; chặn nhận job khi chưa có key thay vì để trạng thái treo không rõ nguyên nhân.

#### 9. API Tester
- **Source**: `.agents/skills/agency-api-tester/SKILL.md`
- **Assignment**: Viết và chạy suite kiểm thử backend tự động có scoped cleanup (`apps/server/src/test_server_jobs.ts`).
- **Commands & Results**: `npm test --workspace=apps/server` &rarr; 4/4 test cases pass: 503 BLOCKED, 501 NOT_IMPLEMENTED, 202 pending, 200 GET job. Scoped cleanup chỉ xóa file do test tạo ra.

#### 10. Evidence Collector
- **Source**: `.agents/skills/agency-evidence-collector/SKILL.md`
- **Assignment**: Thu thập artifacts trực quan từ Headless Chrome và lập chỉ mục bằng chứng truy xuất được.
- **Output & Evidence**: 11 file PNG được trích xuất trực tiếp từ DOM canvas và lưu tại `docs/test_artifacts/` kèm `test_report.json` ghi nhận 17 chỉ số định lượng.

#### 11. Performance Benchmarker
- **Source**: `.agents/skills/agency-performance-benchmarker/SKILL.md`
- **Assignment**: Đo lường sai số định lượng và hiệu năng xử lý ảnh preview 800px vs export 4000x3000.
- **Findings**: MAE = 0.470 / 255 (< 4.0), PSNR = 46.36 dB (> 34.0 dB). Thời gian build production web (`vite build`) đạt 298ms.

#### 12. DevOps Automator
- **Source**: `.agents/skills/agency-devops-automator/SKILL.md`
- **Assignment**: Hoàn thiện scripts tái lập tại root `package.json` (`npm run build`, `npm test`), kiểm tra clean build cả server và web.
- **Commands & Results**: `npm run build` (0 lỗi), `npm test` (0 lỗi). Quản lý file `.gitignore` và `.gitmodules` sạch sẽ.

#### 13. Reality Checker
- **Source**: `.agents/skills/agency-reality-checker/SKILL.md`
- **Assignment**: Review nghiệm thu độc lập; phát hiện và loại bỏ các tuyên bố chưa đủ bằng chứng.
- **Verdict**:
  - `B001`, `B005`, `B011`, `B019`: **ACCEPT** cho phạm vi kiểm chứng toán học và hình học trên ảnh thật.
  - Trạng thái công cụ: **REJECT** việc nâng lên `VERIFIED` sớm. Khóa toàn bộ ở trạng thái **`IMPLEMENTED_UNVERIFIED`** cho đến khi hoàn thành nghiệm thu toàn diện cuối cùng.
  - `Backend Security`: **ACCEPT** việc tách `/api/save-test-artifacts` và trả 501 `NOT_IMPLEMENTED`.

---

## Batch: BATCH-002-ENGINE-EXPANSION-PRESETS-AND-UI (2026-10-02)

| Field | Chi tiết |
|---|---|
| **Batch ID** | `BATCH-002-ENGINE-EXPANSION-PRESETS-AND-UI` |
| **Feature / Bug IDs** | `BUG-001` (Cross-platform runner), `BUG-002` (Server upload limits & capabilities), `BUG-003` & `BUG-007` (WebGL dispose), `BUG-004` (UI categories), `BUG-006` (Teeth Whitening B043), `BUG-007` (Eye Enlargement B025), `X024` (200 Curated Filters), `X026` (12 Poster Templates), `X018`-`X020` (Basic Adjustments), Before/After comparison |
| **Execution Mode** | **Sequential Pass (Single-Agent Runtime - Sequential Self-Review)** |
| **Role Instruction Sources** | `.agents/skills/agency-*/SKILL.md`, `C:\Users\khiem.nguyen\.gemini\config\skills\agent-reach\SKILL.md`, `.agents/skills/karpathy-guidelines/SKILL.md` |

### Chi tiết các Role Passes:

#### 1. Agents Orchestrator
- **Assignment**: Điều phối giải quyết toàn bộ 8 bugs trong bug queue, tích hợp thư viện 200 bộ lọc màu nghệ thuật và 12 mẫu bìa/poster, đồng bộ hóa release gates.
- **Decisions**: Thực thi trọn gói từ Backend đến WebGL Shader, Image Engine, Presets và React UI Editor. Giữ nguyên tắc Karpathy: thay đổi phẫu thuật (surgical), kiểm thử có thể đo lường và xác minh.

#### 2. Project Shepherd
- **Assignment**: Đồng bộ bảng đặc tả `FEATURES.md`, cập nhật `AUDIT_REPORT.md` sang trạng thái `VERIFIED` cho các bugs đã sửa triệt để.
- **Findings**: Tất cả 8 bugs (BUG-001 đến BUG-008) đã được xử lý và kiểm chứng bằng test suite thật.

#### 3. Software Architect
- **Assignment**: Thiết kế phương thức `.dispose()` trong `WebGLWarpEngine` và `ImageEngine` để giải phóng WebGL context, textures, buffers, program và reset canvas memory; thiết kế shader mở rộng đa chế độ (directional shift, radial bulge, radial pinch).
- **Output**: Thêm uniform `u_modes[10]` vào fragment shader; thêm `.dispose()` giải phóng tài nguyên GPU.

#### 4. AI Engineer
- **Assignment**: Triển khai giải thuật B025 Phóng to mắt tự nhiên (Radial Bulge Warp $R \approx 1.15 W_{\text{eye}}$ tâm con ngươi) và B043 Làm trắng răng (Inner mouth landmark mask, chuyển đổi HSL, khử bão hòa màu vàng $H \in [20^\circ, 75^\circ]$, tăng nhẹ độ sáng).
- **Output**: `applyEyeEnlargement()` và `applyTeethWhitening()` trong `ImageEngine.ts`.

#### 5. Backend Architect
- **Assignment**: Cấu hình Multer upload limit 25MB (`limits.fileSize`), middleware bắt lỗi 413, endpoint `GET /api/capabilities` thông báo năng lực máy chủ cho frontend, bổ sung `ownershipToken` bảo vệ quyền sở hữu job.
- **Output**: Cập nhật `apps/server/src/index.ts`, test suite `apps/server/src/test_server_jobs.ts` đạt 5/5 tests.

#### 6. UI Designer
- **Assignment**: Xây dựng 200 công thức màu nghệ thuật phân bổ trên 6 danh mục (Film 35, Chân dung 35, Điện ảnh 35, Cổ điển 30, Thiên nhiên 35, Nghệ thuật 30) trong `apps/web/src/presets/filters.ts`; thiết kế 12 mẫu bìa tạp chí, poster điện ảnh và polaroid trong `apps/web/src/presets/templates.ts`.
- **Output**: Thư viện preset hoàn chỉnh với thông số toán học màu chính xác (không dùng placeholder hoặc duplicate).

#### 7. Frontend Developer
- **Assignment**: Tái cấu trúc `Editor.tsx` và `context.tsx` mở rộng đầy đủ các tab danh mục công cụ tiếng Việt (Da, Mặt, Mắt, Môi & Răng, Tóc, Chỉnh màu, 200+ Bộ lọc, 12 Mẫu bìa, Cloud AI); tích hợp nút so sánh Trước / Sau (Before / After view) dạng nhấn giữ; dọn dẹp WebGL instance khi unmount hoặc đổi ảnh.
- **Output**: Hoàn thiện `apps/web/src/components/Editor.tsx` và `apps/web/src/types.ts`.

#### 8. API Tester
- **Assignment**: Bổ sung Test 5 kiểm tra endpoint `GET /api/capabilities` trong `test_server_jobs.ts`; kiểm tra phản hồi JSON, giới hạn 25MB và danh sách tools được hỗ trợ.
- **Commands & Results**: `cmd.exe /c npm.cmd test --workspace=apps/server` &rarr; 5/5 PASSED.

#### 9. Evidence Collector
- **Assignment**: Chạy test runner trực quan trên Headless Chrome (`node scripts/run_visual_verification.js`) thu thập artifacts từ DOM canvas.
- **Output**: 11 file PNG artifacts thật tại `docs/test_artifacts/`, `test_report.json` xác nhận vector nọng cằm đạt 1.0000, độ lệch góc 0.00°, bảo vệ môi và viền cổ 0.0000, parity PSNR 46.36 dB.

#### 10. Performance Benchmarker
- **Assignment**: Đo lường thời gian build production (`npm run build`), kiểm tra kích thước bundle và thời gian thực thi test.
- **Findings**: `vite build` hoàn tất trong 295ms (Gzip: CSS 2.31 kB, JS 140.85 kB). Test visual suite hoàn tất trong ~12s.

#### 11. DevOps Automator
- **Assignment**: Viết hàm `detectChromeBinary()` trong `scripts/run_visual_verification.js` hỗ trợ tự dò tìm Chrome, Chromium, Edge trên Windows, Linux/CI, macOS và PATH fallback; đảm bảo script chạy mượt mà từ clean checkout.
- **Output**: Test suite chạy tự động phát hiện `C:\Program Files\Google\Chrome\Application\chrome.exe` và thoát mã 0.

#### 12. Reality Checker
- **Assignment**: Kiểm tra độc lập mã nguồn, build logs, DOM output, metrics JSON và bug queue.
- **Verdict**:
  - BUG-001 đến BUG-008: **ACCEPT** - Tất cả các lỗi kỹ thuật đã được vá và kiểm chứng.
  - Build & Lint: **ACCEPT** - `npm run build` và `npm run lint` đạt 0 errors.
  - Release Scope: **NEEDS_WORK** - Tuyệt đối không chấp nhận báo cáo "hoàn tất hệ thống" hay "production ready" khi chưa có kết quả kiểm tra toàn diện, tests thực tế, và đồng bộ ledger. Giữ trạng thái `IMPLEMENTED_UNVERIFIED`, rút mọi tuyên bố hoàn tất sớm.

---

## Batch: BATCH-003-SECURITY-REGRESSION-TEMPLATES-DRAFTS (2026-10-02)

| Field | Chi tiết |
|---|---|
| **Batch ID** | `BATCH-003-SECURITY-REGRESSION-TEMPLATES-DRAFTS` |
| **Feature / Bug IDs** | Backend Security (Processor Registry, Ownership Token, Private Storage, 413 Real Upload), AI Engine & Evidence (Double-Chin Fixture, Output-Render Displacement, Regression Sensitivity, Natural Aspect Ratio Parity, Real UI Export & Reopen), Frontend (Editable Templates, Filter Recipes with Temp/Tint, Blemish Brush B002, Body Slim B070, Crop Tool B090, Collage Maker X025, IndexedDB Drafts I005) |
| **Execution Mode** | **Sequential Pass (Single-Agent Runtime - Sequential Self-Review)** |
| **Role Instruction Sources** | `.agents/skills/agency-*/SKILL.md`, `C:\Users\khiem.nguyen\.gemini\config\skills\agent-reach\SKILL.md`, `.agents/skills/karpathy-guidelines/SKILL.md` |

### Chi tiết các Role Passes (Sequential Self-Review):

#### 1. Agents Orchestrator
- **Assignment**: Chỉ đạo toàn bộ quy trình audit → implement → verify theo chỉ đạo review HEAD 787837f; loại bỏ mọi định kiến "production ready"; đồng bộ hóa nghiêm ngặt các mảng Backend, AI, Frontend, QA và Ledger.
- **Decisions**: Yêu cầu kiểm thử thực tế bằng payload thật, ảnh thật, đo pixel output thật. Mọi sequential pass phải được ghi nhận trung thực là sequential self-review.

#### 2. Project Shepherd & Reality Checker
- **Assignment**: Đối chiếu lại toàn bộ Ledger (`FEATURES.md`) với source code và test evidence thực tế; rà soát 0 VERIFIED, hạ mọi mục chưa hoàn tất về trạng thái đúng (`PLANNED` hoặc `IMPLEMENTED_UNVERIFIED`).
- **Findings & Actions**: 
  - Đã rà soát: 0 tính năng được đóng dấu VERIFIED trước nghiệm thu toàn diện độc lập.
  - Triển khai code thực tế cho B002 (Blemish Healing Brush), B070 (Body Waist Slim), B090 (Crop Tool), X025 (Collage Maker), X026 (Editable Templates), I005 (IndexedDB Drafts).
  - Tuyệt đối không dùng tên tab hay preset làm bằng chứng hoàn thành tính năng.

#### 3. Backend Architect & API Tester
- **Assignment**: Bỏ readiness dựa trên `ENABLE_AI_WORKER`. Xóa bỏ kẽ hở pending vô hạn. Thực thi `ownershipToken` bảo vệ job và private storage; kiểm thử cross-session denial; kiểm thử upload vượt 25MB bằng dữ liệu thật.
- **Implementation & Results**:
  - Xây dựng `JobProcessor` registry trong `apps/server/src/index.ts`. Khi chưa có worker/processor thực tế đăng ký, trả ngay HTTP 501 `NOT_IMPLEMENTED`.
  - Khởi tạo `ownershipToken` (UUIDv4) cho mỗi job được chấp nhận. Bắt buộc cung cấp `ownershipToken` khi query `GET /api/jobs/:id` (trả 403 nếu thiếu hoặc sai token).
  - Thay thế static public upload bằng authenticated private storage endpoint `GET /api/files/:filename`, yêu cầu `ownershipToken` hợp lệ (trả 403 nếu không có quyền).
  - Chạy test suite `apps/server/src/test_server_jobs.ts`:
    - Test 1 (Thiếu API Key): 503 BLOCKED, 0 file lưu &rarr; PASS.
    - Test 2 (Có key, chưa có processor): 501 NOT_IMPLEMENTED, 0 file lưu &rarr; PASS.
    - Test 3 (Có key, có processor): 202 accepted với ownershipToken, xử lý pending &rarr; completed &rarr; PASS.
    - Test 4 (Cross-session denial): Không token hoặc sai token trả 403 FORBIDDEN &rarr; PASS.
    - Test 5 (Private storage authorization): Truy cập file trái phép trả 403 FORBIDDEN, có token trả 200 &rarr; PASS.
    - Test 6 (Real 26MB upload): Gửi payload buffer thật 26.5MB, server từ chối ngay với HTTP 413 `Payload Too Large` &rarr; PASS.
    - Scoped cleanup dọn sạch đúng 2 file test, bảo toàn 0 file hệ thống &rarr; PASS (6/6 server tests pass).

#### 4. AI Engineer & Evidence Collector
- **Assignment**: Bổ sung ảnh chân dung có nọng cằm rõ nét; đo đạc độ dịch chuyển trực tiếp trên pixel render đầu ra; kiểm tra tính nhạy cảm của regression test khi vô hiệu hóa `applyWarp`; bảo tồn tỷ lệ khung hình tự nhiên (natural aspect ratio); kiểm tra độ trung thực khi UI export và reopen ảnh.
- **Implementation & Results**:
  - Tải ảnh chân dung nọng cằm thật `apps/web/public/fixtures/real_portrait_double_chin.jpg` (1000x1500).
  - Nâng cấp `apps/web/src/test_runner.ts`:
    - Section 1 (4 Real Portraits): MediaPipe nhận diện đủ 478 landmarks. Độ dịch chuyển pixel submental trên ảnh nọng cằm đạt Diff = 53.04 (> 0.5 threshold); độ méo môi = 0.000000; độ méo nền/cổ = 0.000000; vector hướng nâng dot product = 1.0000; độ lệch trục nghiêng $\Delta = 0.00^\circ$.
    - Section 2 (Regression Sensitivity): Bypassing `applyWarp` (mock không dịch chuyển) &rarr; Submental Pixel Diff = 0.0000 (< 0.01 threshold) &rarr; Test phát hiện ngay động cơ warp bị hỏng. Restored engine hoạt động &rarr; Diff = 7.06 &rarr; Regression test chứng minh độ nhạy 100%.
    - Section 3 (Natural Aspect Ratio Parity): Preview 600x899 &harr; Export 2000x2997 (tỷ lệ chuẩn 2:3, zero stretching). Parity MAE = 0.503 (< 4.0 / 255), PSNR = 48.85 dB (> 34.0 dB).
    - Section 4 (Real UI Export & Reopen Fidelity): Xuất PNG gốc và reopen ảnh bằng `Image`. Kích thước khớp 100% (2000x2997). MAE = 0.0000, PSNR = 99.0 dB &rarr; Lossless fidelity được xác nhận.
  - Lưu trữ 14 file PNG artifacts thật tại `docs/test_artifacts/` kèm `test_report.json`.

#### 5. Frontend Developer & UI Designer
- **Assignment**: Hoàn thiện toàn diện các tính năng còn thiếu: Editable templates, filter recipe đầy đủ (temperature & tint), blemish brush, body slim, crop tool, collage layout maker và IndexedDB drafts.
- **Implementation & Results**:
  - **Editable Templates**: Khi chọn template, hiển thị form chỉnh sửa trực tiếp: Tiêu đề (Title), Phụ đề (Subtitle), Ngày tháng (Date text), Khẩu hiệu (Tagline), Chân trang (Footer credits), Vị trí chữ (Trên / Giữa / Dưới), Tỷ lệ khung (Original, 1:1, 4:5, 3:4, 9:16). Mọi thay đổi render lập tức lên canvas, lưu vào undo/redo history, và xuất ra ảnh đầy đủ độ phân giải với font và vị trí tỷ lệ chuẩn.
  - **Full Filter Recipe**: Thực thi hoàn chỉnh công thức 200+ bộ lọc trong `ImageEngine.ts`: Áp dụng độ sáng, tương phản, độ bão hòa, sepia, kênh màu, vignette, đặc biệt là **Nhiệt độ màu (temperature: ấm/lạnh)** và **Sắc thái (tint: lục/tím)** qua các lớp blend màu chính xác. Bổ sung thanh trượt Tint trong nhóm Chỉnh màu.
  - **Spot Blemish Healing Brush (B002)**: Công cụ chấm cọ xóa mụn trên canvas, nội suy điểm ảnh từ vòng tròn viền ngoài (radial patch synthesis), làm mượt khuyết điểm tự nhiên.
  - **Body Waist Slim (B070)**: Công cụ thon eo co hướng tâm hai bên sườn bằng WebGL bilateral inward warp.
  - **Crop Aspect Ratio (B090)**: Cắt ảnh chuẩn tỷ lệ 1:1 (Instagram), 4:5 (Portrait), 3:4 (Standard), 9:16 (Story/TikTok) trực tiếp trên canvas.
  - **Collage Layout Maker (X025)**: Module ghép ảnh chuyên dụng `apps/web/src/components/CollageMaker.tsx` hỗ trợ 6 bố cục lưới (2 ảnh dọc, 2 ảnh ngang, 3 ảnh hero, 4 ảnh 2x2, 3 ảnh dải phim, 6 ảnh editorial), tải ảnh từng ô, chỉnh khoảng cách ô (gap), bo góc (radius), màu nền và xuất file HD.
  - **IndexedDB Local Drafts (I005)**: Module `apps/web/src/utils/draftStorage.ts` tự động lưu bản thảo (ảnh + editState + history) sau 1.5s chỉnh sửa; hiển thị banner khôi phục khi mở lại trang.
  - Build web production (`tsc -b && vite build`) hoàn tất 0 lỗi trong 305ms.

#### 6. DevOps Automator & Quality Gate
- **Assignment**: Kiểm tra toàn bộ test suite monorepo chạy đồng nhất từ root `package.json`.
- **Command**: `npm test` (bao gồm `npm run test --workspace=apps/server` và `node scripts/run_visual_verification.js`).
- **Result**: TẤT CẢ SERVER TESTS (6/6) VÀ VISUAL TESTS (5/5) ĐỀU PASS 100%. Exit code = 0.

---

## Batch: BATCH-003-FACE-EYE-GEOMETRY-AND-CI (2026-10-02)

| Field | Chi tiết |
|---|---|
| **Batch ID** | `BATCH-003-FACE-EYE-GEOMETRY-AND-CI` |
| **Feature IDs** | `B012` (Reduce eye bags), `B014` (Face width), `B015` (Jaw angle), `B018` (Chin length), `B020` (Cheekbone width), `B026` (Eye height), `B027` (Eye length), `B029` (Eye color / contact lens), `B032` (Eyelid lift), `B033` (Double eyelid crease) |
| **Execution Mode** | Autonomous Dev &harr; Hard QA Loop with Karpathy Guidelines. Single-agent runtime orchestration. |
| **Status Result** | 10/10 features IMPLEMENTED_UNVERIFIED. 0 VERIFIED strictly locked. |

### Chi tiết các Role Passes:

#### 1. Agents Orchestrator & Project Shepherd
- **Source**: `.agents/skills/agency-agents-orchestrator/SKILL.md`, `.agents/skills/agency-project-shepherd/SKILL.md`
- **Assignment**: Chọn batch tính năng hình học khuôn mặt và mắt kế tiếp (B012, B014, B015, B018, B020, B026, B027, B029, B032, B033); giám sát luồng 14 tầng từ types, state, engine, UI, preview, export, draft persistence đến test sensitivity và GitHub CI.
- **Decisions**: Khóa chặt quy tắc 0 VERIFIED; giữ nguyên baseline `a793c2b` không để hồi quy 11 hiệu ứng trước đó; loại bỏ mọi stub giả lập hay TODO.

#### 2. Software Architect & AI Engineer
- **Source**: `.agents/skills/agency-software-architect/SKILL.md`, `.agents/skills/agency-ai-engineer/SKILL.md`
- **Assignment**: Thiết kế các giải thuật biến dạng hình học WebGL và Canvas 2D dựa trên 478 MediaPipe landmarks:
  - `B012` (Eye Bags): WebGL upward sub-orbital warp + luminance groove fill nâng sáng rãnh trũng.
  - `B014` (Face Width): WebGL bilateral pinch/expand warp tại thái dương [127, 356] (bidirectional slider -100 đến 100).
  - `B015` (Jaw Angle): WebGL bilateral warp tinh chỉnh góc hàm mandibular [172, 397].
  - `B018` (Chin Length): WebGL directional vertical warp dọc trục mặt từ môi đến đỉnh cằm [152] (bidirectional -100 đến 100).
  - `B020` (Cheekbone Width): WebGL inward pinch warp tại xương gò má zygomatic arches [116, 345].
  - `B026` (Eye Height): WebGL vertical eye stretch tách biệt mí trên [159, 386] và mí dưới [145, 374].
  - `B027` (Eye Length): WebGL lateral canthus extension tại khóe mắt ngoài [33, 263].
  - `B029` (Eye Color / Lens): Canvas 2D annular radial gradient từ viền con ngươi (0.36r) tới bờ ngoài mống mắt (0.85r - 1.0r) với soft-light blend mode, bảo toàn con ngươi và catchlight, không lem ra sclera hay mi mắt.
  - `B032` (Eyelid Lift): WebGL upward lid apex warp tại đỉnh mí trên [159, 386].
  - `B033` (Double Eyelid): Canvas 2D parabolic crease shadow và viền highlight mềm mại theo đường cong mi trên.
- **Parity & Architecture**: Tích hợp toàn bộ vào `applyPipeline` với trật tự giải phẫu chuẩn: Geometry &rarr; Skin &rarr; Makeup/Eyes. Chuẩn hóa hỗ trợ `NormalizedLandmark[]` và `NormalizedLandmark[][]`.

#### 3. Frontend Developer & UI Designer
- **Source**: `.agents/skills/agency-frontend-developer/SKILL.md`, `.agents/skills/agency-ui-designer/SKILL.md`
- **Assignment**: Thêm đầy đủ slider điều khiển trong UI Editor (Skin, Face, Eyes), bảng swatch màu lens mắt (nâu tây, xám khói, xanh ngọc, nâu hạt dẻ, xanh navy), tích hợp slider 2 chiều (-100 đến 100 cho bề rộng mặt và độ dài cằm), đồng bộ Undo/Redo, Category Reset và IndexedDB Drafts.

#### 4. Evidence Collector & Reality Checker
- **Source**: `.agents/skills/agency-evidence-collector/SKILL.md`, `.agents/skills/agency-reality-checker/SKILL.md`
- **Assignment**: Đo lường định lượng và kiểm tra độc lập tính xác thực:
  - Kiểm tra Zero-intensity bypass: Toàn bộ 21 hiệu ứng (Batch 1 + Batch 2) đều có MAE = 0.0000 khi slider = 0.
  - Kiểm tra Positive delta: Mọi hiệu ứng tạo ra độ biến thiên thực tế rõ ràng (ví dụ: B018 chin_length MAE = 0.3113, B026 eye_height MAE = 0.2444, B032 eyelid_lift MAE = 0.2538 với ROI MAE = 3.1201).
  - Kiểm tra ROI Protection: B029 eye_color bên ngoài hốc mắt = 0.0000, B033 double_eyelid ngoài vùng mi = 0.0000.
  - Preview/Export Parity: Preview 400px so với Export 800px downsample đạt MAE = 0.554 (< 4.0 / 255) và PSNR = 38.37 dB (> 34.0 dB).
  - Real Portrait Regression: 4 ảnh chân dung thật (chính diện, nghiêng, râu, nọng cằm) với 478 landmarks MediaPipe đều đạt submental lift, 0.0000 distortion môi/nền, parity PSNR 48.85 dB.
  - Báo cáo lưu tại: `docs/test_artifacts/new_effects_sensitivity_report.json` và `docs/test_artifacts/new_effects_code_verification.json`.

#### 5. DevOps Automator
- **Source**: `.agents/skills/agency-devops-automator/SKILL.md`
- **Assignment**: Thiết lập pipeline GitHub Actions CI độc lập (`.github/workflows/ci.yml`), tích hợp các stage: Install &rarr; Typecheck &rarr; Lint &rarr; Build &rarr; Server Tests &rarr; Code Verification.
- **Verification Commands**:
  - `npm run typecheck`: 0 errors (web & server).
  - `npm run lint`: 0 errors.
  - `npm run build`: Web & server built successfully.
  - `npm run test:server`: 6/6 server tests pass.
  - `node scripts/verify_new_effects.js`: 21/21 code structure & wiring verification PASS.
  - `npm run test:visual`: 100% PASS trên 4 chân dung thật.



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

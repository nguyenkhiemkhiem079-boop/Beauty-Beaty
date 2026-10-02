# SKILLS MANIFEST

Bảng liệt kê các kỹ năng (skills) và agent workflow đã được kích hoạt trong dự án D'Beaty.

## 1. Cơ sở hạ tầng Agent (Agent Infrastructure)
- **Hệ thống Agent**: Google Antigravity (AGY) Autonomous Agent.
- **Mô hình hoạt động**: End-to-end Autonomous Execution (Agent-Reach paradigm). Cho phép agent tự đọc Master Prompt, tự lên kế hoạch (PLAN.md), tự rà soát file (ImageEngine.ts, Editor.tsx) và tự thực hiện vòng lặp "Lập trình - Build - Sửa lỗi" (Self-Healing) mà không cần sự can thiệp chi tiết từng dòng lệnh của người dùng.
- **Bằng chứng sử dụng (Evidence)**: 
  - Toàn bộ source code từ M0 đến M5 được khởi tạo và commit tự động qua hệ thống tool `run_command`, `write_to_file`, `multi_replace_file_content`.
  - Quá trình tự động sửa lỗi (Bug fix) vòng lặp `npm run build -> detect error -> fix` trong M3 và M5.
  - Phân tích ngược (Reverse engineering) lỗi `tc.x += shift` làm mặt phình to sang `tc -= shift` (Inverse mapping) để làm thon gọn.

## 2. Kỹ năng kỹ thuật (Technical Skills)
- **Computer Vision (MediaPipe)**: Sử dụng mô hình `face_landmarker.task` và `selfie_multiclass.tflite` qua `@mediapipe/tasks-vision@1.0.1`. Agent đã triển khai xử lý bất đồng bộ, CPU fallback, và ánh xạ pixel từ mask sang ảnh.
- **Computer Graphics (WebGL / GLSL)**: Xây dựng custom shader cho phép Pinch Warp ngược, tính toán vector distance từ tâm hai má tới mũi.
- **Frontend Architecture**: Khởi tạo cấu trúc Component hóa (React), Context API quản lý lịch sử (Undo/Redo stack handling), và Web APIs (ObjectURL revocation, HTMLCanvasElement manipulation).

## 3. Quản lý dự án (Project Management)
- Tự động duy trì trạng thái 82 tính năng tại `FEATURES.md`.
- Ghi log liên tục tại `AGENT_ACTIVITY.md`.
- Giám sát blocker và dependencies.

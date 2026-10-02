# D'Beaty Plan

## Mốc thực hiện (Milestones)

- **M0**: Repo (TypeScript monorepo), cài đặt môi trường, thiết lập CI cơ bản, kiểm tra license các model.
- **M1**: Landing page cơ bản (Super Travel style) + Luồng Import ảnh -> Editor -> Export ảnh.
- **M2**: Spike 4 tính năng beauty P0 (mịn da, mượt tóc, thon mặt, giảm nọng cằm). 
- **M3**: Engine xử lý ảnh (canvas/WebGL2/Workers), quản lý mask, warp, undo/redo lịch sử, so sánh before/after.
- **M4**: Hoàn thiện UI Premium (League Spartan, theme rose/charcoal), presets, tích hợp các công cụ mở rộng (P1/P2).
- **M5**: Các chức năng gọi API AI (Art/Restoration/Remove/Background), xử lý lưu trữ job ở server, PWA, local drafts.
- **M6**: QA, tối ưu hóa (performance budgets), deploy, bàn giao.

## Kiến trúc
- **Frontend**: React + TypeScript + Vite. Canvas/WebGL2, Web Workers, IndexedDB cho local drafts.
- **Backend**: Node.js + TypeScript cho các API providers (chỉ khi có API key), lưu trữ SQLite (hoặc Postgres nếu cần).
- **Monorepo**: dùng npm workspaces (`apps/web`, `apps/api`, `packages/image-engine`, `packages/contracts`, v.v.).

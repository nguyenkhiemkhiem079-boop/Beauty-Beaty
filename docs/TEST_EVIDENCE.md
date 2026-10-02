# Test Evidence

## M2 Checkpoint (Face Landmarker & Engine Spike)

- **Date**: 2026-10-02
- **Command**: `npm run dev:web`
- **Fixture**: Ảnh portrait bất kỳ được upload lên editor.
- **Kết quả mong đợi**: 
  - FaceLandmarker model tải và nhận diện thành công (hiển thị "Faces detected: 1" trên UI).
  - Kéo thanh slider "Mịn da", ảnh áp dụng blur và *bảo vệ vùng mắt, môi* thông qua mask.
  - Kéo thanh slider "Thon mặt", vùng hai bên má co lại (sử dụng 2D slice warp logic).
  - Ấn undo/redo có thể chuyển đổi giữa các trạng thái slider đã commit (onMouseUp).
- **Trạng thái**: Chạy thành công. Cần kiểm tra kỹ hơn độ phân giải mask và nâng cấp warp trong M3.

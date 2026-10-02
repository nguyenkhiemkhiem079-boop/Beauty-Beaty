# REQUIREMENT LEDGER — DANH MỤC TÍNH NĂNG D'BEATY

Bảng đối chiếu chuẩn hóa theo Master Plan A2 (`Beauty_App_Antigravity_Master_Plan_Prompt.md`). Bao gồm đầy đủ 82 công cụ Beauty chuẩn, các công cụ bổ sung X-prefixed và cơ sở hạ tầng I-prefixed.

**Quy ước trạng thái (Statuses):**
- `PLANNED`: Đang trong backlog kế hoạch, chưa viết code.
- `IN_PROGRESS`: Đang viết code, chưa hoàn thiện luồng hoặc chưa qua test.
- `IMPLEMENTED_UNVERIFIED`: Đã có code thực thi, vượt qua kiểm thử kỹ thuật định lượng, nhưng giữ trạng thái chờ nghiệm thu toàn diện cuối cùng (theo nguyên tắc Reality Checker).
- `VERIFIED`: Đã qua nghiệm thu toàn diện độc lập với đầy đủ bằng chứng output thực tế.
- `FAILED_QUALITY`: Thuật toán không đạt chuẩn chất lượng hình ảnh thực tế.
- `BLOCKED_EXTERNAL`: Bị chặn bởi điều kiện tiên quyết bên ngoài (ví dụ: thiếu API Key có phí từ bên thứ ba).

### Bảng Đối Chiếu Hiện Trạng Ledger (Reality Checker & Project Shepherd Reconciliation):

| Trạng thái | Số lượng | Tỷ lệ | Diễn giải |
|---|---|---|---|
| **`VERIFIED`** | **0** | **0%** | **Tuyệt đối khóa 0 VERIFIED** cho đến khi nghiệm thu toàn diện độc lập cuối cùng, không có ngoại lệ. |
| **`IMPLEMENTED_UNVERIFIED`** | **51** | **43.2%** | Đã có code thực thi và test định lượng. Thêm mới trong commit f58e2c8: B005, B006, B008, B010, B011, B016, B017, B028, B034, B064, X006 (11 effects) — engine implementations + UI sliders đầy đủ, pipeline wired. |
| **`PLANNED`** | **61** | **51.7%** | Backlog tính năng chuyên sâu chưa có mã nguồn hoặc đang chuẩn bị giải thuật. |
| **`BLOCKED_EXTERNAL`** | **6** | **5.1%** | Phụ thuộc Meitu API Key / Cloud Worker trả phí (B031, B044, B062, X010, X011, I006). |
| **TỔNG CỘNG** | **118** | **100%** | Bao gồm 82 công cụ Beauty B001-B082, 27 tính năng mở rộng X-prefixed, 9 thành phần hạ tầng I-prefixed. |

---

## 1. Da (Skin: B001 – B012)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B001** (P0) | Mịn da giữ texture | Làm mịn vùng da bằng Alpha Mask, đục lỗ bảo vệ mắt/môi/mày/tóc, hòa trộn với ảnh gốc theo intensity. Bán kính blur scale theo độ phân giải. | Slider "Mịn da tự nhiên" (Nhóm Da) | Canvas 2D + MediaPipe Face Mesh & Segmenter | MediaPipe FaceLandmarker, Segmenter | Ảnh JPEG/PNG có khuôn mặt | Vùng da mịn, bảo vệ texture mắt, môi, lông mày, tóc; không blur toàn ảnh. | `scripts/run_visual_verification.js`, artifacts tại `docs/test_artifacts/` | `IMPLEMENTED_UNVERIFIED` | Tích hợp thêm fine-tuning tần số cao (frequency separation) nếu cần |
| **B002** | Xóa mụn bằng chạm/cọ | Chấm/vẽ cọ lên nốt mụn, nội suy điểm ảnh từ viền ngoài (Poisson / patch inpainting cục bộ) | Cọ chấm xóa mụn (Nhóm Da) | Canvas 2D Patch Inpainting | Người dùng tương tác cọ | Tọa độ click/brush trong vùng da | Vùng mụn biến mất, biên hòa trộn mượt, không để lại vết quầng thâm | Unit test inpainting patch + Canvas test | `IMPLEMENTED_UNVERIFIED` | Mở rộng cọ thủ công trên UI Editor |
| **B003** | Giảm đốm và khuyết điểm nhỏ | Tự động phát hiện đốm sắc tố có độ tương phản cao trên nền da và làm mềm cục bộ | Slider "Giảm đốm thâm" | Local bilateral filter trên mask da | FaceLandmarker | Vùng da mặt | Giảm vết thâm nhỏ mà không xóa nốt ruồi duyên (beauty mark) | Visual test trên ảnh có tàn nhang nhẹ | `PLANNED` | Triển khai bộ lọc Laplacian of Gaussian (LoG) phát hiện đốm |
| **B004** | Giảm nếp nhăn | Làm mờ rãnh nhăn trán và đuôi mắt bằng bilateral blur có hướng dọc theo nếp nhăn | Slider "Giảm nếp nhăn" | Directional bilateral filter | Landmark trán [10, 67, 297] | Vùng trán và khóe mắt | Nếp nhăn mờ đi tự nhiên, không làm phẳng dẹt khối khuôn mặt | Test trên chân dung trung niên | `PLANNED` | Định vị landmarks vùng trán và rãnh nhăn |
| **B005** | Giảm rãnh cười | Nhận diện nếp gấp mũi má (nasolabial folds) và làm sáng, nâng vùng tối giữa mũi và khóe miệng | Slider "Giảm rãnh cười" | Luminance lift curve theo mask rãnh cười | Landmarks [92, 165, 391, 322] | Vùng rãnh mũi má | Rãnh cười bớt sâu, không làm méo hình dáng khóe miệng | applyNasolabialReduction — brightness lift + mask blur zones | `IMPLEMENTED_UNVERIFIED` | Tinh chỉnh độ feathering vùng rãnh |
| **B006** | Giảm bóng dầu | Khử vùng phản xạ specular highlight quá sáng trên da, đưa về độ sáng trung bình (matte effect) | Slider "Khử bóng dầu" | Selective highlight compression | Skin mask | Vùng da trán, mũi, cằm | Giảm vùng cháy sáng bóng dầu, bề mặt da lì tự nhiên | applyOilReduction — pixel-level luminance threshold per face-oval ROI | `IMPLEMENTED_UNVERIFIED` | Đồng bộ vào pipeline |
| **B007** | Làm đều màu da | Cân bằng sắc tố vùng da đỏ hoặc không đều màu bằng Gaussian smooth kênh sắc màu (Chroma Lab) | Slider "Đều màu da" | Color space transfer (YCbCr / Lab) | Skin mask | Vùng da mặt | Sắc thái da đồng nhất, không lem sang môi và tóc | Histogram test trên kênh a/b | `PLANNED` | Tích hợp chuyển đổi không gian màu Lab |
| **B008** | Điều chỉnh tông da | Chuyển đổi sắc da: Tone ấm, Tone lạnh, Trắng hồng, Da ngăm khỏe qua selective HSL curve | Slider/Picker "Tông da" | HSL curve selective transfer | Skin mask | Vùng da mặt | Thay đổi màu da chính xác theo tone chọn, bảo vệ màu môi và tóc | applySkinToneAdjust — HSL per-pixel shift masked to face oval | `IMPLEMENTED_UNVERIFIED` | Thêm các preset warm/cool trên UI |
| **B009** | Làm sáng vùng da tối | Nâng sáng vùng bóng tối (shadow lift) trên khuôn mặt bằng đường cong gamma cục bộ | Slider "Sáng da" | Parabolic curve $L + k L(1-L)$ | Skin mask | Toàn bộ da | Vùng tối sáng lên rõ nét, không cháy vùng sáng sẵn có | Contrast preservation test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào pipeline |
| **B010** | Khôi phục chi tiết da | Thêm lớp vi hạt (subtle high-pass grain) trên nền da sau khi làm mịn để giữ cảm giác da thật | Slider "Chi tiết da" | High-pass filter blend overlay | Original canvas + work canvas | Vùng da đã làm mịn | Da mịn nhưng vẫn rõ chân lông vi mô tự nhiên | applySkinDetail — soft-light high-pass overlay | `IMPLEMENTED_UNVERIFIED` | Kết hợp với B001 |
| **B011** | Giảm quầng thâm | Khử sắc tố xanh/tím và tăng độ sáng ở vùng da dưới mắt | Slider "Trị thâm mắt" | Selective color lift dưới mắt | Landmarks [111, 117, 340, 346] | Vùng bọng dưới mắt | Quầng thâm sáng lên, hòa nhập màu với gò má | applyDarkCircleReduction — brightness+desat per landmark zone | `IMPLEMENTED_UNVERIFIED` | Tinh chỉnh vị trí bọng mắt |
| **B012** | Giảm bọng mắt | Co nhẹ vùng bọng mỡ dưới mí dưới bằng WebGL warp ngược hướng lên trên | Slider "Giảm bọng mắt" | WebGL Inverse Warp | Landmarks mi dưới | Hốc mắt dưới | Vùng phồng dưới mắt xẹp tự nhiên, không co tròng mắt | Landmark delta test | `PLANNED` | Định nghĩa warp points mi dưới |

---

## 2. Khuôn mặt (Face: B013 – B024)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B013** (P0) | Thon mặt tổng thể | Bóp gọn hai bên má hướng về trục trung tâm mũi bằng WebGL GLSL Inverse Mapping Pinch | Slider "Thon mặt (V-Line)" | WebGLWarpEngine | Landmarks má [234, 454] và mũi [1] | Ảnh có mặt chính diện/nghiêng | Má thon vào tâm, nền ngoài biên hàm không gãy, biên độ co giãn mượt $C^1$ | `test_runner.ts`, test artifacts | `IMPLEMENTED_UNVERIFIED` | Duy trì và mở rộng thêm điểm hàm |
| **B014** | Bề rộng khuôn mặt | Co giãn tỉ lệ ngang toàn bộ hai bên thái dương và xương gò má | Slider "Bề rộng mặt" | WebGL Bilateral Pinch Warp | Landmarks [127, 356] | Toàn bộ chiều ngang mặt | Mặt hẹp lại hoặc mở rộng cân đối | Geometric distance test | `PLANNED` | Cấu hình warp points thái dương |
| **B015** | Quai hàm | Tinh chỉnh góc xương quai hàm (mandibular angle) | Slider "Góc quai hàm" | WebGL Bilateral Warp | Landmarks [172, 397] | Góc hàm hai bên | Đường quai hàm sắc nét hoặc mềm mại theo ý muốn | Jaw angle measurement test | `PLANNED` | Thêm warp points góc hàm |
| **B016** | Định hình đường hàm | Nâng và vuốt thẳng đường viền hàm dưới từ cằm tới mang tai | Slider "Định hình hàm" | WebGL Contour Pinch Warp | Landmarks xương hàm [148, 377] | Viền xương hàm | Đường viền hàm gọn, loại bỏ mỡ thừa chảy xệ | applyJawContour — WebGL bilateral inward jaw pinch | `IMPLEMENTED_UNVERIFIED` | Kết hợp với giảm nọng cằm |
| **B017** | Cằm V-line | Thu hẹp đỉnh cằm và hai bên cằm tạo hình chữ V thanh thoát | Slider "Cằm V-Line" | WebGL Pinch Warp | Landmarks cằm [152, 176, 400] | Đỉnh cằm | Cằm nhọn và thanh tú hơn, không nhọn hoắt dị thường | applyChinVLine — WebGL pinch toward menton | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào warp points |
| **B018** | Chiều dài cằm | Kéo dài hoặc thu ngắn đỉnh cằm theo trục thẳng đứng của mặt | Slider "Độ dài cằm" | WebGL Directional Warp | Landmark Menton [152] | Đỉnh cằm | Cằm dài ra hoặc ngắn lại theo trục mặt, tỷ lệ 1/3 dưới cân đối | Menton displacement test | `PLANNED` | Thêm warp dọc cằm |
| **B019** (P0) | Giảm nọng cằm | Nâng mô mỡ dưới cằm lên xương hàm theo trục nghiêng mặt, bảo vệ môi dưới và viền cổ | Slider "Giảm nọng cằm" | WebGL Submental Warp | Landmarks cằm [152], môi [17], hàm [148, 377] | Vùng dưới cằm và cổ | Vector nâng hướng thẳng lên xương hàm (dot > 0.95), tilt khớp 100%, 0.0000 méo môi/nền | `scripts/run_visual_verification.js`, 11 PNG artifacts | `IMPLEMENTED_UNVERIFIED` | Tiếp tục giữ vững và benchmark |
| **B020** | Độ rộng gò má | Thu nhỏ độ nhô của xương gò má (zygomatic arch) hướng vào trong | Slider "Hạ gò má" | WebGL Pinch Warp | Landmarks gò má [116, 345] | Hai bên gò má | Gò má hạ thấp/thu hẹp, mặt mềm mại bớt góc cạnh | Zygomatic width test | `PLANNED` | Thêm warp points gò má |
| **B021** | Tỷ lệ phần giữa khuôn mặt | Điều chỉnh khoảng cách từ lông mày tới chân mũi (Mid-face ratio) | Slider "Tỷ lệ giữa mặt" | WebGL Vertical Mesh Warp | Landmarks [9, 168, 1, 2] | Vùng giữa mặt | Cân đối tỉ lệ nhân trắc học phần giữa | Proportion test | `PLANNED` | Thiết lập vertical shift |
| **B022** | Tỷ lệ phần dưới khuôn mặt | Điều chỉnh khoảng cách từ chân mũi tới đáy cằm (Lower-face ratio) | Slider "Tỷ lệ dưới mặt" | WebGL Vertical Mesh Warp | Landmarks [2, 164, 152] | Vùng nhân trung và cằm | Tỷ lệ môi cằm hài hòa | Proportion test | `PLANNED` | Thiết lập vertical shift |
| **B023** | Chiều cao trán | Nâng hoặc hạ đường chân tóc để điều chỉnh độ cao trán | Slider "Độ cao trán" | WebGL Vertical Warp + Segmenter | Landmarks trán [10] + Hair mask | Vùng trán trên | Trán cao/thấp theo ý muốn, bảo vệ chân tóc | Forehead height test | `PLANNED` | Tích hợp chân tóc và trán |
| **B024** | Tỷ lệ đầu so với cơ thể | Thu nhỏ kích thước đầu tổng thể tương đối so với vai và thân | Slider "Tỷ lệ đầu/thân" | WebGL Radial Face Contraction | Toàn bộ bounding box mặt | Ảnh có cả đầu và vai | Đầu nhỏ thanh thoát (chuẩn tỉ lệ 8 đầu), nền xung quanh mượt | Overall head scale test | `PLANNED` | Radial contraction mask |

---

## 3. Mắt (Eyes: B025 – B034)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B025** | Kích thước mắt | Phóng to hai mắt bằng WebGL Radial Bulge Warp tại tâm con ngươi | Slider "Mắt to tròn" | WebGL Radial Bulge Warp | Tâm mắt [468, 473], khóe mắt [33, 133, 362, 263] | Hốc mắt hai bên | Mắt to tròn tự nhiên, bán kính $R \le 0.85 W_{\text{eye}}$ bảo vệ chân mày và sống mũi | Radial expansion test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B026** | Chiều cao mắt | Kéo rộng mí trên và mí dưới theo phương thẳng đứng | Slider "Chiều cao mắt" | WebGL Vertical Eye Stretch | Landmarks mi trên & mi dưới | Mí mắt | Mắt mở to theo chiều dọc, lòng đen lộ rõ | Eye aperture test | `PLANNED` | Vertical warp hốc mắt |
| **B027** | Chiều dài mắt | Kéo dài đuôi mắt về phía thái dương | Slider "Độ dài mắt" | WebGL Lateral Eye Warp | Khóe mắt ngoài [33, 263] | Đuôi mắt | Đuôi mắt dài sắc sảo | Eye fissure width test | `PLANNED` | Lateral warp đuôi mắt |
| **B028** | Độ sáng mắt | Tăng độ sáng và tương phản trong lòng trắng mắt (sclera) và tròng mắt | Slider "Sáng mắt" | Canvas 2D Selective Sclera Brighten | Sclera contour mask | Vòng cung lòng trắng | Mắt trong sáng, khử vằn đỏ, không làm đục tròng đen | applyEyeBrightening — brightness+desat masked per eye zone | `IMPLEMENTED_UNVERIFIED` | Tinh chỉnh mask lòng trắng |
| **B029** | Màu mắt/kính áp tròng | Đổi màu mống mắt (Iris tinting) hòa trộn soft-light | Picker "Màu lens" | Canvas 2D Iris Tint Overlay | Iris landmarks [468, 473] | Mống mắt | Màu mắt đổi tự nhiên (nâu tây, xám khói, xanh biển), giữ tia mắt | Color overlay test | `PLANNED` | Thêm bộ màu lens |
| **B030** | Điều chỉnh hướng nhìn | Xoay nhẹ vị trí tròng đen về phía camera hoặc hướng chỉ định | Slider "Hướng nhìn" | WebGL Iris Translation | Iris landmarks | Tròng mắt | Hướng nhìn điều chỉnh tự nhiên, không gây lác | Iris offset test | `PLANNED` | Xoay tròng mắt |
| **B031** | Sửa mắt nhắm bằng AI | Mở mắt nhắm bằng phục dựng AI hoặc copy mắt mở từ ảnh tham chiếu | Nút "Sửa mắt nhắm" | AI Inpainting / Cloud Adapter | Cần AI Provider | Ảnh có mắt nhắm | Mắt mở tự nhiên, đồng nhất với khuôn mặt | Provider response check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |
| **B032** | Nâng vùng mí trong ảnh | Nhấc mí mắt trên lên để mắt đỡ sụp mí | Slider "Nâng mí sụp" | WebGL Upward Warp | Mí trên [159, 386] | Mí trên | Đỡ sụp mí, mắt sáng bừng | Eyelid elevation test | `PLANNED` | Upward warp mí trên |
| **B033** | Tạo nếp mí bằng AI | Kẻ thêm nếp mí đôi (Double eyelid crease) tự nhiên | Toggle/Slider "Mắt 2 mí" | Canvas 2D Crease Shadow + Highlight | Đường viền trên mí mắt | Mắt một mí hoặc mí lót | Nếp mí đôi rõ nét, cong mềm mại theo viền mắt | Contour shadow test | `PLANNED` | Vẽ đường bóng nếp mí |
| **B034** | Thêm điểm sáng trong mắt | Thêm vệt catchlight phản chiếu long lanh trong con ngươi | Toggle/Picker "Điểm sáng mắt" | Canvas 2D Catchlight Stamp | Tâm con ngươi | Con ngươi | Mắt có đốm sáng có hồn, long lanh | applyEyeCatchlight — radial gradient stamped at iris landmarks 468/473 | `IMPLEMENTED_UNVERIFIED` | Stamp catchlight |

---

## 4. Mũi, Môi & Răng (Nose, Lips & Teeth: B035 – B044)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B035** | Kích thước mũi | Thu nhỏ hoặc phóng to toàn bộ khối mũi | Slider "Kích thước mũi" | WebGL Radial Contraction | Tâm mũi [1], chóp [4], cánh [48, 278] | Toàn bộ mũi | Mũi nhỏ nhắn hài hòa | Nose area reduction test | `PLANNED` | Radial contraction mũi |
| **B036** | Bề rộng cánh mũi | Bóp hẹp hai bên cánh mũi hướng vào vách ngăn giữa | Slider "Thu gọn cánh mũi" | WebGL Bilateral Pinch Warp | Cánh mũi [48, 278], vách ngăn [2] | Cánh mũi | Cánh mũi gọn gàng, lỗ mũi không bị biến dạng méo | Alar base width test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI Editor |
| **B037** | Tạo khối sống mũi | Kẻ highlight sống mũi và đổ bóng hai bên sống mũi | Slider "Sống mũi cao" | Canvas 2D Nose Bridge Shading | Sống mũi [6, 197, 195, 5] | Dọc sống mũi | Sống mũi thẳng tắp và thanh thoát | Shading luminance test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào makeup pass |
| **B038** | Điều chỉnh đầu mũi | Nâng cao hoặc thu nhỏ chóp mũi (Nose tip) | Slider "Đầu mũi" | WebGL Pinch & Shift | Chóp mũi [4] | Chóp mũi | Đầu mũi thon nhỏ hình hạt chanh | Nose tip radius test | `PLANNED` | Warp chóp mũi |
| **B039** | Độ đầy môi | Làm căng mọng môi trên và môi dưới (Lip Plump) | Slider "Môi căng mọng" | WebGL Radial Outward Warp | Môi trên [13, 0], môi dưới [14, 17] | Đôi môi | Môi dày dặn gợi cảm, khóe môi không lệch | Vermilion border test | `IMPLEMENTED_UNVERIFIED` | Tích hợp warp môi |
| **B040** | Vị trí môi | Di chuyển toàn bộ khóe môi lên hoặc xuống cân đối nhân trung | Slider "Vị trí môi" | WebGL Vertical Translation | Toàn bộ landmarks môi | Khoang miệng | Môi dịch chuyển cân đối theo trục dọc | Lip center shift test | `PLANNED` | Warp vị trí môi |
| **B041** | Độ nghiêng môi | Xoay nhẹ góc nghiêng môi cho cân xứng với trục hai mắt | Slider "Cân đối môi" | WebGL Rotational Warp | Khóe môi [61, 291] | Đôi môi | Môi nằm ngang cân xứng với trục mắt | Lip angle test | `PLANNED` | Rotational warp môi |
| **B042** | Nâng khóe miệng | Nhấc hai khóe môi lên tạo nụ cười mỉm duyên dáng | Slider "Khóe môi cười" | WebGL Bilateral Upward Warp | Khóe môi [61, 291] | Hai khóe môi | Khóe miệng cong lên hình cung cười tự nhiên | Mouth corner delta test | `IMPLEMENTED_UNVERIFIED` | Tích hợp warp nụ cười |
| **B043** | Trắng răng | Khử sắc tố vàng $H \in [20^\circ, 70^\circ]$ trong lòng môi và tăng sáng nhẹ parabol | Slider "Trắng răng" | Canvas 2D Selective Color Curve | 21 landmarks lòng môi trong | Răng trong khoang miệng | Răng trắng sáng tự nhiên, không bị đổi màu tím/xanh, không mất men răng | HSL desaturation test | `IMPLEMENTED_UNVERIFIED` | Hoàn thiện trên UI |
| **B044** | Chỉnh hình dạng răng bằng AI | Sửa răng khấp khểnh, đóng khe thưa bằng AI inpainting | Nút "Chỉnh form răng" | AI Inpainting / Cloud Adapter | Cần AI Provider | Răng lộ rõ | Răng đều tăm tắp, tự nhiên | Provider contract check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |

---

## 5. Lông mày (Brows: B045 – B050)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B045** | Vị trí cao/thấp của mày | Nâng hoặc hạ toàn bộ cung mày so với hốc mắt | Slider "Vị trí mày" | WebGL Directional Warp | Lông mày [70, 300...] | Cung lông mày | Chân mày cao thanh thoát hoặc thấp nam tính | Brow elevation test | `PLANNED` | Warp nâng cung mày |
| **B046** | Độ dày lông mày | Làm lông mày đậm hơn hoặc thanh mảnh hơn | Slider "Độ đậm mày" | Canvas 2D Stroke Density | Mask lông mày | Lông mày | Mày đậm nét rõ từng sợi | Alpha density test | `IMPLEMENTED_UNVERIFIED` | Tinh chỉnh mask chân mày |
| **B047** | Khoảng cách lông mày | Kéo gần hoặc tách xa hai đầu lông mày | Slider "Khoảng cách mày" | WebGL Bilateral Shift | Đầu mày [55, 285] | Đầu lông mày | Cân đối ấn đường, không bị giao nhau | Inter-brow distance test | `PLANNED` | Warp khoảng cách mày |
| **B048** | Độ nghiêng lông mày | Xoay góc đuôi mày tạo mày ngang hoặc mày xếch | Slider "Độ nghiêng mày" | WebGL Rotational Warp | Đuôi mày [46, 276] | Đuôi lông mày | Dáng mày thay đổi theo góc độ mong muốn | Brow angle test | `PLANNED` | Rotational warp đuôi mày |
| **B049** | Điểm đỉnh lông mày | Nâng cao hoặc dịch chuyển đỉnh vòm chân mày (Arch point) | Slider "Đỉnh cung mày" | WebGL Local Peak Warp | Đỉnh mày [105, 334] | Đỉnh cung mày | Đỉnh vòm cong chuẩn tỉ lệ vàng | Arch peak position test | `PLANNED` | Warp đỉnh mày |
| **B050** | Kiểu và màu lông mày | Đổi màu chì kẻ mày (nâu đen, xám, hạt dẻ) | Picker "Màu lông mày" | Canvas 2D Color Overlay | Mask lông mày | Toàn bộ lông mày | Lông mày chuyển màu mượt mà theo màu tóc | Color blend test | `PLANNED` | Bộ màu lông mày |

---

## 6. Trang điểm (Makeup: B051 – B062)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B051** | Son: màu và cường độ | Phủ màu son lên viền môi theo bảng màu son thời thượng và cường độ 0-100% | Picker & Slider "Màu son" | Canvas 2D Soft-Light / Multiply | Outer lip mask [61, 291...] | Toàn bộ môi | Son lên đều màu, giữ vân môi thật | Color accuracy test | `IMPLEMENTED_UNVERIFIED` | Tích hợp bảng màu son |
| **B052** | Son: chất liệu matte/gloss | Điều chỉnh độ bóng bóng mượt (gloss) hoặc lì mịn (matte) của môi | Toggle "Son lì / Son bóng" | Specular Highlights / Contrast curve | Môi dưới | Môi | Son bóng có đốm sáng bóng ướt; son lì mịn màng | Highlight intensity test | `PLANNED` | Shader gloss texture |
| **B053** | Son: vùng phủ và viền | Tô son lòng môi (ombre/gradient) hoặc full môi có viền sắc nét | Selector "Kiểu son" | Radial Gradient Mask | Lòng môi vs viền môi | Đôi môi | Chuyển tiếp màu từ đậm trong lòng môi ra nhạt dần ở viền | Gradient profile test | `PLANNED` | Ombre mask |
| **B054** | Má hồng: màu và vị trí | Đánh má hồng dạng tán hạt mềm (feathered blush) trên gò má | Picker & Slider "Má hồng" | Canvas 2D Radial Feathered Overlay | Gò má [117, 346] | Hai bên má | Má ửng hồng tự nhiên, viền loang cực mềm không gắt | Gaussian gradient test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B055** | Phấn nền/tông nền | Lớp nền mỏng mịn nâng tone da toàn mặt (Foundation) | Picker "Kem nền" | Canvas 2D Blend Mode | Skin mask (trừ mắt/môi) | Da mặt | Da trắng sáng mịn màng như phủ cushion | Evenness delta test | `IMPLEMENTED_UNVERIFIED` | Tone cushion nền |
| **B056** | Phấn mắt | Phủ màu mắt (Eyeshadow) lên bầu mắt trên | Picker & Slider "Phấn mắt" | Canvas 2D Eyelid Mask Blend | Bầu mắt [226, 446...] | Bầu mắt trên | Màu mắt tán đều êm ái trên mí | Eyelid color test | `PLANNED` | Mask bầu mắt |
| **B057** | Kẻ mắt (Eyeliner) | Vẽ đường eyeliner mảnh sắc nét ôm sát mí mắt trên và vếch đuôi | Toggle/Slider "Kẻ mắt" | Canvas 2D Vector Path Stroke | Viền mí mắt trên | Viền mí mắt | Đường kẻ đen sắc nét, khớp sát đường mi | Path alignment test | `PLANNED` | Vector path eyeliner |
| **B058** | Mi giả | Gắn thêm hàng lông mi dài cong vút tự nhiên | Selector "Lông mi" | Canvas 2D Lashes Texture Stamp | Viền mi mắt | Viền mí | Lông mi cong dày, tệp vào mi thật | Texture overlay test | `PLANNED` | Asset mi giả |
| **B059** | Highlighter | Bắt sáng đỉnh sống mũi, gò má trên, nhân trung và cằm | Slider "Bắt sáng" | Canvas 2D Specular Dodge Blend | Điểm nhô cao của mặt | Các điểm bắt sáng | Gương mặt có chiều sâu và độ trong suốt rạng rỡ | Luminance peak test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B060** | Tạo khối vùng mặt | Đổ bóng tối (Contour) dưới gò má, hai bên cánh mũi và viền trán | Slider "Tạo khối" | Canvas 2D Multiply Shadow Blend | Vùng hốc má, quai hàm | Viền mặt | Mặt thon gọn, sắc nét theo phong cách trang điểm phương Tây | Shadow gradient test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B061** | Preset makeup hoàn chỉnh | Gói trang điểm nhanh (Tự nhiên, Hàn Quốc, Douyin, Tây âu) tích hợp son, má, khối | Selector "Preset Makeup" | Multi-layer Canvas Pass | Toàn bộ landmarks mặt | Mặt chân dung | Biến hóa phong cách tức thì, có thể tinh chỉnh slider từng lớp | Preset fidelity test | `PLANNED` | Tập hợp các preset makeup |
| **B062** | Chuyển makeup từ ảnh tham khảo | Trích xuất bảng màu và style makeup từ ảnh mẫu áp dụng lên ảnh hiện tại | Upload ảnh mẫu "Copy Makeup" | AI Style Transfer / Histogram Match | Cần AI Provider | 2 ảnh chân dung | Phong cách trang điểm truyền tải trung thực | Transfer similarity test | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |

---

## 7. Tóc (Hair: B063 – B074)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B063** (P0) | Mượt tóc giữ chi tiết | Làm mượt tóc theo mask phân đoạn MediaPipe Segmenter (Category 1), bảo vệ viền và phông nền | Slider "Mượt tóc" | Canvas 2D + MediaPipe Segmenter | MediaPipe Segmenter | Vùng tóc | Tóc vào nếp mượt mà, không bị bết dính thành mảng, nền xung quanh nguyên vẹn | `test_runner.ts`, visual artifacts | `IMPLEMENTED_UNVERIFIED` | Duy trì và benchmark |
| **B064** | Tăng độ bóng tóc | Thêm dải ánh sáng bóng mượt (Hair Shine) trên đỉnh đầu và thân tóc | Slider "Bóng tóc" | Canvas 2D Screen Blend trên mask tóc | Segmenter Hair Mask | Vùng tóc | Tóc có độ óng ả khỏe mạnh của salon | applyHairShine — linear gradient screen-blended to hair mask | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào Hair pass |
| **B065** | Giảm tóc con bay/xù | Làm sạch các sợi tóc con lởm chởm ngoài đường viền tóc | Slider "Gọn tóc con" | Morphological Hair Mask Erosion | Segmenter Hair Mask | Viền ngoài của tóc | Viền tóc gọn gàng, không còn sợi xù | Edge roughness test | `PLANNED` | Mask erosion filter |
| **B066** | Đổi màu tóc | Nhuộm màu tóc thời trang (Nâu tây, Khói, Vàng, Đỏ rực) theo mask phân đoạn | Picker "Màu tóc" | Canvas 2D Color / Soft-Light Blend | Segmenter Hair Mask | Toàn bộ mái tóc | Màu tóc phủ đều tự nhiên, giữ nguyên độ sáng tối của từng lọn tóc | Hair color delta test | `IMPLEMENTED_UNVERIFIED` | Bảng màu nhuộm tóc |
| **B067** | Nhuộm highlight theo vùng | Nhuộm màu sáng xen kẽ từng lọn tóc (Balayage / Highlight) | Picker "Tóc Highlight" | Canvas 2D Streak Texture Overlay | Segmenter Hair Mask | Lọn tóc | Từng vệt highlight nổi bật thời thượng | Streak texture test | `PLANNED` | Pattern highlight lọn |
| **B068** | Điều chỉnh đường chân tóc | Kéo hạ hoặc làm tròn đường chân tóc viền trán để che trán bò liếm | Slider "Hạ chân tóc" | WebGL Warp + Hair Texture Extension | Chân tóc viền trán | Viền trán và tóc | Trán tròn trịa, che khuyết điểm trán dô | Hairline distance test | `PLANNED` | Warp chân tóc |
| **B069** | Tăng độ phồng đỉnh đầu | Nâng cao vòm tóc đỉnh đầu giúp gương mặt nhỏ lại (High skull crown) | Slider "Phồng đỉnh đầu" | WebGL Upward Warp trên tóc | Đỉnh tóc trên [10] | Đỉnh đầu | Đỉnh tóc bồng bềnh, khuôn mặt thon gọn | Crown height test | `PLANNED` | Upward warp đỉnh tóc |
| **B070** | Làm dày tóc bằng AI | Phục dựng tóc dày dặn, bồng bềnh từ gốc đến ngọn bằng AI | Nút "Làm dày tóc AI" | AI Inpainting / Cloud Adapter | Cần AI Provider | Mái tóc mỏng | Tóc dày gấp đôi tự nhiên | Provider contract check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |
| **B071** | Điền vùng tóc thưa bằng cọ AI | Cọ dặm chân tóc che hói, dặm màu da đầu | Cọ "Dặm che hói" | Local Texture Clone / Inpaint | Tương tác cọ | Vùng da đầu lộ | Che phủ hoàn hảo vùng tóc thưa, tệp vào tóc thật | Coverage test | `PLANNED` | Inpainting cọ dặm |
| **B072** | Thử tóc mái | Ghép thử các kiểu mái: Mái thưa Hàn Quốc, Mái bay, Mái bằng | Selector "Tóc mái" | AI / Local Template Overlay | Trán và chân mày | Vùng trán | Mái tóc tệp chuẩn vào gương mặt, tự nhiên | Template alignment test | `PLANNED` | Asset tóc mái |
| **B073** | Thử kiểu tóc thẳng/xoăn/ngắn | Đổi kiểu tóc sang tóc ngắn bob, tóc xoăn lượn sóng | Selector "Kiểu tóc" | AI Style / Cloud Adapter | Cần AI Provider | Khuôn mặt | Đổi kiểu tóc giữ nguyên khuôn mặt gốc | Provider response check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |
| **B074** | Thử chiều dài tóc | Kéo dài tóc ngắn thành tóc dài ngang lưng | Slider "Chiều dài tóc" | AI Generative / Cloud Adapter | Cần AI Provider | Tóc và vai | Tóc dài mượt mà tự nhiên | Provider response check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |

---

## 8. Vóc dáng (Body: B075 – B082)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **B075** | Thon eo | Bóp gọn hai bên eo hướng vào rốn bằng WebGL Bilateral Warp có vùng bảo vệ phông nền | Slider "Thon eo" | WebGL Bilateral Warp | Vùng chọn eo người dùng | Thân người | Vòng eo thon nhỏ hình đồng hồ cát, nền ngoài không cong vẹo | Grid background preservation test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B076** | Thon cánh tay | Thu hẹp bắp tay to | Slider "Thon bắp tay" | WebGL Pinch Warp | Vùng chọn cánh tay | Bắp tay | Bắp tay thon thả, không làm méo thân người cạnh tay | Arm diameter test | `PLANNED` | Warp bắp tay |
| **B077** | Thon chân | Thu gọn đùi và bắp chân | Slider "Thon chân" | WebGL Bilateral Warp | Vùng chọn đùi/bắp chân | Đôi chân | Chân thon nuột nà, thẳng tắp | Leg width test | `PLANNED` | Warp bắp chân |
| **B078** | Kéo dài chân | Kéo giãn tỉ lệ dọc từ đùi xuống mắt cá chân có nội suy gradient | Slider "Kéo dài chân" | Canvas / WebGL Vertical Scale | Vùng chọn từ hông xuống | Toàn thân | Đôi chân dài miên man tự nhiên, không kéo giãn khuôn mặt | Height ratio test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |
| **B079** | Điều chỉnh chiều cao/tỷ lệ | Nâng tỉ lệ chiều cao toàn thân tạo vóc dáng thanh mảnh | Slider "Tăng chiều cao" | Vertical Gradient Stretch | Toàn thân | Ảnh toàn thân | Dáng người thanh thoát chuẩn siêu mẫu | Height scale test | `PLANNED` | Gradient stretch toàn thân |
| **B080** | Điều chỉnh hông | Mở rộng hai bên hông tạo đường cong quả lê/đồng hồ cát | Slider "Nở hông" | WebGL Radial Expansion | Hai bên hông | Hông | Hông nở nang tự nhiên | Hip width test | `PLANNED` | Warp nở hông |
| **B081** | Điều chỉnh vùng bụng | Làm phẳng bụng dưới và nâng gọn mỡ bụng | Slider "Phẳng bụng" | WebGL Inward Warp | Vùng bụng dưới | Bụng | Vùng bụng phẳng lỳ, thon gọn | Abdomen profile test | `PLANNED` | Inward warp bụng |
| **B082** | Điều chỉnh cổ/vai | Kéo dài cổ thiên nga và hạ xuôi xương bờ vai vuông vức | Slider "Cổ thon vai gầy" | WebGL Coordinate Warp | Cổ và hai bên vai | Vùng cổ vai | Cổ cao thanh thoát, bờ vai vuông mảnh mai | Shoulder slope test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào UI |

---

## 9. Yêu cầu Bổ sung Đặc tả (X-Prefixed IDs)

| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **X001** | Độ rộng trán (Forehead width) | Thu hẹp hoặc mở rộng hai bên thái dương trán | Slider "Độ rộng trán" | WebGL Bilateral Warp | Landmarks [67, 297] | Vùng trán | Trán cân xứng với gò má và cằm | Forehead width test | `PLANNED` | Warp hai bên thái dương |
| **X002** | Khoảng cách hai mắt (Eye spacing) | Dịch chuyển vị trí hai hốc mắt ra xa hoặc lại gần sống mũi | Slider "Khoảng cách mắt" | WebGL Eye Separation Warp | Khóe mắt hai bên | Hốc mắt | Khoảng cách mắt đạt chuẩn tỉ lệ 1 con mắt ở giữa | Inter-canthal distance test | `PLANNED` | Bilateral eye translation |
| **X003** | Xóa tàn nhang có chọn lọc qua cọ/vùng chọn | Cho phép người dùng chủ động chọn vết tàn nhang để xóa, không tự ý xóa hết nốt ruồi | Cọ "Xóa tàn nhang" | Canvas 2D Patch Inpainting | Tương tác cọ | Vùng chọn tàn nhang | Chỉ xóa đúng đốm được chọn, giữ nguyên nét duyên khác | Brush selective test | `IMPLEMENTED_UNVERIFIED` | Tích hợp cọ vào UI Editor |
| **X004** | Tăng thể tích ngực (Chest volume) | Nở tròn đầy đặn vùng ngực với biên bảo vệ thân người | Slider "Tăng thể tích ngực" | WebGL Radial Bulge Warp | Vùng chọn ngực | Vùng ngực | Tăng thể tích tròn đầy tự nhiên, nền và cánh tay không cong | Volume curvature test | `PLANNED` | Radial bulge ngực |
| **X005** | Tăng thể tích mông (Buttock volume) | Nâng cao và làm đầy đặn đường cong mông | Slider "Nâng mông" | WebGL Directional Bulge Warp | Vùng chọn mông | Vùng mông | Đường cong mông quyến rũ, không méo chân | Curve profile test | `PLANNED` | Bulge mông |
| **X006** | Định hình xương quai xanh (Collarbone definition) | Nhấn highlight đỉnh xương đòn và đổ bóng hốc xương quai xanh | Slider "Xương quai xanh" | Canvas 2D Shading & Highlight | Vùng cổ áo và vai | Vùng xương đòn | Xương quai xanh lộ rõ gợi cảm, thanh mảnh | applyCollarboneDefinition — multiply shadow + screen highlight gradient | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào Body pass |
| **X010** | AI Art / Avatar (Anime, 3D, Cyberpunk) | Chuyển đổi chân dung sang các phong cách nghệ thuật AI | Selector "AI Avatar" | Cloud AI Provider Adapter | Cần AI Provider | Ảnh chân dung | Tạo ảnh nghệ thuật đúng phong cách, bảo toàn thần thái | Provider contract check | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |
| **X011** | Phục chế & làm nét ảnh cũ / mờ nhòe | Khử nhiễu, làm sắc nét và phục dựng chi tiết khuôn mặt cũ | Nút "Phục chế ảnh cũ" | Cloud AI / Local Sharpness | Cloud Provider / Canvas | Ảnh mờ/cũ | Ảnh rõ nét, phục hồi biểu cảm chân thực | Sharpness delta test | `BLOCKED_EXTERNAL` | Yêu cầu AI Worker |
| **X012** | Xóa vật thể / người chọn lọc | Bôi cọ lên vật thể/người không mong muốn để xóa và phục dựng nền | Cọ "Xóa vật thể" | Canvas Patch Inpaint / AI Inpaint | Tương tác cọ | Vùng chọn bất kỳ | Xóa sạch đối tượng, nền được điền tự nhiên không vết gãy | Inpaint boundary test | `IMPLEMENTED_UNVERIFIED` | Cọ xóa vật thể cơ bản |
| **X013** | Tách nền tự động & thay nền | Tách người khỏi nền, xuất PNG trong suốt hoặc thay thế phông nền mới | Selector "Tách / Đổi nền" | MediaPipe Segmenter + Canvas | Segmenter Mask | Ảnh chân dung | Cắt người sạch viền tóc, nền mới hòa hợp ánh sáng | Alpha boundary test | `IMPLEMENTED_UNVERIFIED` | Tích hợp xuất PNG trong suốt |
| **X014** | Thay thế bầu trời ma thuật (Magic Sky) | Phân đoạn vùng trời và thay bằng hoàng hôn, cực quang, mây xanh | Selector "Magic Sky" | Sky Segmentation + Blend | Sky Segmenter | Ảnh phong cảnh / ngoại cảnh | Bầu trời đổi ngoạn mục, ánh sáng đổ lên chủ thể hài hòa | Sky blend test | `PLANNED` | Segmenter bầu trời |
| **X020** | Cắt ảnh theo tỉ lệ chuẩn (Crop ratios) | Cắt ảnh tự do và theo tỉ lệ: 1:1, 4:5, 16:9, 9:16, 3:4, 4:3, 2:3 | Công cụ "Cắt ảnh" | Canvas 2D Crop | Tương tác khung cắt | Mọi ảnh | Cắt đúng tỉ lệ và kích thước, không lệch tọa độ landmarks | Crop coordinate test | `IMPLEMENTED_UNVERIFIED` | Tích hợp công cụ Crop |
| **X021** | Xoay & lật ảnh (Rotate / Flip) | Xoay 90°, 180°, 270° và lật ngang (flip H), lật dọc (flip V) | Nút "Xoay / Lật" | Canvas 2D Transformation | Transform Matrix | Mọi ảnh | Ảnh xoay/lật chuẩn xác, landmarks tự động rebase đúng | Matrix transform test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào Editor |
| **X022** | Chỉnh sửa cơ bản: Sáng, Tương phản, Bão hòa, Nhiệt độ, Độ nét, Vignette | Bộ thanh trượt hiệu chỉnh màu sắc tổng thể ảnh | Panel "Hiệu chỉnh" | WebGL / Canvas Pixel Shaders | Bộ tham số màu | Mọi ảnh | Thay đổi thông số màu lập tức, chất lượng xuất nguyên bản | Pixel metric test | `IMPLEMENTED_UNVERIFIED` | Tích hợp Panel Hiệu chỉnh |
| **X023** | Hiệu ứng ống kính: Flare, bóng mờ, Hạt film (Grain), Vết xước film | Phủ hiệu ứng cổ điển nghệ thuật | Selector "Hiệu ứng film" | Canvas Blend Overlay | Bộ textures hiệu ứng | Mọi ảnh | Tạo cảm giác ảnh chụp máy film chuyên nghiệp | Visual texture test | `PLANNED` | Texture grain & scratch |
| **X024** | 200+ Bộ lọc màu chọn lọc (Curated Color Presets) | Danh mục 200+ công thức màu thời thượng chia 5 nhóm (Film, Vintage, Food, Cinematic, Cyberpunk) | Thư viện "Bộ lọc màu" | WebGL 3D LUT / Color Curves | Preset Manifest JSON | Mọi ảnh | Màu sắc đậm chất điện ảnh, có thanh trượt cường độ 0-100% | Contact sheet validation test | `IMPLEMENTED_UNVERIFIED` | Xây dựng Preset Manifest 200+ |
| **X025** | Ghép ảnh dạng lưới đa khung (Collage Grid) | Ghép 2 đến 9 ảnh vào các khung bố cục lưới (1x2, 2x1, 2x2, 3x3...) | Tab "Ghép ảnh (Collage)" | Canvas Multi-image Renderer | Bộ ảnh người dùng | 2-9 ảnh | Xếp ảnh khớp khung, kéo thả vị trí, chỉnh khoảng cách viền | Collage layout test | `IMPLEMENTED_UNVERIFIED` | Tích hợp module Collage |
| **X026** | 12 Mẫu thiết kế tạp chí / poster (Editable Templates) | 12 templates phong cách bìa tạp chí Vogue, Poster điện ảnh có thể sửa text | Tab "Mẫu thiết kế (Templates)" | Canvas Vector Text & Placement | Template Manifest JSON | Ảnh + Text người dùng | Xuất file poster sắc nét chuẩn in ấn | Template render test | `IMPLEMENTED_UNVERIFIED` | Tạo 12 Poster Templates |
| **X027** | Khôi phục ảnh thiếu sáng / chụp đêm tĩnh | Tăng sáng thông minh, khử nhiễu hạt trong bóng tối cho ảnh chụp đêm | Nút "Cứu sáng ảnh đêm" | Adaptive Gamma & Denoise | Canvas Shading | Ảnh chụp thiếu sáng | Ảnh sáng rõ chi tiết vùng tối mà không cháy sáng đèn | SNR improvement test | `IMPLEMENTED_UNVERIFIED` | Tích hợp vào Panel Hiệu chỉnh |

---

## 10. Cơ sở hạ tầng Hệ thống (Infrastructure: I001 – I009)

| ID | Tên thành phần | Trách nhiệm cốt lõi | Vị trí Source Code | Tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|---|
| **I001** | Image Processing Pipeline | Quản lý pipeline Canvas 2D + WebGL Warp thống nhất giữa Preview và Export gốc 4000x3000 | `apps/web/src/engine/ImageEngine.ts`, `WebGLWarpEngine.ts` | Parity MAE < 4.0, PSNR > 34.0 dB; tọa độ chuẩn hóa $[0, 1]$ độc lập tỉ lệ khung hình | `IMPLEMENTED_UNVERIFIED` |
| **I002** | MediaPipe FaceLandmarker | Khởi tạo WASM, nhận diện 478 landmarks khuôn mặt, tự động retry khi lỗi mạng | `apps/web/src/engine/FaceLandmarkManager.ts` | Nhận diện đủ 478 điểm trên ảnh chính diện, nghiêng, xoay; không crash | `IMPLEMENTED_UNVERIFIED` |
| **I003** | MediaPipe ImageSegmenter | Trích xuất mặt nạ phân đoạn đa lớp (Category 1 = Hair, Background) | `apps/web/src/engine/SegmenterManager.ts` | Mask chuẩn kích thước, tự động scale mượt mà sang preview/export | `IMPLEMENTED_UNVERIFIED` |
| **I004** | History & Undo/Redo Engine | Lưu vết trạng thái chỉnh sửa, hỗ trợ Undo/Redo mượt mà với chuột và phím tắt (Ctrl+Z/Ctrl+Shift+Z) | `apps/web/src/components/Editor.tsx`, `context.tsx` | Khôi phục chính xác từng thao tác; phân nhánh redo đúng chuẩn | `IMPLEMENTED_UNVERIFIED` |
| **I005** | Local Drafts & Storage | Lưu bản nháp vào IndexedDB, tự động dọn dẹp URL Blob, bảo toàn ảnh gốc | `apps/web/src/context.tsx` | Không tràn bộ nhớ RAM/GPU, không phụ thuộc vào server để chỉnh sửa local | `IMPLEMENTED_UNVERIFIED` |
| **I006** | Server Job Lifecycle & Security | Quản lý vòng đời job đám mây (503 BLOCKED, 501 NOT_IMPLEMENTED, 202 pending); cấm ghi đĩa trái phép | `apps/server/src/index.ts` | Tuyệt đối không lưu file rác khi thiếu key; không treo job pending vô hạn | `IMPLEMENTED_UNVERIFIED` |
| **I007** | Storage & Scoped Cleanup | Quản lý thư mục `uploads/`, chỉ dọn dẹp file do test tạo ra, bảo toàn file gốc | `apps/server/src/test_server_jobs.ts` | Scoped cleanup 100% tin cậy, không rò rỉ file test | `IMPLEMENTED_UNVERIFIED` |
| **I008** | Super Travel Visual System | Giao diện chuẩn phong cách Super Travel: background `#fdf8f3`, accent `#e4a4bd`, `#262626`, League Spartan | `apps/web/src/index.css`, `App.css`, `Landing.tsx` | Typography chuẩn, không clip dấu tiếng Việt; canvas giữ nguyên 100% màu thật | `IMPLEMENTED_UNVERIFIED` |
| **I009** | Automated QA & Test Runner | Test suite chạy Headless Chrome trích xuất artifacts thật và đo đạc định lượng | `scripts/run_visual_verification.js`, `apps/web/src/test_runner.ts` | Chạy tự động `npm test` không cần thao tác tay, kết quả reproducible | `IMPLEMENTED_UNVERIFIED` |

---

## 11. Bảng Đối chiếu Mapping ID Cũ &rarr; ID Chuẩn Canonical

| Tính năng cốt lõi | ID cũ trong bảng sơ bộ | ID Chuẩn Canonical Master Plan A2 | Ghi chú điều chỉnh |
|---|---|---|---|
| Mịn da giữ texture | `B001` | **`B001`** | Giữ nguyên (P0) |
| Thon mặt tổng thể | `B011` | **`B013`** | Điều chỉnh về đúng B013 theo danh mục khuôn mặt A2 (P0) |
| Giảm nọng cằm | `B019` | **`B019`** | Giữ nguyên (P0) |
| Mượt tóc giữ chi tiết | `B063` (hoặc B005 sơ bộ) | **`B063`** | Chuẩn hóa B063 trong nhóm tóc A2 (P0) |
| Làm trắng răng | `B039` | **`B043`** | Chuẩn hóa B043 trong nhóm mũi, môi, răng A2 |
| Kích thước mắt (Mắt to) | `B021` | **`B025`** | Chuẩn hóa B025 trong nhóm mắt A2 |

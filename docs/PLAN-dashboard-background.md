# PLAN: Dashboard Background Redesign

Mục tiêu: Thay thế background hiện tại của Dashboard sang phong cách Cyber-Technical với nền tối sâu (Deep Slate) kết hợp các dòng chảy dữ liệu (Data Stream) tinh tế để làm nổi bật các CyberCard.

## 🔴 User Review Required

> [!IMPORTANT]
> - Background mới sẽ tập trung vào độ tương phản cao cho Content.
> - Sử dụng các hiệu ứng SVG/Canvas mờ ảo (opacity < 5%) để tránh gây xao nhãn.

## Proposed Changes

### [Component] CyberBackground
- [x] **Base Layer**: Màu `#050A09` (Deep Slate/Black) với hiệu ứng Vignette ở các góc.
- [x] **Data Layer**: 
    - Các đường kẻ cực mảnh (0.5px) màu Emerald mờ.
    - Một lớp "Digital Mist" hoặc "Data Flow" chuyển động chậm (Slow-motion SVG stream).
- [x] **Overlay**: Phủ một lớp hạt (noise/grain) cực nhẹ để tăng cảm giác vật liệu kỹ thuật.

### [Layout] Dashboard Shell
- [x] Cập nhật `src/app/dashboard/layout.tsx` để tích hợp `CyberBackground`.
- [x] Đảm bảo tính nhất quán trên nền các trang con.

## Phase Breakdown

### Phase 1: Research (Analysis)
- [x] Kiểm tra các lớp z-index hiện tại của Dashboard.
- [x] Xác định vị trí tối ưu để chèn Background Layer mà không làm gián đoạn interaction.

### Phase 2: Design & Solutioning
- [x] Thiết kế `DigitalStream` component (SVG-based).
- [x] Phối màu Gradient mờ Layering.

### Phase 3: Implementation
- [x] [NEW] `src/components/ui/CyberBackground.tsx`
- [x] [MODIFY] `src/app/dashboard/layout.tsx`

### Phase 4: Verification
- [x] Kiểm tra độ tương phản (Contrast ratio) của text trên nền mới.
- [x] Kiểm tra Performance (FPS) khi có hiệu ứng stream.
- [x] Kiểm tra Responsive trên các kích thước màn hình.

## Agent Assignments
- **Frontend Specialist**: Chịu trách nhiệm thiết kế visual và CSS/SVG.
- **Project Planner**: Điều phối và audit checklist.

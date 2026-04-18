# Kế hoạch Nâng cấp UX: Trọng số Chi tiêu (Smart Allocation)

Dự án cải tiến cơ chế điều chỉnh trọng số chi tiêu trong trang Spending Insights, áp dụng logic tự động cân bằng (self-balancing) và giao diện điều hướng thông minh tương tự Quick Setup Wizard.

## 🎯 Mục tiêu thành công (Success Criteria)
- [ ] **Smart Balancing:** Khi thay đổi 1 trọng số, các mục khác tự động điều chỉnh tỷ lệ để tổng luôn bằng 100%.
- [ ] **Locking Feature:** Người dùng có thể "khóa" các danh mục không muốn bị thay đổi khi điều chỉnh các mục khác.
- [ ] **Strategy Presets:** Bộ nút thiết lập nhanh (GSO, Tiết kiệm, Thành thị, v.v.).
- [ ] **GSO Reference:** Hiển thị mốc tham chiếu dữ liệu chính thức trên từng thanh điều khiển.
- [ ] **Aesthetic Polish:** Hiệu ứng mượt mà, phản hồi tức thì (haptic-like feedback).

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Framer Motion (Animation)
- **Icons:** Lucide React (Lock, Unlock, Sparkles, Pin)
- **Logic:** Custom Hook cho proportional rebalancing.

## 📂 Cấu trúc File dự kiến
- `src/app/dashboard/personal-cpi/page.tsx`: Cập nhật logic state và giao diện chính.
- `src/components/dashboard/WeightSplitter.tsx`: (New) Component tách rời để quản lý từng thanh trượt "thông minh".
- `src/lib/calculations/rebalance.ts`: (New) Logic toán học để phân bổ lại trọng số.

## 📑 Danh sách Task

### Phase 1: Core Logic (Backend-of-Frontend)
- **Task ID:** LOGIC-01
- **Tên:** Xây dựng logic Rebalance tỉ lệ thuận
- **Agent:** `frontend-specialist`
- **Mô tả:** Viết hàm tính toán sao cho khi tăng/giảm mục A, phần chênh lệch được chia đều (hoặc tỉ lệ thuận) cho các mục B, C, D còn lại (ngoại trừ các mục đã bị Lock).
- **INPUT:** Current Weights, Changed ID, New Value, Locked IDs.
- **OUTPUT:** New Weights object (Sum = 100).
- **VERIFY:** Tổng kết quả luôn phải bằng 100.00 (sai số < 0.01).

### Phase 2: UI Component Refactoring
- **Task ID:** UI-01
- **Tên:** Tạo Component SmartWeightSlider
- **Agent:** `frontend-specialist`
- **Mô tả:** 
    - Thay thế input range cũ bằng slider tùy chỉnh.
    - Thêm nút Lock/Unlock.
    - Hiển thị mốc "GSO Official" bằng một vạch sáng nhỏ trên thanh trượt.
    - Hỗ trợ nhập số trực tiếp hoặc nhấn +/- (giống Wizard).
- **VERIFY:** Giao diện hiển thị đúng mốc GSO và trạng thái Lock.

### Phase 3: Presets & Integration
- **Task ID:** INT-01
- **Tên:** Tích hợp bộ Presets và Dashboard State
- **Agent:** `frontend-specialist`
- **Mô tả:** 
    - Thêm Section "Chiến lược mẫu" với các nút: Official GSO, Frugal Saver, Urban Lifestyle.
    - Tích hợp logic rebalance vào sự kiện `onChange` của Sliders.
- **VERIFY:** Nhấn Preset thay đổi toàn bộ trọng số ngay lập tức.

### Phase 4: Polish & Performance
- **Task ID:** POLISH-01
- **Tên:** Animation & Real-time Update
- **Agent:** `frontend-specialist`
- **Mô tả:** Sử dụng Framer Motion để các thanh trượt "nhảy" mượt mà khi tự động cân bằng. Thêm hiệu ứng phát sáng (glow) khi đạt mốc GSO.
- **VERIFY:** UX cảm giác "sống động" và không bị giật lag.

## ✅ PHASE X: VERIFICATION CHECKLIST
- [ ] Chạy `python .agent/scripts/verify_all.py .`
- [ ] Kiểm tra sai số làm tròn (Rounding errors) để đảm bảo tổng luôn là 100%.
- [ ] Kiểm tra khả năng tương tác trên Mobile (Touch targets).
- [ ] Đảm bảo không sử dụng màu tím (Purple Ban ✅).

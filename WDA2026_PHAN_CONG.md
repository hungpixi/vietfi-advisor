# 🎯 KẾ HOẠCH NÂNG CẤP & PHÂN CÔNG (WDA2026)
**Dành cho phiên làm việc hiện tại và ca đêm (10pm - 2am) của Hoàng**

---

## 🧭 CHIẾN LƯỢC TRÁNH CONFLICT
Để Hoàng và AI (Hưng) làm việc song song hiệu quả nhất, chúng ta áp dụng **Separation of Concerns (Tách biệt mối quan tâm)**:
- **Hưng (AI - Ca Ngày/Chiều):** Tập trung vào **Giao diện (UI/UX)**, **Logic Client-side** (React Hooks, Recharts, Framer Motion), và **AI Prompts** (System Prompts, Context Builder). Làm việc trong thư mục `src/app/dashboard/...` và `src/components/...`.
- **Hoàng (Dev - Ca Đêm 10pm - 2am):** Tập trung vào **Dữ liệu (Backend)**, **Database (Supabase)**, **APIs**, và **Cron Jobs**. Làm việc trong thư mục `src/app/api/...`, `src/lib/.../crawler`, và Supabase Dashboard.

---

## 🚨 VẤN ĐỀ 1: TRUNG TÂM QUẢN TRỊ NỢ TẬP TRUNG
*Giải quyết nỗi đau: Chia nhỏ nợ (SPayLater, Thẻ tín dụng, Vay tiêu dùng) dẫn đến ảo tưởng khả năng chi trả, dính lãi ẩn/phí phạt cao, sụp đổ domino.*

### 🧑‍💻 Hưng (AI) - Phần UI & Trải nghiệm (Không đụng API/DB backend)
1. **Thiết kế "Bảng điều khiển Nợ" (`src/app/dashboard/debt/page.tsx`)**:
   - Giao diện nhập liệu nhanh các khoản nợ: Chọn loại (Thẻ tín dụng, SPayLater, Vay nóng...), nhập số tiền, lãi suất danh nghĩa, số tháng.
   - **Form Lãi ẩn/Phí dịch vụ**: Nơi user có thể nhập phí duy trì, phí chuyển đổi trả góp (để tính ra "Lãi suất thực tế" - APR/AER).
2. **Biểu đồ "Hiệu ứng Domino Nợ"**:
   - Dùng Recharts vẽ đường tiệm cận nợ so với thu nhập. Nếu nợ > 60% thu nhập thực tế, biểu đồ chuyển màu ĐỎ còi báo động.
3. **Kịch bản Tối ưu Nợ (Client-side Math)**:
   - Xây dựng file `src/lib/calculations/debt-optimizer.ts` (đã khởi tạo trước đó) để tính toán đường đi của nợ dựa trên Snowball (trả từ nhỏ đến lớn) hoặc Avalanche (Lãi cao trước). Trình bày lên UI: *"Nếu theo cách này, bạn sẽ thoát nợ vào T10/2026 và tiết kiệm được 15tr tiền lãi"*.

### 🦉 Hoàng (Night Shift) - Phần Data & Cron (Không đụng UI Component)
1. **Database Schema (Supabase)**:
   - Tạo (nếu chưa có) hoặc chuẩn hóa bảng `debts`: `id`, `user_id`, `type` (bnpl, credit, loan), `balance`, `interest_rate`, `hidden_fees`, `due_date`.
2. **API Endpoints (`/api/debts`)**:
   - Viết CRUD GET/POST/PUT/DELETE chuẩn mực (tương tác với Supabase auth user).
3. **🚨 Push Notification (Cron Job)**:
   - Viết script chạy mỗi ngày (Cron): Quét qua các khoản nợ sắp đến hạn (`due_date` còn 3-5 ngày). Bắn thông báo cảnh báo qua Telegram báo hoặc Web Push (nếu có): *"⚠️ Khoản SPayLater 2tr520k sắp đến hạn vào T6! Bạn đã chuẩn bị tiền trong Hũ Nợ chưa?"*

---

## 📈 VẤN ĐỀ 2: CỐ VẤN ĐẦU TƯ ĐẢ THÔNG "TÊ LIỆT TÀI CHÍNH"
*Giải quyết nỗi đau: Lạm phát làm tiền nằm yên "bốc hơi", nhưng phân bổ vốn giữa các kênh (Vàng, BĐS, Chứng) lại quá phức tạp. Trắc nghiệm truyền thống nhàm chán, bỏ qua ngữ cảnh sống của từng người.*

### 🧑‍💻 Hưng (AI) - Cấu trúc Prompt & Trực quan dữ liệu (Client-side)
1. **Tinh chỉnh "Risk DNA" (`src/app/dashboard/portfolio/page.tsx`)**:
   - Ép người dùng kết hợp **3 biến số**: (1) Thu nhập trừ chi phí sinh hoạt (Dòng tiền dư thực sự), (2) Điểm Cảm xúc thị trường (Fear & Greed hiện tại), (3) Mục tiêu (vd: 5 năm nữa mua nhà hay sinh tồn hàng tháng).
   - Render ra Portfolio Action Plan: *"Dòng tiền của bạn nhỏ (2tr/tháng), Vàng đang vùng rủi ro cao (🔴 Quá Nóng). Đừng FOMO vàng, ưu tiên gửi kỳ hạn 3 tháng hoặc chứng chỉ quỹ cổ phiếu an toàn"*.
2. **Cập nhật Vẹt Vàng AI (`VetVangChat.tsx`)**:
   - Viết các prompt cực gắt/thực dụng mang màu sắc của Vẹt Vàng (VD: *"Lương 10 củ, dư 1 củ thì đừng hỏi tui crypto, học kỹ năng mới đi ba"*).

### 🦉 Hoàng (Night Shift) - API Cào Dữ Liệu Rộng Hơn & Real-time (Server-side)
1. **Nâng cấp API Market Data (`/api/market-data`)**:
   - Hiện tại đã có Gold, Crypto, VNIndex. Cần cào/tổng hợp thêm **Lãi suất huy động trung bình 12/6T của các Bank** (Vcb, Bidv, MB) để làm mỏ neo so sánh (VD: 4.8%).
   - Tìm cách cào **Lạm phát CPI định kỳ** hoặc dữ liệu giá cả để đối chiếu xem tiết kiệm đang thắng hay thua.
2. **Sentiment Crawler Nâng cao (`/lib/market-data`)**:
   - Tính logic Fear & Greed chuyên cho thị trường Việt Nam (thanh khoản phái sinh, tỷ lệ margin nếu cào được từ TCBS).
3. **Alert Hệ Thống (Cron Job)**:
   - Khi `marketAlert` kích hoạt (VD: VNIndex rơi > 20đ, Fear Index < 25), tự động lưu 1 record vào bảng `notifications` để sáng user vào app là Vẹt Vàng "Hú" lên ngay trong Chat.

---

## 📋 GIAO DỊCH QUY TẮC ("RULE OF ENGAGEMENT")
1. **Hưng (AI)** Không bao giờ update file trong thư mục `/api/` (nếu không được phép rõ ràng) và không lạm dụng API key trong UI, chỉ gọi fetcher tĩnh. Đẩy mượt animation và tính Actionable.
2. **Hoàng** Khi xử lý Supabase/API, chỉ cần ném Data JSON thô ra chuẩn (đúng Schema TypeScript). Hưng sẽ tự lo phần hiển thị mượt mà.
3. Trước khi đi ngủ hoặc xong ca, Hoàng luôn tạo tag/commit rõ ràng: `feat(api): ...` để Hưng sáng hôm sau đọc log là hiểu ngay.

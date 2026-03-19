# KẾ HOẠCH THỰC HIỆN CHI TIẾT — VIETFI ADVISOR

## WebDev Adventure 2026 | Team 2 người | 78h effort

---

## 📅 Timeline Cuộc thi

| Mốc | Thời gian | Nội dung | Trạng thái |
|------|----------|---------|-----------| 
| 📝 Vòng 1 | 23-29/03/2026 | Nộp báo cáo ý tưởng | ✅ v4.0 done |
| 💻 Vòng 2 | 06-20/04/2026 | Hiện thực hóa (15 ngày) | ⬜ |
| 🎤 Vòng 3 | 09/05/2026 | Thuyết trình + Live demo | ⬜ |

---

## 🧩 FRAMEWORK LÀM VIỆC NHÓM

### Vấn đề: Tại sao không thể chia việc song song ngay?

Nếu 2 người tách ra làm ngay (A backend, B frontend) mà **chưa thống nhất**:
- ❌ Component API khác nhau → frontend gọi API sai format
- ❌ Naming convention khác → `userId` vs `user_id` vs `userID`
- ❌ Design system chưa có → mỗi trang 1 style khác nhau
- ❌ State management chưa align → data flow rối
- ❌ Git conflict liên tục → merge hell

### Giải pháp: Sprint Zero → Shape Up Cycles → Kanban Polish

Kết hợp 3 framework phù hợp team 2 người, 15 ngày:

```
┌────────────────────────────────────────────────────────┐
│  SPRINT ZERO (2 ngày)          ← CÙNG LÀM, KHÔNG CHIA │
│  Align mọi thứ: design system, API contract,          │
│  DB schema, naming, folder structure, git flow         │
├────────────────────────────────────────────────────────┤
│  SHAPE UP CYCLE 1 (5 ngày)     ← CHIA VIỆC SONG SONG  │
│  "Appetite" = 5 ngày, scope = P0 features              │
│  Mỗi người tự quản, sync 5 phút/ngày                  │
├────────────────────────────────────────────────────────┤
│  SHAPE UP CYCLE 2 (5 ngày)     ← CHIA VIỆC SONG SONG  │
│  "Appetite" = 5 ngày, scope = P1 features + AI         │
│  Integration ngày 4-5                                   │
├────────────────────────────────────────────────────────┤
│  COOL-DOWN (3 ngày)            ← CÙNG LÀM              │
│  Kanban board: bug fix, polish, deploy, demo video     │
│  WIP limit = 2 tasks/người                              │
└────────────────────────────────────────────────────────┘
```

### Framework chi tiết

| Framework | Áp dụng ở đâu | Tại sao |
|-----------|--------------|--------|
| **Sprint Zero** (Agile) | Ngày 1-2 Vòng 2 | 2 người ngồi cùng, thống nhất MỌI THỨ trước khi tách ra. Không code feature nào cả. |
| **Shape Up** (Basecamp) | Cycle 1 + Cycle 2 | Fixed time (5 ngày), variable scope. Mỗi người autonomous, không standup dài — chỉ sync 5 phút. |
| **Kanban** (Lean) | Cool-down 3 ngày cuối | Board: To Do → In Progress → Testing → Done. WIP limit = 2. Pull-based: xong cái nào kéo cái tiếp. |
| **XP Pair Programming** | Sprint Zero + Integration days | 2 người code cùng 1 màn hình cho phần critical (auth, layout, data flow). |

### Công cụ quản lý

| Công cụ | Mục đích | Free? |
|---------|---------|------|
| **GitHub Projects** (Kanban board) | Task tracking, Sprint Zero → Cycle → Cool-down | ✅ |
| **GitHub Issues** | 1 issue = 1 task, label: P0/P1/P2, assign | ✅ |
| **Zalo/Discord** | Daily sync 5 phút (voice) + share screenshot | ✅ |
| **Figma** (optional) | UI mockup nếu cần align visual | ✅ Free tier |

---

## 👥 Phân vai — Hưng & Hoàng

| | Hưng (Founder) | Hoàng (Teammate) |
|---|------------------------|-------------------|
| **Vai chính** | Backend + AI Pipeline + Frontend hỗ trợ | Frontend UI/UX + CSS + Responsive |
| **Vai phụ** | DB schema + API design + báo cáo | Testing + Polish + Demo video |
| **Công cụ** | VS Code, Gemini API, Supabase, Python | VS Code, Figma, Chrome DevTools |
| **Git** | Review PR + merge `main` | Tạo PR từ `feat/*` branch |

> Hưng code cả backend lẫn frontend khi cần. Hoàng tập trung frontend + polish. AI hỗ trợ code cho cả 2.

---

# VÒNG 1 — BÁO CÁO Ý TƯỞNG (23-29/03) ✅ DONE

Báo cáo v4.0 (~1200 dòng), 9 tính năng, Vẹt Vàng mascot, YC framework.

**Việc còn lại:**

| Ngày | Hưng | Hoàng | ✅ Done khi |
|------|---------|---------|-----------|
| 23/03 | Review + chỉnh sửa báo cáo cuối | Đọc hiểu dự án + setup dev env | Báo cáo final |
| 24-25/03 | Export báo cáo PDF + format theo yêu cầu BTC | Clone repo, chạy `npm run dev`, hiểu folder structure | Hoàng chạy được project local |
| 26-29/03 | Nộp vòng 1 + viết DB schema draft | Xem mọi page prototype, ghi chú UI cần sửa | ✅ Nộp xong + Hoàng ready |

---

# VÒNG 2 — HIỆN THỰC HÓA (06-20/04, 15 ngày)

## 🗂️ DB Schema (Supabase PostgreSQL)

```
users           → id, email, name, avatar, created_at
profiles        → user_id, income, risk_score, risk_type, onboarded
budget_pots     → id, user_id, name, amount, icon, color
expenses        → id, user_id, pot_id, amount, note, photo_url, date
debts           → id, user_id, name, type, principal, rate, min_payment, due_date
risk_answers    → id, user_id, q1-q5, score, type, completed_at
vet_vang        → user_id, xp, level, streak, last_fed, mood
achievements    → id, user_id, type, earned_at, shared
fg_daily        → date, score, zone, indicators(jsonb)
briefs          → date, content, takeaways(jsonb), sentiment
news            → id, title, url, source, sentiment, published_at
market_data     → date, asset, price, change, volume
```

## 📁 Folder Structure (Next.js App Router)

```
src/
├── app/
│   ├── page.tsx                    ← Landing
│   ├── login/page.tsx              ← Auth
│   ├── register/page.tsx           ← Auth
│   ├── dashboard/
│   │   ├── page.tsx                ← Overview
│   │   ├── budget/page.tsx         ← Quỹ Chi tiêu
│   │   ├── debt/page.tsx           ← Quỹ Nợ
│   │   ├── risk-profile/page.tsx   ← Risk DNA
│   │   ├── sentiment/page.tsx      ← F&G Index
│   │   ├── brief/page.tsx          ← Morning Brief
│   │   ├── macro/page.tsx          ← Macro Map
│   │   ├── portfolio/page.tsx      ← Portfolio Advisor
│   │   ├── personal-cpi/page.tsx   ← Personal CPI
│   │   ├── market/page.tsx         ← Market Deep-Dive
│   │   ├── housing/page.tsx        ← Housing Intel
│   │   └── news/page.tsx           ← AI News
│   └── api/
│       ├── auth/[...]/route.ts
│       ├── budget/route.ts
│       ├── debt/route.ts
│       ├── risk/route.ts
│       ├── gemini/route.ts
│       ├── scraper/route.ts
│       └── vet-vang/route.ts
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   ├── charts/GaugeChart.tsx
│   ├── charts/PieChart.tsx
│   ├── cards/MetricCard.tsx
│   ├── cards/RoastCard.tsx
│   ├── vet-vang/VetVang.tsx
│   ├── vet-vang/XPBar.tsx
│   └── ui/Button.tsx, Modal.tsx, Input.tsx...
├── lib/
│   ├── supabase.ts
│   ├── gemini.ts
│   ├── scraper.ts
│   └── calculations/
│       ├── fg-index.ts
│       ├── personal-cpi.ts
│       ├── debt-optimizer.ts
│       └── risk-scoring.ts
└── styles/globals.css
```

---

## 🟡 SPRINT ZERO (06-07/04) — CÙNG LÀM, KHÔNG CHIA

> 2 người ngồi cùng, thống nhất MỌI THỨ trước khi tách ra. Không code feature nào cả.

### Ngày 1 — 06/04 — Pair Programming: Nền tảng (Hưng + Hoàng cùng ngồi)

**Session 1 (2h) — Design System & Quy ước:**
- [ ] Quyết định naming convention:
  - File: `kebab-case` (ví dụ: `metric-card.tsx`)
  - Component: `PascalCase` (ví dụ: `MetricCard`)
  - Variable/function: `camelCase`
  - DB column: `snake_case` (ví dụ: `user_id`)
  - API response JSON: `camelCase`
- [ ] Setup design tokens trong `globals.css`:
  - Color palette: `--gold-400`, `--dark-900`, `--green-500`, `--red-500`
  - Font sizes: `--text-xs` → `--text-4xl`
  - Spacing, border-radius, shadow, blur
- [ ] CÙNG tạo base components:
  - `Button.tsx` — variants: primary, secondary, ghost, danger
  - `Input.tsx` — label, error, helper text
  - `Modal.tsx` — overlay + content + close
  - `Card.tsx` — glassmorphism base card
  - `Badge.tsx` — sentiment tags (🟢🔴⚪)

**Session 2 (2h) — API Contract & Cơ sở dữ liệu:**
- [ ] Viết `docs/API_CONTRACT.md` — mọi endpoint + request/response format:
  - `POST /api/budget` → `{ name, amount, icon }` → `{ id, name, amount }`
  - `POST /api/expenses` → `{ potId, amount, note }` → `{ id, date }`
  - `POST /api/debt` → `{ name, type, principal }` → `{ id, dti }`
  - `POST /api/risk` → `{ answers: [1-5] }` → `{ score, type }`
  - `GET /api/fg-index` → `{ score, zone, indicators[] }`
  - `POST /api/vet-vang/feed` → `{ amount, note }` → `{ xp, level, roast }`
- [ ] Review + finalize DB schema (12 tables)
- [ ] Setup Supabase project + tạo tables + RLS policies
- [ ] Tạo `lib/supabase.ts` (client + server)

**✅ Done khi:** API contract xong. DB tables created. Base components render đúng. 2 người hiểu rõ data flow.

---

### Ngày 2 — 07/04 — Pair Programming: Skeleton + Auth + Layout (Hưng + Hoàng cùng ngồi)

**Session 1 (2h) — App Skeleton:**
- [ ] Tạo TẤT CẢ 15 file `page.tsx` (chỉ skeleton "Coming soon")
- [ ] CÙNG tạo `DashboardLayout.tsx`: sidebar (12 menu) + header (avatar, Vẹt Vàng icon) + main area
- [ ] Test: click navigate giữa các trang → sidebar highlight đúng

**Session 2 (2h) — Auth Flow (quan trọng, ảnh hưởng mọi trang):**
- [ ] CÙNG code Auth:
  - `login/page.tsx`: form email/password + nút Google OAuth
  - `register/page.tsx`: form đăng ký + validation
  - `api/auth/callback/route.ts`: OAuth callback
  - Middleware: protect `/dashboard/*`, redirect chưa login
  - Test: đăng ký → login → dashboard → logout → redirect login

**Session 3 (1h) — Git Flow + Kanban Board:**
- [ ] Setup git branching: `main` (protected), `feat/*` per feature
- [ ] Setup GitHub Projects board: Sprint Zero | Cycle 1 | Cycle 2 | Cool-down
- [ ] PR template: What changed? / Screenshot / How to test?
- [ ] Tạo GitHub Issues cho toàn bộ tasks Cycle 1 + Cycle 2, gán nhãn P0/P1/P2

**✅ Done khi:** Auth E2E hoàn chỉnh. Layout đầy đủ. 15 skeletons. Git flow. → **BÂY GIỊ MỚI TÁCH RA LÀM SONG SONG.**

---

## 🔵 SHAPE UP CYCLE 1 (08-12/04) — P0 FEATURES (CHIA VIỆC SONG SONG)

> **Appetite:** 5 ngày. **Scope:** Landing + Dashboard + Quỹ Chi tiêu + Quỹ Nợ + Risk DNA.
> Mỗi người tự quản task, sync Zalo 5 phút mỗi tối (“xong gì, stuck gì, mai làm gì”).

### Ngày 3 — 08/04 — Landing + Dashboard Overview

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `app/api/scraper/route.ts`: fetch VN-Index, Vàng SJC, USD/VND, BTC từ vnstock
- [ ] Tạo cron logic: schedule scrape mỗi 30 phút (hoặc ISR revalidate)
- [ ] API route trả về 4 metrics dạng JSON: `{name, value, change, trend}`
- [ ] Commit: `feat: market data scraper`

**Hoàng (Frontend):**
- [ ] Tạo `components/cards/MetricCard.tsx`: hiển thị 1 metric (value, % change, up/down arrow, color)
- [ ] Tạo `dashboard/page.tsx`: grid 4 MetricCards (VN-Index, Vàng, USD, BTC)
- [ ] Thêm placeholder sections: Mini F&G gauge, Brief preview, News preview
- [ ] Dark theme: gradient background, card borders subtle glow
- [ ] Commit: `feat: dashboard overview + metric cards`

**✅ Done khi:** Dashboard hiển thị 4 chỉ số thị trường real-time, auto-refresh. Dark theme premium.

---

### Ngày 4 — 09/04 (Thứ 4) — Quỹ Chi tiêu

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `app/api/budget/route.ts`:
  - `GET`: lấy tất cả lọ của user
  - `POST`: tạo lọ mới (name, amount, icon)
  - `PUT`: sửa lọ
  - `DELETE`: xóa lọ
- [ ] Tạo `app/api/expenses/route.ts`:
  - `POST`: thêm expense (amount, pot_id, note, date)
  - `GET`: list expenses theo pot/date range
- [ ] Business logic: cảnh báo khi expense > 80% budget pot
- [ ] Commit: `feat: budget & expense CRUD API`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/budget/page.tsx`:
  - Header: "Quỹ Chi tiêu" + tổng thu nhập
  - Grid "lọ": mỗi lọ 1 card (icon, tên, allocated, spent, remaining, progress bar)
  - Nút "Thêm lọ" → Modal form
  - Nút "Ghi chi tiêu" → Modal: chọn lọ, nhập số tiền, ghi chú
- [ ] Tạo `components/charts/PieChart.tsx` (Recharts): tỷ trọng các lọ
- [ ] Color coding: xanh (< 60%), vàng (60-80%), đỏ (> 80% budget)
- [ ] Commit: `feat: budget UI + pie chart`

**✅ Done khi:** User tạo 5 lọ → ghi 3 khoản chi → pie chart cập nhật → cảnh báo khi vượt 80%.

---

### Ngày 5 — 10/04 (Thứ 5) — Quỹ Nợ

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `app/api/debt/route.ts`: CRUD khoản nợ
- [ ] Tạo `lib/calculations/debt-optimizer.ts`:
  - `calculateDTI(debts, income)` → ratio %
  - `snowballPlan(debts)` → trả khoản nhỏ nhất trước
  - `avalanchePlan(debts)` → trả lãi cao nhất trước
  - `hiddenInterestCalc(debt)` → tính lãi ẩn + phí
- [ ] Commit: `feat: debt CRUD + optimizer algorithms`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/debt/page.tsx`:
  - Summary cards: Tổng nợ, DTI ratio (gauge), Tổng lãi phải trả
  - Danh sách nợ: table/cards (tên, loại, gốc, lãi, min payment, due date)
  - Nút "Thêm khoản nợ" → Modal form (5 loại: tín dụng, vay nhà, bạn bè, tín dụng đen, xây nhà)
  - Tab "Lộ trình thoát nợ": toggle Snowball vs Avalanche → timeline chart
- [ ] DTI gauge: xanh (< 20%), vàng (20-40%), đỏ (> 40%)
- [ ] Commit: `feat: debt dashboard UI + DTI gauge`

**✅ Done khi:** User thêm 3 khoản nợ → thấy DTI → chọn Snowball/Avalanche → thấy timeline trả nợ.

---

### Ngày 6 — 11/04 (Thứ 6) — Risk DNA

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `lib/calculations/risk-scoring.ts`:
  - 5 câu hỏi tình huống (Prospect Theory)
  - Scoring: 1-3 per câu → total 5-15
  - Mapping: 5-8 Bảo thủ, 9-12 Cân bằng, 13-15 Tăng trưởng
  - Traits + AI advice per profile
- [ ] Tạo `app/api/risk/route.ts`: save answers + score
- [ ] Commit: `feat: risk DNA scoring + API`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/risk-profile/page.tsx`:
  - Quiz flow: 5 screens, 1 câu hỏi/screen, progress bar
  - Mỗi câu: 3 options (A/B/C) dạng card chọn, animation highlight
  - Result screen: Profile name + emoji + score bar + traits list
  - "Chia sẻ kết quả" button → generate shareable card (canvas/html2canvas)
  - "Làm lại" button
- [ ] Shareable card: gradient background + profile name + score + VietFi branding
- [ ] Commit: `feat: risk DNA quiz UI + shareable card`

**✅ Done khi:** User trả lời 5 câu → thấy "Nhà đầu tư Tăng trưởng 🚀" → share card ra ảnh đẹp.

---

### Ngày 7 — 12/04 (Thứ 7) — Integration + Polish

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Test end-to-end: Register → Login → Tạo lọ → Ghi chi tiêu → Thêm nợ → Risk DNA
- [ ] Fix bugs: API errors, validation, edge cases (empty state, 0 income)
- [ ] Setup error handling: loading states, error boundaries, toast notifications
- [ ] Commit: `fix: integration bugs + error handling`

**Hoàng (Frontend):**
- [ ] Responsive check TẤT CẢ 6 trang: mobile 375px, tablet 768px, desktop 1440px
- [ ] Fix: sidebar collapse trên mobile → hamburger menu
- [ ] Empty states: khi chưa có lọ/nợ/risk → hiển thị illustration + CTA "Bắt đầu"
- [ ] Loading skeletons: shimmer effect khi fetch data
- [ ] Micro-animations: card hover, button press, page transition (Framer Motion)
- [ ] Commit: `fix: responsive + empty states + animations`

**✅ Checkpoint Tuần 1:** Auth + Quỹ Chi tiêu + Quỹ Nợ + Risk DNA chạy end-to-end trên cả mobile + desktop. **→ Đây đã là MVP nộp được rồi.**

---

## 🔵 SHAPE UP CYCLE 2 (13-20/04) — AI + TÍNH NĂNG NÂNG CAO + DEPLOY

### Ngày 8 — 13/04 (Chủ nhật) — Scraper + F&G Index

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `lib/scraper.ts`:
  - `scrapeVnExpress()`: parse RSS XML → extract title, url, published_at
  - `scrapeVnstock()`: fetch VN-Index, top gainers/losers, khối ngoại
  - `scrapeFX()`: USD/VND, BTC từ vnstock FX module
- [ ] Tạo `lib/calculations/fg-index.ts`:
  - 5 indicators: VN-Index momentum, khối ngoại, sentiment NLP, breadth, spread
  - Z-score normalization per indicator
  - Weighted average → score 0-100
  - Zone mapping: 0-20 Extreme Fear, 21-40 Fear, 41-60 Neutral, 61-80 Greed, 81-100 Extreme Greed
- [ ] Save daily score vào `fg_daily` table
- [ ] Commit: `feat: scraper + F&G index algorithm`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/sentiment/page.tsx`:
  - Hero: Gauge chart lớn (0-100) + zone label + color
  - Tạo `components/charts/GaugeChart.tsx`: SVG arc + needle + animation
  - 7-day history: bar chart (Recharts) + color per zone
  - 5 indicator cards: tên + value + weight + mini sparkline
  - "Hôm nay nên...": AI gợi ý 1 dòng dựa trên F&G score
- [ ] Commit: `feat: F&G Index page + gauge chart`

**✅ Done khi:** F&G page hiển thị score real-time, gauge animation smooth, 7-day history đúng data.

---

### Ngày 9 — 14/04 (Thứ 2) — AI Agents + Morning Brief

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `lib/gemini.ts`: wrapper Gemini API call + retry + rate limit
- [ ] Agent 1 — News Collector: fetch VnExpress → extract key facts
- [ ] Agent 2 — Sentiment Analyzer: news text → Bullish/Bearish/Neutral tag + confidence score
- [ ] Agent 5 — Brief Generator: combine all data → 4 key takeaways in Vietnamese
- [ ] Tạo `app/api/gemini/brief/route.ts`: generate + cache morning brief
- [ ] Commit: `feat: gemini agents 1,2,5 + brief generator`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/brief/page.tsx`:
  - Header: "Bản Tin Sáng" + date + F&G mini badge
  - 4 takeaway cards: icon + 1 paragraph each (CK, Vàng, Crypto, Macro)
  - "Hành động gợi ý" section: 2-3 bullet points
  - Bottom: "Powered by Gemini AI" disclaimer
- [ ] Tạo `dashboard/news/page.tsx`:
  - News feed: card list (title, source, time, sentiment tag 🟢🔴⚪)
  - Filter: All / Bullish / Bearish / by asset class
  - Bookmark button per news item
- [ ] Commit: `feat: morning brief + news feed UI`

**✅ Done khi:** Morning Brief hiển thị 4 takeaways AI-generated, News feed có sentiment tags.

---

### Ngày 10 — 15/04 (Thứ 3) — Macro + Portfolio

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Agent 3 — Macro Analyzer: fetch World Bank API → GDP, CPI, Interest Rate, FDI, Export data
- [ ] Tạo `app/api/gemini/macro/route.ts`: AI nhận định macro per asset class
- [ ] Agent 4 — Portfolio Advisor: input (capital + risk profile) → allocation %
- [ ] Tạo `app/api/gemini/portfolio/route.ts`: generate allocation + 10-year projection
- [ ] Commit: `feat: macro + portfolio AI agents`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/macro/page.tsx`:
  - 6 Indicator Cards: GDP, CPI YoY, Lãi suất 12T, USD/VND, FDI, Xuất khẩu
  - 3 Charts (Recharts): CPI trend (AreaChart), Interest Rate (LineChart), FX (AreaChart)
  - AI Macro Commentary box (styled card)
- [ ] Tạo `dashboard/portfolio/page.tsx`:
  - Input: tổng vốn (VNĐ) + risk profile (auto-filled from Risk DNA)
  - PieChart: % phân bổ (Tiết kiệm / Vàng / CK / Crypto / BĐS-REIT)
  - BarChart: dự phóng tài sản 1-10 năm (3 scenarios: pessimistic/base/optimistic)
  - AI recommendation text box
- [ ] Commit: `feat: macro map + portfolio advisor UI`

**✅ Done khi:** Macro page hiển thị 6 chỉ số + 3 charts. Portfolio input → pie chart + 10-year projection.

---

### Ngày 11 — 16/04 (Thứ 4) — Personal CPI

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `lib/calculations/personal-cpi.ts`:
  - Input: 7 categories spending (Food, Housing, Transport, Healthcare, Education, Entertainment, Other)
  - GSO data: category CPI values (hardcoded from real data)
  - Formula: Σ(user_weight × category_CPI)
  - Output: personal CPI %, delta vs official CPI
- [ ] Tạo `app/api/cpi/route.ts`: calculate + save result
- [ ] Commit: `feat: personal CPI calculation`

**Hoàng (Frontend):**
- [ ] Tạo `dashboard/personal-cpi/page.tsx`:
  - Input form: 7 sliders hoặc number inputs per category (VNĐ/tháng)
  - Result: big number "Lạm phát của bạn: X.X%" vs "CPI chính thức: 3.31%"
  - Comparison bar chart: per category (color-coded by severity)
  - "Aha moment" animation khi kết quả > 2× CPI chính thức
  - Share button: generate card "Lạm phát thực của mình gấp đôi!" + VietFi branding
- [ ] Commit: `feat: personal CPI calculator UI`

**✅ Done khi:** User nhập chi tiêu → thấy Personal CPI → so sánh vs chính thức → share card.

---

### Ngày 12 — 17/04 (Thứ 5) — Vẹt Vàng AI 🦜

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Tạo `app/api/vet-vang/route.ts`:
  - `GET /mood`: tính mood dựa trên streak + last_fed + spending behavior
  - `POST /feed`: ghi chi tiêu = cho vẹt ăn → +XP
  - `GET /roast`: Gemini generate 1 câu roast/khen/thâm dựa trên data user
- [ ] Prompt engineering 3 chế độ:
  - Mổ: "Bạn là Vẹt Vàng, giọng xéo sắc Hà Nội, xưng tao-mày. User chi vượt lọ X%. Chửi 1 câu ngắn funny."
  - Khen: "User tiết kiệm đạt target. Khen 1 câu dùng thành ngữ VN."
  - Thâm: "User sắp vượt lọ. Nói passive-aggressive 1 câu."
- [ ] XP + Level logic: calculate level from total XP, update streak
- [ ] Commit: `feat: vet vang AI + XP engine`

**Hoàng (Frontend):**
- [ ] Tạo `components/vet-vang/VetVang.tsx`: Vẹt avatar (emoji/SVG) + speech bubble
- [ ] Tạo `components/vet-vang/XPBar.tsx`: progress bar + level badge + streak count 🔥
- [ ] Tạo `components/cards/RoastCard.tsx`: shareable card (gradient bg + roast text + vẹt avatar + VietFi branding)
- [ ] Tích hợp Vẹt Vàng vào Dashboard: floating widget góc phải dưới
- [ ] "Mổ tôi đi" button: trigger roast → display speech bubble animation
- [ ] Commit: `feat: vet vang UI + roast card + XP bar`

**✅ Done khi:** Vẹt Vàng hiện trên dashboard, user ghi chi tiêu → XP tăng, click "Mổ" → nhận roast. Share card ra ảnh đẹp.

---

### Ngày 13 — 18/04 (Thứ 6) — Integration + Polish

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Kết nối F&G score vào Dashboard mini gauge
- [ ] Kết nối Brief vào Dashboard preview (3 dòng)
- [ ] Kết nối News vào Dashboard (4 tin mới nhất)
- [ ] Vẹt Vàng notifications: trigger khi chi vượt lọ, 3 ngày không mở app
- [ ] Test API endpoints TOÀN BỘ (27 FR)
- [ ] Commit: `feat: dashboard integration + vet vang notifications`

**Hoàng (Frontend):**
- [ ] Dashboard Overview: fill real data (4 metrics + F&G mini + Brief preview + News)
- [ ] Navigation: sidebar highlight active page, breadcrumb
- [ ] Toast notifications (react-hot-toast): success/error/warning
- [ ] Loading states TẤT CẢ pages: skeleton shimmer
- [ ] Page transitions: Framer Motion fade + slide
- [ ] Commit: `fix: dashboard polish + transitions`

**✅ Done khi:** Dashboard Overview đầy đủ data. Navigation smooth. Mọi trang load có skeleton.

---

### Ngày 14 — 19/04 (Thứ 7) — Final Testing

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Full E2E test: Register → Onboard → Tạo lọ → Ghi chi tiêu → Vẹt mổ → Thêm nợ → Risk DNA → Xem Brief → F&G → CPI → Portfolio
- [ ] Edge cases: empty state, 0 income, 100% DTI, max nợ, no internet
- [ ] Performance: Lighthouse audit → target 90+ Performance
- [ ] Fix critical bugs
- [ ] Commit: `fix: final bugfixes`

**Hoàng (Frontend):**
- [ ] Mobile responsive check: iPhone SE (375px), iPhone 14 (390px), iPad (768px)
- [ ] Cross-browser: Chrome, Firefox, Safari (nếu có Mac)
- [ ] Dark mode consistency check: mọi component đều dark
- [ ] Accessibility: color contrast 4.5:1+, focus states, aria-labels
- [ ] Fix UI bugs
- [ ] Commit: `fix: responsive + a11y final`

**✅ Done khi:** Lighthouse 90+ Performance. Chạy smooth trên mobile + desktop. Không crash.

---

### Ngày 15 — 20/04 (Chủ nhật) — Deploy + Demo

**Hưng (Backend + Frontend hỗ trợ):**
- [ ] Deploy lên Vercel: connect GitHub repo → auto deploy
- [ ] Setup env vars trên Vercel: `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`
- [ ] Test production URL: mọi flow chạy OK
- [ ] Seed demo data: 5 lọ + 10 expenses + 3 debts + Risk DNA done + F&G 7 ngày
- [ ] Viết hướng dẫn demo cho team
- [ ] Commit: `chore: deploy + seed data`

**Hoàng (Frontend):**
- [ ] Quay demo video 3-5 phút:
  - 0:00-0:30: Landing page + đăng ký
  - 0:30-1:30: Dashboard overview + metric cards
  - 1:30-2:30: Quỹ Chi tiêu + Quỹ Nợ (tạo lọ, ghi chi tiêu, thêm nợ)
  - 2:30-3:30: Risk DNA quiz + shareable card
  - 3:30-4:30: F&G Index + Morning Brief + Vẹt Vàng roast
  - 4:30-5:00: Outro + VietFi branding
- [ ] Edit video: thêm captions, zoom vào key moments
- [ ] Upload video

**✅ Checkpoint:** App live trên Vercel + demo video → ✅ **NỘP VÒNG 2**

---

# BUFFER (21/04 - 08/05) — POLISH + THUYẾT TRÌNH

| Ngày | Hưng | Hoàng |
|------|---------|---------|
| 21-24/04 | Market Deep-Dive page (P2) | Housing Intel page (P2) |
| 25-27/04 | Fix bugs từ feedback BTC + seed thêm data | UI polish: animations, hover effects, scrolling |
| 28-30/04 | Slide thuyết trình (15 slides max) | Quay lại demo video pro hơn (captions, music) |
| 01-04/05 | Viết Q&A prep: 20 câu hỏi dự đoán + trả lời | Review toàn bộ app + final responsive check |
| 05-08/05 | Tập thuyết trình 3 lần (record + xem lại) | Chuẩn bị backup: video demo offline nếu live fail |

---

# VÒNG 3 — THUYẾT TRÌNH (09/05)

| Phút | Nội dung | Ai | Slide |
|------|---------|-----|-------|
| 0-2 | Câu chuyện: "18 tuổi, tôi ước có app này..." + vấn đề Gen Z | Hưng | 1-3 |
| 2-4 | Demo live: Dashboard → Quỹ Chi tiêu → ghi chi tiêu | Hoàng điều khiển | Live |
| 4-6 | Demo: Quỹ Nợ → thêm nợ → xem DTI → Snowball plan | Hoàng điều khiển | Live |
| 6-8 | Demo: Risk DNA quiz → shareable card → Vẹt Vàng mổ | Hoàng điều khiển | Live |
| 8-10 | Kiến trúc: 6 AI Agents + MOAT 4 tầng + 10x Better | Hưng | 8-12 |
| 10-13 | Viral strategy: Vẹt Vàng marketing + growth plan | Hưng | 13-14 |
| 13-15 | Kết luận + CTA | Hưng | 15 |
| 15-20 | Q&A | Cả 2 | — |

**Backup plan:** Nếu internet chết → chuyển sang video demo đã quay sẵn.


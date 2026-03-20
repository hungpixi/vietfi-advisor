# 🦜 VietFi Advisor — Cố Vấn Tài Chính AI Cho Người Việt

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini_2.0-Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3ECF8E?logo=supabase)](https://supabase.com/)
[![Deploy](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vietfi-advisor.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Dự án thi WDA 2026** — Ứng dụng web giúp người Việt quản lý tài chính cá nhân thông minh bằng AI, gamification, và dữ liệu thị trường thời gian thực.

![Dashboard Preview](./public/docs/audit_dashboard_1773930999275.png)

---

## 📋 Mục Lục

- [Tổng Quan](#-tổng-quan)
- [Tech Stack](#-tech-stack)
- [Cài Đặt & Chạy](#-cài-đặt--chạy)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Tính Năng Đã Hoàn Thành](#-tính-năng-đã-hoàn-thành)
- [Quá Trình Tư Duy](#-quá-trình-tư-duy)
- [Trạng Thái Hiện Tại & Việc Cần Làm](#-trạng-thái-hiện-tại--việc-cần-làm)
- [Bàn Giao Cho Hoàng — Crawl Data](#-bàn-giao-cho-hoàng--crawl-data)
- [API Routes & Endpoints](#-api-routes--endpoints)
- [Liên Hệ](#-liên-hệ)

---

## 🎯 Tổng Quan

**Vấn đề:** Người trẻ Việt Nam thiếu công cụ quản lý tài chính phù hợp — các app nước ngoài không hiểu context VN (vàng SJC, lãi suất huy động, tín dụng đen, trả góp...).

**Giải pháp:** VietFi Advisor = Duolingo + Mint + ChatGPT nhưng cho tài chính Việt Nam:
- 🦜 **Vẹt Vàng AI** — Trợ lý ảo xéo sắc, xưng tao-mày, nhắc nhở chi tiêu
- 🎮 **Gamification** — Streak, XP, Leaderboard, Badges — biến quản lý tiền thành thói quen
- 📊 **Data thị trường** — VN-Index, Vàng SJC, USD/VND, Fear & Greed Index
- 📚 **Micro-learning** — Bài học tài chính 60 giây, quiz nhanh

---

## 🛠 Tech Stack

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| **Framework** | Next.js 16.1.7 + React 19 | App Router, Edge Runtime |
| **Styling** | Tailwind CSS v4 | Utility-first |
| **UI** | Framer Motion + Recharts + Lucide Icons | Charts & animations |
| **AI** | Gemini 2.0 Flash (Vercel AI SDK 6.0) | Streaming, retry, JSON output |
| **TTS** | Web Speech API (vi-VN) | Tự động đọc câu trả lời AI |
| **STT** | Web Speech API (webkitSpeechRecognition) | Voice input tiếng Việt |
| **Auth** | Supabase Auth + `@supabase/ssr` | Email+Password, SSR cookie-based sessions |
| **Database** | Supabase PostgreSQL | Auth users, RLS-ready |
| **Scraping** | Cheerio (installed) | Chờ Hoàng implement crawl |
| **Deploy** | Vercel | ✅ Production live |

---

## 🚀 Cài Đặt & Chạy

```bash
# 1. Clone
git clone https://github.com/hungpixi/vietfi-advisor.git
cd vietfi-advisor

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env.local
# Điền GEMINI_API_KEY (bắt buộc)
# Điền SUPABASE keys (nếu có)

# 4. Chạy dev
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Key | Bắt buộc | Mô tả |
|-----|----------|-------|
| `GEMINI_API_KEY` | ✅ | Google AI API key cho Vẹt Vàng chatbot |
| `GEMINI_BASE_URL` | ❌ | Proxy URL nếu cần bypass (VD: Cloudflare Worker) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `CRON_SECRET` | ❌ | Secret cho cron job API |

---

## 📂 Cấu Trúc Dự Án

```
vietfi-advisor/
├── src/
│   ├── proxy.ts                        # 🔐 Next.js 16 proxy (session refresh)
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout + fonts
│   │   ├── globals.css                 # Tailwind v4 config
│   │   ├── login/                      # 🔐 Auth pages
│   │   │   ├── page.tsx                # Login/Signup form
│   │   │   └── actions.ts              # Server actions (login, signup)
│   │   ├── auth/                       # 🔐 Auth routes
│   │   │   ├── confirm/route.ts        # Email OTP confirmation
│   │   │   └── signout/route.ts        # Sign out handler
│   │   ├── api/
│   │   │   ├── chat/route.ts           # Gemini streaming API
│   │   │   └── tts/route.ts            # Text-to-Speech API
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # 📊 Tổng quan (hub chính)
│   │   │   ├── layout.tsx              # Sidebar + Gamification bar
│   │   │   ├── budget/page.tsx         # 💰 Quỹ Chi tiêu (6 Hũ)
│   │   │   ├── debt/page.tsx           # 💳 Quỹ Nợ (Avalanche/Snowball)
│   │   │   ├── personal-cpi/page.tsx   # 📉 Lạm phát cá nhân
│   │   │   ├── leaderboard/page.tsx    # 🏆 Bảng xếp hạng
│   │   │   ├── learn/page.tsx          # 📚 Bài học 60 giây
│   │   │   ├── sentiment/page.tsx      # 🌡️ Nhiệt kế thị trường
│   │   │   ├── news/page.tsx           # 🗞️ Tin tức AI
│   │   │   ├── macro/page.tsx          # 📈 Xu hướng kinh tế
│   │   │   ├── risk-profile/page.tsx   # 🧬 Tính cách đầu tư
│   │   │   └── portfolio/page.tsx      # 🥧 Cố vấn danh mục
│   │   └── test/                       # Pages thử nghiệm
│   ├── components/
│   │   ├── vet-vang/
│   │   │   ├── VetVangFloat.tsx        # Floating button mở chat
│   │   │   └── VetVangChat.tsx         # Chat window + TTS + STT
│   │   ├── gamification/
│   │   │   ├── Badges.tsx              # 8 huy hiệu
│   │   │   ├── Celebration.tsx         # Confetti lên level
│   │   │   ├── ShareCard.tsx           # Share MXH
│   │   │   ├── WeeklyReport.tsx        # Báo cáo tuần
│   │   │   └── XPToast.tsx             # Popup +XP
│   │   └── onboarding/
│   │       └── QuickSetupWizard.tsx     # Setup thu nhập ban đầu
│   └── lib/
│       ├── gemini.ts                   # callGemini + callGeminiJSON (retry)
│       ├── supabase.ts                 # Legacy client (backward compat)
│       ├── supabase/                   # 🔐 SSR Auth clients
│       │   ├── client.ts              # Browser client (@supabase/ssr)
│       │   ├── server.ts              # Server client (cookie-based)
│       │   └── middleware.ts          # Session refresh helper
│       ├── gamification.ts             # XP, Streak, Levels, Badges
│       ├── onboarding-state.ts         # Trạng thái onboarding
│       └── calculations/
│           ├── debt-optimizer.ts       # Avalanche & Snowball solver
│           ├── fg-index.ts             # Fear & Greed Index VN
│           ├── personal-cpi.ts         # CPI cá nhân calculator
│           └── risk-scoring.ts         # Chấm điểm rủi ro đầu tư
├── public/
│   ├── assets/                         # Mascot images (5 levels)
│   ├── docs/                           # Screenshots cho README
│   └── quotes.json                     # 40 quotes cho Vẹt Vàng
├── scripts/
│   └── generate_audio.py              # VieNeu-TTS voice pipeline
├── voice_ref/                          # Voice reference files (gitignored)
├── ui-prototype/                       # HTML prototype ban đầu
└── context.md                          # 🔒 API keys (gitignored)
```

---

## ✅ Tính Năng Đã Hoàn Thành

### 1. Vẹt Vàng AI Chatbot
- Gemini 2.0 Flash streaming qua Edge Runtime
- Personality: xưng tao-mày, roast chi tiêu, <50 chữ per response
- Voice Input: nhận diện giọng nói tiếng Việt (Web Speech API)
- Voice Output: TTS tự động đọc câu trả lời (pitch 1.3 cho giọng vẹt)
- 4 Quick Actions: Phân tích chi tiêu, Tư vấn nợ, Đầu tư, Motivate
- Mascot thay đổi ảnh theo Level (5 levels)

### 2. Quản Lý Tài Chính
- **Quỹ Chi tiêu (6 Hũ):** CRUD thu nhập/chi tiêu, biểu đồ Recharts, cảnh báo overspending
- **Quỹ Nợ:** Nhập nợ → Avalanche/Snowball optimizer → timeline trả nợ
- **Lạm phát cá nhân:** So sánh CPI cá nhân vs quốc gia dựa trên giỏ hàng thực tế
- **Tính cách đầu tư:** Quiz 12 câu → risk scoring → profile (Bảo thủ/Cân bằng/Mạo hiểm)
- **Cố vấn danh mục:** Đề xuất tỷ trọng portfolio dựa trên Risk DNA

### 3. Thị Trường & Vĩ Mô
- Nhiệt kế thị trường (Fear & Greed Index VN)
- Xu hướng kinh tế (GDP, CPI, lãi suất)
- Tin tức AI (tóm tắt bằng AI)
- **⚠️ Hiện tại data hardcoded — chờ Hoàng implement crawl**

### 4. Gamification
- XP System (+10 mỗi action)
- 5 Levels: Vẹt Con → Teen → Trưởng thành → Đại Gia → Ông Hoàng
- Streak (ngày liên tiếp), 8 Badges, Confetti celebrations
- Bảng xếp hạng (1 user + 14 bot AI)
- Micro-learning: 12+ bài học 60s + quiz

---

## 🧠 Quá Trình Tư Duy

### Tại sao chọn Gamification?
Nghiên cứu cho thấy **75% Gen Z bỏ app tài chính sau 2 tuần** vì nhàm chán. Duolingo đã chứng minh gamification giữ chân user. VietFi Advisor áp dụng mô hình tương tự:
- **Streak** tạo FOMO (sợ mất chuỗi)
- **Leaderboard** tạo áp lực đồng trang lứa
- **XP + Level** cho dopamine hit mỗi lần ghi chi tiêu

### Tại sao tự build AI thay vì dùng Chatbot có sẵn?
- Chatbot generic không hiểu context VN (vàng SJC, tín dụng đen, trả góp 0%)
- Gemini 2.0 Flash đủ nhanh cho streaming real-time
- System prompt được customized sâu cho tính cách "Vẹt xéo sắc"

### Điểm khác biệt so với các app tài chính VN hiện tại?
| App hiện tại | VietFi Advisor |
|---|---|
| Chỉ ghi chép thu chi | Phân tích + AI tư vấn |
| UI nhàm chán | Gamification + Mascot |
| Không có context VN | Fear & Greed Index VN, vàng SJC, lãi suất NHNN |
| Không có voice | Voice input + TTS output |

---

## 🔴 Trạng Thái Hiện Tại & Việc Cần Làm

### Đã xong ✅
- [x] Landing page
- [x] 10 dashboard pages (UI + logic)
- [x] Vẹt Vàng AI chatbot (Gemini streaming)
- [x] TTS + STT (Web Speech API)
- [x] Gamification system đầy đủ
- [x] 4 calculation engines
- [x] Voice clone pipeline (VieNeu-TTS script)
- [x] **Supabase Auth** — Email+Password, SSR cookie sessions, login/signup page
- [x] **Vercel Deploy** — Production live tại [vietfi-advisor.vercel.app](https://vietfi-advisor.vercel.app)

### 🔴 Phase 1: Database Schema & Migration
- [x] ~~Tạo Supabase project~~ ✅ (ID: `ttwymfmgqpkffexmjqzj`)
- [x] ~~Supabase Auth~~ ✅ (Email+Password, `@supabase/ssr`)
- [ ] DB schema (users, expenses, debts, portfolios)
- [ ] Migrate localStorage → Supabase
- [ ] RLS policies bảo mật

### 🔴 Phase 2: Live Data — **[Hoàng phụ trách]**
- [ ] Crawl VN-Index, Vàng SJC, USD/VND (xem mục bàn giao bên dưới)
- [ ] Cron job Gemini summarize → Morning Brief AI
- [ ] News scrape + tóm tắt
- [ ] Fear & Greed Index live

### 🟡 Phase 3: Mobile & Polish
- [x] ~~Vercel deploy~~ ✅
- [ ] PWA manifest + service worker
- [ ] Responsive audit

### 🟢 Phase 4: Polish
- [ ] Voice clone tích hợp web
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Performance optimization

---

## 👋 Bàn Giao Cho Hoàng — Crawl Data

### Nhiệm vụ chính
Hoàng phụ trách crawl/scrape dữ liệu thị trường tài chính Việt Nam và đổ vào các API route để dashboard hiển thị data thật thay vì hardcoded.

### 1. Dữ liệu cần crawl

| # | Data | Nguồn gợi ý | Tần suất | Output format |
|---|------|-------------|----------|---------------|
| 1 | **VN-Index** (giá, % thay đổi) | `cafef.vn`, `vndirect.com.vn`, SSI API | Mỗi 15 phút (giờ giao dịch) | `{ value: number, change: number, changePercent: number }` |
| 2 | **Vàng SJC** (giá mua/bán) | `sjc.com.vn`, `giavang.net` | Mỗi 30 phút | `{ buy: number, sell: number, change: number }` |
| 3 | **USD/VND** (tỷ giá) | `vietcombank.com.vn`, SBV | Mỗi giờ | `{ rate: number, change: number }` |
| 4 | **Tin tức tài chính** (title, summary, url) | `cafef.vn`, `vnexpress.net/kinh-doanh` | Mỗi 2 giờ | `[{ title, summary, url, source, publishedAt }]` |
| 5 | **Lãi suất huy động** | `sbv.gov.vn`, các ngân hàng | Mỗi ngày | `{ bank, term, rate }[]` |
| 6 | **Bitcoin/Crypto** | CoinGecko API (free) | Mỗi 15 phút | `{ btc_usd: number, change24h: number }` |

### 2. Cách tích hợp vào dự án

```
src/app/api/
├── market/
│   ├── route.ts          ← API endpoint trả data thị trường
│   └── cron/route.ts     ← Cron job chạy mỗi 15 phút (Vercel Cron)
├── news/
│   └── route.ts          ← API endpoint trả tin tức AI-summarized
```

**Flow:**
```
Cron trigger (15 phút)
  → Hoàng's scraper function chạy
  → Lưu data vào Supabase table `market_data`
  → Dashboard page fetch từ API route
  → Hiển thị data thật
```

### 3. Files Hoàng cần tạo/sửa

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/lib/scrapers/market.ts` | **TẠO MỚI** | Hàm crawl VN-Index, Gold, USD |
| `src/lib/scrapers/news.ts` | **TẠO MỚI** | Hàm crawl tin tức + gọi Gemini tóm tắt |
| `src/app/api/market/route.ts` | **TẠO MỚI** | GET endpoint trả data mới nhất |
| `src/app/api/market/cron/route.ts` | **TẠO MỚI** | POST endpoint cho Vercel Cron |
| `src/app/dashboard/page.tsx` | **SỬA** | Thay hardcoded data bằng fetch API |
| `src/app/dashboard/sentiment/page.tsx` | **SỬA** | Thay hardcoded bằng live data |
| `src/app/dashboard/news/page.tsx` | **SỬA** | Thay hardcoded bằng live data |
| `src/app/dashboard/macro/page.tsx` | **SỬA** | Thay hardcoded bằng live data |

### 4. Dependencies đã cài sẵn

```bash
# Cheerio — HTML parser (đã có trong package.json)
npm ls cheerio
# → cheerio@1.2.0

# Gemini — để AI tóm tắt tin tức (đã có)
# Xem src/lib/gemini.ts → callGemini(prompt) / callGeminiJSON<T>(prompt)
```

### 5. Code mẫu cho Hoàng

```typescript
// src/lib/scrapers/market.ts
import * as cheerio from "cheerio";

export interface MarketData {
  vnIndex: { value: number; change: number; changePercent: number };
  goldSjc: { buy: number; sell: number; change: number };
  usdVnd:  { rate: number; change: number };
  btcUsd:  { price: number; change24h: number };
  updatedAt: string;
}

export async function scrapeMarketData(): Promise<MarketData> {
  // TODO: Hoàng implement
  // 1. Fetch HTML từ cafef.vn / sjc.com.vn
  // 2. Parse bằng cheerio
  // 3. Return structured data

  // Ví dụ fetch VN-Index:
  const res = await fetch("https://cafef.vn/", { next: { revalidate: 900 } });
  const html = await res.text();
  const $ = cheerio.load(html);
  // ... parse DOM ...

  throw new Error("Hoàng chưa implement!");
}
```

```typescript
// src/lib/scrapers/news.ts
import * as cheerio from "cheerio";
import { callGeminiJSON } from "@/lib/gemini";

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function scrapeAndSummarizeNews(): Promise<NewsItem[]> {
  // 1. Crawl headlines từ cafef / vnexpress
  // 2. Gọi Gemini tóm tắt
  // 3. Return array of NewsItem
  throw new Error("Hoàng chưa implement!");
}
```

### 6. Lưu ý quan trọng cho Hoàng

> ⚠️ **KHÔNG hardcode API keys** — tất cả keys phải nằm trong `.env.local`
>
> ⚠️ **Context.md** chứa Gemini API key, hỏi Hưng để lấy
>
> ⚠️ **Rate limiting** — các trang VN (cafef, sjc) hay block nếu request quá nhiều → dùng cache + revalidate
>
> ⚠️ **Cheerio đã cài** — không cần puppeteer/playwright cho scraping (tránh nặng)
>
> ⚠️ **Vercel Edge Runtime** — API routes nên dùng edge, cheerio hoạt động tốt trên edge

### 7. Cách test

```bash
# Chạy dev server
npm run dev

# Test API endpoint
curl http://localhost:3000/api/market

# Test cron (simulate)
curl -X POST http://localhost:3000/api/market/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🔌 API Routes & Endpoints

| Method | Endpoint | Mô tả | Status |
|--------|----------|-------|--------|
| POST | `/api/chat` | Gemini streaming chat (Vẹt Vàng) | ✅ Hoạt động |
| POST | `/api/tts` | Text-to-Speech (edge-tts) | ✅ Hoạt động |
| GET | `/auth/confirm` | Email OTP confirmation | ✅ Hoạt động |
| POST | `/auth/signout` | Sign out user | ✅ Hoạt động |
| GET | `/api/market` | Data thị trường (VN-Index, Gold, USD) | ❌ Chờ Hoàng |
| POST | `/api/market/cron` | Cron job crawl data | ❌ Chờ Hoàng |
| GET | `/api/news` | Tin tức AI tóm tắt | ❌ Chờ Hoàng |

---

## 📸 Screenshots

| Tính năng | Preview |
|-----------|---------|
| Dashboard | ![Dashboard](./public/docs/audit_dashboard_1773930999275.png) |
| Quỹ Nợ | ![Debt](./public/docs/audit_debt_1773931014486.png) |
| Quỹ Chi tiêu | ![Budget](./public/docs/audit_budget_1773931000033.png) |
| Nhiệt kế thị trường | ![Sentiment](./public/docs/audit_sentiment_1773931016194.png) |
| Bảng xếp hạng | ![Leaderboard](./public/docs/audit_leaderboard_page_1774006278785.png) |
| Bài học tài chính | ![Learn](./public/docs/audit_learn_page_1774006350794.png) |
| Xu hướng kinh tế | ![Macro](./public/docs/audit_macro_1773931132462.png) |
| Tính cách đầu tư | ![Risk](./public/docs/audit_risk_1773931164096.png) |
| Cố vấn danh mục | ![Portfolio](./public/docs/audit_portfolio_1773931153498.png) |
| CPI cá nhân | ![CPI](./public/docs/audit_cpi_retry_1773931015040.png) |

---

## 🔮 Hướng Đi Tương Lai

1. ~~**Supabase Auth**~~ ✅ Done — Email+Password, SSR sessions
2. **Supabase Database** — DB schema, migrate localStorage, RLS policies
3. **Real-time Market Data** — crawl tự động mỗi 15 phút
4. **Google OAuth** — thêm social login (Supabase Auth đã hỗ trợ)
5. **Push Notifications** — nhắc nhở ghi chi tiêu
6. **Voice Clone** — giọng Vẹt Vàng clone từ ZinZin (VieNeu-TTS)
7. **Mascot Animation** — Rive/Spine animation cho Vẹt Vàng
8. **Mobile App** — React Native hoặc PWA
7. **AI Insights** — phân tích chi tiêu tự động, dự báo cashflow

---

## 👥 Team

- **Hưng** — AI, Frontend, Gamification, Voice
- **Hoàng** — Data Crawling, Market APIs, News Scraping

> Dự án thi **WDA 2026** — Đề tài Tài chính cá nhân

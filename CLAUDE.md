# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VietFi Advisor is an AI-powered personal finance app for Vietnamese users, featuring Vẹt Vàng (Golden Parrot) AI — a sarcastic Duolingo-style mascot. Built with Next.js 16 + React 19, deployed on Vercel.

---

## WDA2026 Task Delegation (Hưng vs Hoàng)

- **Hoàng (Human Dev/Night Shift):** Responsible for Data Crawling, Security enhancements, and UI refinements.
- **Hưng (AI Agent/Day Shift):** Responsible for Feature Development (Business Logic/Calculations), writing Prompts, and strictly validating all features against the WDA2026 Competition Rules (Problem 1: Centralized Debt Hub & Problem 2: AI Financial Advisor).

---

## Commands

```bash
npm run dev        # Start dev server → http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint (eslint.config.mjs, ESLint 9)
npm test           # Vitest (watch mode)
npm run test:run   # Vitest (single run, CI)
npm run test:e2e           # Playwright E2E — all specs
npm run test:e2e:ui        # Playwright with UI mode
npm run test:e2e:headed    # Playwright headed (visible browser)
npm run test:e2e:debug     # Playwright debug mode
```

**Required env vars** (see `.env.example`):
```
GEMINI_API_KEY=          # Required — Google AI API key
GEMINI_BASE_URL=         # Optional — proxy URL (e.g. Cloudflare Worker)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CRON_SECRET=
```

---

## Architecture

### Strategic Guidelines (WDA2026 Core Philosophy)

1. **Vercel Cron Limits & Client-Side First:** Vercel Hobby limits cron jobs to 1/day and 10s execution. Therefore, MAXIMIZE client-side processing (localStorage) and avoid heavy server-side background tasks.
2. **Generative AI Usage:** Use `gemini-batch.ts` for bulk AI processing (e.g., Morning Briefs, News summaries) to save costs and avoid timeouts. Reserve the interactive streaming `api/chat` strictly for user conversations.
3. **Mascot Persona (CRITICAL VIRAL FEATURE):** Vẹt Vàng (Golden Parrot) MUST BE the most sarcastic, street-smart, and brutally honest financial advisor in Vietnam. Do not write polite, generic AI responses. The chat is the core viral loop to build user habits.

### AI Chat Pipeline (3-tier fallback — always check tiers in order)

1. **Regex expense parser** (`src/lib/expense-parser.ts`) — parses `"phở 30k"` → `{item, amount, category}` with 0 API calls. Check this first when adding expense-parsing logic.
2. **Scripted responses** (`src/lib/scripted-responses.ts`) — 500+ canned responses across 25 intents. Each entry has `ttsText` (emoji-free, for TTS). Add new responses here before reaching Gemini.
3. **Gemini streaming** (`src/lib/gemini.ts` + `POST /api/chat`) — Edge Runtime, 3-attempt retry, `callGemini` and `callGeminiJSON` variants. Only hits this tier when tiers 1-2 don't match.

### Data Persistence

- **Guest users**: localStorage via `src/lib/storage.ts` — typed wrapper for all 18 keys, server-safe (no-ops on server)
- **Logged-in users**: Supabase PostgreSQL via `src/lib/supabase/user-data.ts` — hybrid DAL that falls back to localStorage when unauthenticated
- Migration path: `src/lib/supabase/migrate-local.ts` — one-time push of localStorage data to Supabase, sets `vietfi_migrated` flag
- React hooks: `src/lib/supabase/useUserData.ts` — `useUserBudget`, `useUserDebts`, `useUserGamification`

### Dashboard Layout (`src/app/dashboard/`)

All dashboard pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New dashboard pages go here and are auto-discovered by the sidebar.

**Existing pages**: budget, debt, housing, leaderboard, learn, macro, market, news, personal-cpi, portfolio, risk-profile, screener, sentiment

### Calculation Engines (`src/lib/calculations/` và Component-level PnL)

Pure TypeScript, no AI calls:

| File/Component | Purpose |
|------|---------|
| `debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |
| `GoldTracker.tsx` | Pricing Engine 2.0 (Real-time PnL): Multi-brand DOM scraping (Webgia) + DOJI XML API. Tích hợp Graceful Degradation tự động fallback sang nội suy từ Gold Global (`goldUsd * Rate + Premium`). |

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes. Do not use inline styles for these.
- **Animations**: Framer Motion for component animations. Lottie JSON parts for the mascot in `public/animations/`.
- **TypeScript**: Strict mode. Small, focused files (200–500 lines typical). Extract utilities rather than adding to large modules.
- **Vietnamese context**: All UI text, canned responses, and financial logic must use Vietnamese currency (VND), Vietnamese financial terminology, and VN-specific financial context (SJC gold, VN-Index, USD/VND, Sacombank Eximbank rates).

---

## 🛑 Những điểm yếu cần cải thiện (Technical Debt & Improvements Phase 8)

### 1. Đồng bộ hóa State (State Management & Syncing)
- **Hiện trạng:** Hệ thống đang phụ thuộc quá nhiều vào `localStorage` (gamification, XP, mở khóa Guru, Quản trị Nợ). Có hàm `migrateLocalStorageToSupabase` nhưng chưa bao phủ hết các edge cases.
- **Vấn đề:** Khi user đăng nhập trên thiết bị khác (Mobile vs PC), trạng thái mở khóa Guru (300 XP) hoặc cấp bậc Tier có thể bị lệch.
- **Cải thiện:** Cần cấu trúc lại theo kiến trúc Local-First. Dùng Zustand kết hợp với Supabase Realtime để sync State 2 chiều. Mọi logic trừ tiền (XP) phải được verify ở Backend (Supabase RPC) để tránh hack.

### 2. Vẹt Vàng AI (Streaming & Context Window)
- **Hiện trạng:** Prompt của Vẹt Vàng đã được inject Context (DTI, Cashflow) nhưng output trả về là dạng block (đợi gen xong mới hiện).
- **Vấn đề:** Nếu Context ngày càng dài, Gemini API sẽ phản hồi chậm (>5s), làm giảm độ WOW của UX.
- **Cải thiện:** Bắt buộc phải implement `ai/rsc` (Vercel AI SDK) để hỗ trợ tính năng **Text Streaming** (chữ nhảy từng từ). Quản lý History Chat bằng sliding window để tránh tốn token.

### 3. Fake Gemini & Data Crawler
- **Hiện trạng:** Đang dùng Simulated Mock cho bản demo do thiếu API Key Local, và scrape HTML tĩnh từ CafeF.
- **Vấn đề:** Nếu CafeF đổi DOM, crawler sẽ gãy. Mock Gemini chỉ có tác dụng Demo Pitch Deck.
- **Cải thiện:** Đưa Crawler tách riêng ra một microservice (Python/FastAPI) hoặc dùng Browserless/ScrapingBee. Morning Brief cần phải call Gemini API thật và Cache lại 24h trên Redis (Upstash) để tối ưu chi phí.

### 4. Thuật toán "Trạm Cấp Cứu" (Financial ER)
- **Hiện trạng:** Rule-based tĩnh (cắt 50-100% hũ giải trí).
- **Cải thiện:** Cần áp dụng Linear Programming (Thuật toán tối ưu tuyến tính) để Vẹt Vàng tự động tìm ra số tiền tối ưu nhất rút từ nhiều hũ khác nhau (không chỉ hũ Giải trí mà còn Hũ Tiết kiệm khẩn cấp) để trả nợ một cách êm ái nhất.

---

## 🎯 Siêu Kế Hoạch Tiếp Theo (Tasks Siêu Chi Tiết)

### TASK 1: Di cư toàn bộ sang Server-Driven State (Supabase)
- **Mục tiêu:** Xóa sổ sự phụ thuộc vào `localStorage`, đưa mọi quyền sinh sát (XP, Mở khóa) lên Server.
- **Micro-tasks:**
  1. Thêm Role-Based Policies trên Supabase cho table `user_stats`.
  2. Viết RPC `execute_xp_spend(user_id, cost, entity_unlocked)` để khóa Guru.
  3. Cài đặt `Zustand` store: `useAppStore`, `useGamificationStore`.
  4. Viết middleware đồng bộ biến đổi từ `localStorage` sang Zustand.

### TASK 2: Social Share & Viral Loop (WOW Factor Marketing)
- **Mục tiêu:** Biến VietFi thành cỗ máy tự Viral qua tính năng "Khoe Độ Nợ Máu" và "Khoe Guru Cố Vấn".
- **Micro-tasks:**
  1. Route: `GET /api/og/share-dti?score=80` generate file PNG động hiển thị Vẹt Vàng chửi user.
  2. Dựng Modal Share (`ShareModal.tsx`) trên Dashboard `debt/page` mỗi khi user đạt DTI > 40%.
  3. Tích hợp Web Share API cho thiết bị mobile.

### TASK 3: Real-Time Market Data WebSocket
- **Mục tiêu:** Nâng cấp trải nghiệm Trading Dashboard với data tick-by-tick.
- **Micro-tasks:**
  1. Hook vào API Binance WSS cho rổ Crypto và TradingView C++ cho Forex/Gold.
  2. Đập bỏ `setInterval(fetch)` trong `MarketSection.tsx` và thay bằng Event Listeners.
  3. Emit event `FLASH_CRASH` để Vẹt Vàng popup thẳng lên màn hình khi TT rớt >5%.

### TASK 4: Triển khai luồng Onboarding Gamified Tối Thượng
- **Mục tiêu:** User mới vào không bị ngộp bởi giao diện, giống game nhập vai.
- **Micro-tasks:**
  1. Thiết kế UX luồng Swipe Card (như Tinder). User quẹt trái/phải để chọn nhu cầu.
  2. Tặng "Welcome Box" 500 XP lúc hoàn tất Setup. Dùng Lottie Animation làm hiệu ứng đập hộp.
  3. Đẩy luồng Onboarding lên thành Page `/onboarding` và chặn middleware không cho vào Dashboard nếu chưa pass.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VietFi Advisor** — Cố vấn Tài chính AI Cho Người Việt.

AI-powered personal finance app for Vietnamese users, featuring **Vẹt Vàng (Golden Parrot)** — a sarcastic mascot that roasts bad spending habits. Built with Next.js 16 + React 19, deployed on Vercel. Competition project for **WDA2026**.

## WDA2026 Task Delegation

| | Hoàng (Human Dev / Night Shift) | Hưng (AI Agent / Day Shift) |
|---|---|---|
| **Scope** | Data Crawling, Security, UI | Feature Development, Business Logic, AI Prompts |
| **Key focus** | Market APIs, News Scraping | Debt Hub, AI Advisor, Gamification, Voice |

See `WDA2026_PHAN_CONG.md` for detailed task breakdown.

## Commands

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint 9 (eslint.config.mjs)
npm test             # Vitest watch mode
npm run test:run     # Vitest single run (CI)
npm run test:e2e     # Playwright — all specs
npm run test:e2e:ui  # Playwright UI mode
npm run test:e2e:headed  # Visible browser
```

### Environment Variables

See `.env.example` for full template. Required: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`.

## Core Philosophy

1. **Client-First, Cron-Light:** Vercel Hobby limits cron to 1/day + 10s. Maximize localStorage (guest) + client-side processing.
2. **AI Cost Hierarchy:** `gemini-batch.ts` for bulk (Morning Briefs, News). Streaming `POST /api/chat` strictly for user conversations.
3. **Scripted First:** When adding chat logic, always add scripted responses in `src/lib/scripted-responses.ts` FIRST — 25 intents, 500+ canned responses, zero cost.
4. **No Mutation:** Always create new objects. Never mutate existing state.

## AI Chat Pipeline

| Tier | Source | Trigger | Cost |
|---|---|---|---|
| 1 — Regex parser | `src/lib/expense-parser.ts` | `"phở 30k"` → `{item, amount, category}` | 0 |
| 2 — Scripted responses | `src/lib/scripted-responses.ts` | 25 intents, 500+ canned responses | 0 |
| 3 — Gemini streaming | `src/lib/gemini.ts` + `POST /api/chat` | Edge Runtime, 3-attempt retry | $ |

## Data Persistence

```
Guest user  →  localStorage via src/lib/storage.ts  (18 typed keys, server-safe)
Logged-in   →  Supabase PostgreSQL via src/lib/supabase/user-data.ts
Migration   →  src/lib/supabase/migrate-local.ts  (one-time push, sets vietfi_migrated flag)
React hooks →  src/lib/supabase/useUserData.ts  (useUserBudget, useUserDebts, useUserGamification)
```

`storage.ts` is the **single source of truth** for all guest data.

## Dashboard Routes

All pages share `dashboard/layout.tsx` which mounts sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot.

| Route | Purpose |
|---|---|
| `/dashboard` | Net worth, morning brief, news, quests, badges |
| `budget` | 6 spending pots, income, pie chart, expense entry |
| `debt` | DTI gauge, Snowball/Avalanche optimizer, timeline |
| `portfolio` | Allocation pie, GoldTracker, CashflowDNA |
| `risk-profile` | Prospect theory quiz → risk profile |
| `personal-cpi` | Personal vs official CPI (7 GSO categories) |
| `market` | Live VN-Index, Gold SJC, USD/VND, F&G gauge |
| `screener` | VN stock filter (TCBS, VN30 fallback) |
| `sentiment` | Fear & Greed Index + AI commentary |
| `news` | Live news + sentiment |
| `macro` | Macro indicators |
| `gurus` / `gurus/[id]` | AI mentor hub (5 gurus) |
| `housing` | Buy vs rent calculator |
| `leaderboard` | XP rankings (1 real user + 14 bot competitors) |
| `learn` | 12+ micro-learning lessons |

## Calculation Engines

Pure TypeScript, no AI calls, fully testable.

| File | Purpose |
|---|---|
| `debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `personal-cpi.ts` | Personal inflation vs official CPI |
| `risk-scoring.ts` | Prospect theory quiz → Conservative/Balanced/Aggressive |

## Gamification

| Level | Name | XP Range |
|---|---|---|
| 🐣 | Vẹt Con | 0–499 |
| 🦜 | Vẹt Teen | 500–999 |
| 🦜✨ | Vẹt Phố | 1,000–1,999 |
| 👑 | Vẹt Nhà Giàu | 2,000–4,999 |
| 💎 | Vẹt Hoàng | 5,000+ |

XP thresholds gate content access (`src/lib/rbac.ts`). Promo code `hungpixi` bypasses to LEGEND tier.

## Code Patterns

### 3D Tilt Effect (Hero + Feature Cards)

Use `useTilt` + `TiltCard` for cursor-tracked 3D card tilt — no WebGL needed:

```tsx
import { useMotionValue, useSpring } from "framer-motion";

// useTilt hook (defined once in page.tsx)
function useTilt<T extends HTMLElement>(maxRotate = 14) {
  const ref = useRef<T>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 28 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 28 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      rotateY.set(dx * maxRotate);
      rotateX.set(-dy * maxRotate);
    };
    const onLeave = () => { rotateX.set(0); rotateY.set(0); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [maxRotate, rotateX, rotateY]);

  return { ref, rotateX: springX, rotateY: springY };
}

// TiltCard wrapper
function TiltCard({ children, className = "", maxRotate = 12 }: {
  children: React.ReactNode; className?: string; maxRotate?: number;
}) {
  const { ref, rotateX, rotateY } = useTilt<HTMLDivElement>(maxRotate);
  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

Apply to glassmorphism cards in `src/app/page.tsx` (Hero dashboard mockup, Features main card, feature pillars).

### Hydration Safety

Never render `new Date()` directly in JSX — it causes SSR/client mismatch. Use a `mounted` guard:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
// In JSX: {mounted ? new Date().toLocaleDateString("vi-VN", ...) : "—"}
```

## Known Limitations

| Issue | Workaround |
|---|---|
| CafeF/TCBS DOM selectors fragile | Check selector strings in `crawler.ts` first when crawlers break |
| TCBS API fragility | VN30 mock data fallback in stock screener |
| localStorage → Supabase migration is one-way | Data added post-migration stays in localStorage only |
| Gemini mock returns hardcoded without `GEMINI_API_KEY` | Do not use mock for real conversations |
| Vercel Hobby cron: 1/day, 10s limit | Use GitHub Actions `vercel-deploy.yml` with Vercel CLI token for bypass |

## Deployment

- **Platform:** Vercel (Hobby + Hobby Plus)
- **CI/CD:** GitHub Actions `vercel-deploy.yml` — push to `master` + manual `workflow_dispatch`
- **Required secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Key Files

```
src/
├── app/
│   ├── page.tsx                    # Landing page (3D tilt cards, hero, features)
│   ├── dashboard/                  # 14 dashboard pages + layout.tsx
│   └── api/                       # Edge Runtime routes (chat, market-data, news, etc.)
├── components/
│   ├── vet-vang/                   # VetVangChat, VetVangFloat, AnimatedParrot
│   ├── gamification/               # Badges, XPToast, Celebration, RequireTier
│   ├── debt/                       # DTI gauge, optimizer timeline
│   └── portfolio/                 # GoldTracker, CashflowDNA
└── lib/
    ├── calculations/               # debt-optimizer, fg-index, personal-cpi, risk-scoring
    ├── supabase/                  # Auth SSR, user-data DAL, hooks
    ├── market-data/               # CafeF/Yahoo/SBV/TCBS crawlers
    ├── gemini.ts / gemini-batch.ts # Streaming + batch AI
    ├── scripted-responses.ts      # 500+ canned chat responses (25 intents)
    ├── storage.ts                 # 18-key localStorage wrapper (guest source of truth)
    ├── gamification.ts            # XP, badges, levels
    ├── rbac.ts                    # XP-threshold gates + promo code
    └── vetvang-persona.ts         # Vẹt Vàng system prompt
```

## API Routes (Edge Runtime)

| Method | Endpoint | Auth |
|---|---|---|
| `POST` | `/api/chat` | — |
| `GET` | `/api/market-data` | — |
| `GET` | `/api/news` | — |
| `GET` | `/api/morning-brief` | — |
| `GET` | `/api/stock-screener` | — |
| `POST` | `/api/cron/market-data` | `CRON_SECRET` |
| `POST` | `/api/cron/morning-brief` | `CRON_SECRET` |
| `POST` | `/api/cron/macro-update` | `CRON_SECRET` |

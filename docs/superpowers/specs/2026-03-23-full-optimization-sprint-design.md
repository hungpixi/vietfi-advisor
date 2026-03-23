# VietFi Advisor — Full Optimization Sprint

**Date:** 2026-03-23
**Author:** Claude (Brainstorming with Hoàng)
**Status:** Draft

---

## 1. Overview

Four incremental sprints to reduce technical debt, improve maintainability, and finalize Supabase migration readiness. Each sprint is independently deployable.

| Sprint | Scope | Files Touched | Est. Lines Changed |
|--------|-------|---------------|---------------------|
| 1 | `storage.ts` typed wrapper | 1 new + 15 updated | ~600 |
| 2 | DAL hybrid completion | 2 updated | ~400 |
| 3 | Dashboard extraction | 3 new + 1 updated | ~600 |
| 4 | Quality cleanup | 3 fixed + config | ~50 |

---

## 2. Sprint 1 — `src/lib/storage.ts`

### Motivation

18 localStorage keys are accessed with raw `localStorage.getItem/setItem` across 15 files. No validation, typos are silent, and Supabase migration requires hunting every call site.

### Interface

Every localStorage key gets an explicit typed accessor. Internal helpers handle JSON parse/stringify + schema validation.

```typescript
// src/lib/storage.ts

/* ─── Helpers ─── */
function getItem<T>(key: string, validator?: (raw: unknown) => T): T | null
function setItem<T>(key: string, value: T): void

/* ─── Budget ─── */
function getBudgetPots(): BudgetPot[]
function setBudgetPots(pots: BudgetPot[]): void
function getExpenses(): Expense[]
function setExpenses(expenses: Expense[]): void
function getIncome(): number
function setIncome(income: number): void

/* ─── Debts ─── */
function getDebts(): Debt[]
function setDebts(debts: Debt[]): void

/* ─── Gamification ─── */
function getGamificationState(): GamificationState | null
function setGamificationState(state: GamificationState): void

/* ─── Onboarding ─── */
function getOnboardingState(): OnboardingState | null
function setOnboardingState(state: OnboardingState): void
function clearOnboardingState(): void
function clearAllUserData(): void

/* ─── Market cache ─── */
function getMarketCache(): MarketSnapshot | null
function setMarketCache(snapshot: MarketSnapshot): void

/* ─── Market alert cache ─── */
function getMarketAlertCache(): Record<string, unknown> | null  // vietfi_market_alert_cache (TTL-based, session scope)
function setMarketAlertCache(cache: Record<string, unknown>): void

/* ─── Misc ─── */
function getSoundMuted(): boolean
function setSoundMuted(muted: boolean): void
function getNotifDismissed(): boolean
function setNotifDismissed(dismissed: boolean): void
function getLessonsDone(): string[]
function setLessonsDone(lessons: string[]): void
function getRiskResult(): RiskResult | null
function setRiskResult(result: RiskResult): void
function getStreakFreeze(): StreakFreezeState | null
function setStreakFreeze(state: StreakFreezeState): void
function getLeaderboardOffsets(): Record<string, number>
function setLeaderboardOffsets(offsets: Record<string, number>): void
function getNewsBookmarks(): Set<string>
function setNewsBookmarks(bookmarks: Set<string>): void
```

### Validation

Each getter runs a schema validator (mimicking existing `gamification.ts` pattern). Invalid data → `null` instead of crash. Validators defined per domain as Zod schemas or simple type guards.

### Migration Path

When Supabase is fully wired: only the internal `getItem`/`setItem` helpers need to change. All 15 consumer files keep calling the same named functions — zero call-site changes.

### Migration Notes

- `storage.ts` uses the same key strings (`vietfi_*`) so localStorage is backward-compatible.
- Typed types must be imported from existing modules:
  - `BudgetPot`, `Expense` — from `src/app/dashboard/budget/page.tsx` (extract to `src/lib/types/budget.ts` first)
  - `Debt` — alias for `DebtItem` from `src/lib/supabase/user-data.ts`
  - `GamificationState` — from `src/lib/gamification.ts`
  - `OnboardingState` — from `src/lib/onboarding-state.ts`
  - `RiskResult` — from `src/lib/calculations/risk-scoring.ts`
  - `StreakFreezeState` — from `src/lib/gamification.ts`
  - `MarketSnapshot` — from `src/lib/market-data/crawler.ts`
- `LeaderboardOffsets` type must be extracted from `src/app/dashboard/leaderboard/page.tsx` into a shared util first.
- `clearAllUserData()` replaces the inline key-deletion in `onboarding-state.ts`.
- `migrate-local.ts` itself (which uses raw `localStorage`) must be updated to call `storage.get*()` internally — it is included in Sprint 1's file list.

---

## 3. Sprint 2 — DAL Hybrid Completion

### Motivation

`user-data.ts` has a hybrid DAL concept but is not fully wired. `migrate-local.ts` exists but the real-time sync and typed CRUD per domain are missing.

### Architecture

```
Consumer (budget page, debt page, gamification...)
    ↓
storage.ts (typed wrappers)  ←── localStorage (guest users)
    ↓
user-data.ts (DAL)          ←── Supabase (logged-in users)
```

### Changes to `user-data.ts`

Extend the existing DAL with typed CRUD per domain. Align with existing type names (`DebtItem`, not `Debt`) and use a combined `BudgetData` type defined as:

```typescript
// src/lib/supabase/user-data.ts

// Combined budget domain (mirrors how page.tsx aggregates data)
interface BudgetData {
  pots: BudgetPot[]
  expenses: Expense[]
  income: number
}

interface UserDataService {
  // Budget (combined)
  getBudget(): Promise<BudgetData>   // Supabase → storage.ts fallback
  setBudget(data: BudgetData): Promise<void>
  subscribeBudget(fn: (d: BudgetData) => void): () => void  // Supabase Realtime

  // Debts
  getDebts(): Promise<DebtItem[]>    // Uses DebtItem (not Debt) per existing codebase
  setDebts(debts: DebtItem[]): Promise<void>

  // Gamification
  getGamification(): Promise<GamificationState>
  setGamification(state: GamificationState): Promise<void>

  // Lessons
  getLessonsDone(): Promise<string[]>
  setLessonsDone(lessons: string[]): Promise<void>

  // Risk
  getRiskResult(): Promise<RiskResult | null>
  setRiskResult(result: RiskResult): Promise<void>
}
```

### New React Hook

```typescript
// src/lib/supabase/useUserData.ts
import type { BudgetData } from './user-data'

function useUserBudget(): {
  data: BudgetData | null
  loading: boolean
  error: Error | null
  save: (data: BudgetData) => Promise<void>
}
// Similar hooks: useUserDebts, useUserGamification, useUserRiskResult
```

### `migrate-local.ts` update

After Sprint 1, `migrate-local.ts` must also call `storage.get*()` internally (instead of raw `localStorage.getItem`) to stay consistent. Add this file to Sprint 1's modified files list.

### Sync Flow

1. User logs in → `migrate-local.ts` runs once (existing)
2. DAL reads from Supabase (logged-in) or falls back to `storage.ts` (guest)
3. All writes go to active source
4. Supabase Realtime subscription → dashboard auto-updates when data changes from another device

### Key Principles

- `user-data.ts` delegates to `storage.ts` for guests — no duplicate logic
- Auth state checked via `@supabase/ssr` client
- If Supabase write fails, write to localStorage as fallback

---

## 4. Sprint 3 — Dashboard Extraction

### Motivation

`src/app/dashboard/page.tsx` is 911 lines. Contains: market fetch + notification banner + quest system + news feed + budget summary + onboarding wizard. Hard to read, maintain, and test.

### Target Structure

```
src/app/dashboard/
├── page.tsx                           # ~300 lines — orchestration only
└── components/
    ├── MarketSection.tsx             # ~120 lines
    ├── DailyQuestSection.tsx         # ~120 lines
    └── NotificationBanner.tsx         # ~50 lines
```

### Component: `MarketSection.tsx`

- **Exports:** `MarketCard`, `FGGauge`, `MarketSkeletonCard`, `MarketSection`
- **Responsibilities:**
  - Fetch `/api/market-data` on mount + every 5 min
  - Manage `MarketSnapshot` state
  - localStorage cache fallback (via `storage.getMarketCache` / `storage.setMarketCache`)
  - Notification threshold check (VN-Index ±2%, Gold ±3%)
  - Render: 4 `MarketCard` + `FGGauge`

### Component: `DailyQuestSection.tsx`

- **Exports:** `DailyQuestCard`
- **Responsibilities:**
  - Self-contained: `getDailyQuests()` + ref cycle for diff detection
  - `ConfettiCannon` + `QuestCompleteToast` inline (or imported)
  - Progress ring animation
- **Note:** Keep `ConfettiCannon` and `QuestCompleteToast` in `gamification/Celebration.tsx`; import here.

### Component: `NotificationBanner.tsx`

- **Exports:** `NotificationBanner`
- **Props:** none (self-contained)
- **Responsibilities:**
  - Check `Notification.permission === "default"` on mount
  - Call `storage.getNotifDismissed()` to skip if already dismissed
  - On request-permission: call `Notification.requestPermission()`
  - On dismiss: write `storage.setNotifDismissed(true)` internally — no callback needed (banner unmounts itself via localStorage state)

### State Flow for Extracted Components

`liveArticles` state stays in `page.tsx`. Components receive it as props:

```typescript
// page.tsx — state lives here
const [liveArticles, setLiveArticles] = useState<NewsArticle[]>([])

// Pass to inline components
<BriefCard brief={liveBrief} loading={briefLoading} />
<NewsFeed items={liveNews} loading={newsLoading} />

// Extracted components manage their own API calls internally
<MarketSection />
<DailyQuestSection />
<NotificationBanner />
```

### `page.tsx` After Extraction

**Target: ~300 lines.** Remaining content:
1. `showSetup` + `QuickSetupWizard`
2. Net worth computation via `storage.getBudgetPots()` / `storage.getExpenses()` / `storage.getIncome()`
3. `liveArticles` + `aiBrief` state (needed by BriefCard + NewsFeed)
4. `BriefCard` + `NewsFeed` (inline — depend on `liveArticles` state)
5. `FGGauge` + `PortfolioMini` + `VetVangFloat` (inline — stateless wrappers)
6. Layout grid mounting: `MarketSection`, `DailyQuestSection`, `NotificationBanner`, `BadgeGrid`

**What stays inline** (intentionally, per original decision): `BriefCard`, `NewsFeed`, `VetVangFloat`. These are tied to page-level state and extracting them would require a context or prop-drilling — diminishing returns.

### New Files Created

- `src/app/dashboard/components/MarketSection.tsx`
- `src/app/dashboard/components/DailyQuestSection.tsx`
- `src/app/dashboard/components/NotificationBanner.tsx`

---

## 5. Sprint 4 — Quality Sprint

### 5.1 Remove console.log

Remove 4 `console.log` calls in cron routes:

| File | Line | Change |
|------|------|--------|
| `src/app/api/cron/market-data/route.ts` | 27 | Delete `console.log(...)` |
| `src/app/api/cron/morning-brief/route.ts` | 18 | Delete `console.log(...)` |
| `src/lib/supabase/migrate-local.ts` | 107 | Delete `console.log(...)` |

If debug logging is needed in future, use a proper logger (e.g., `pino` or `debug` package) scoped to `VietFi:`.

### 5.2 Add Vitest Coverage

Update `vitest.config.ts`:

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
  exclude: [
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'src/test/**',
    'src/app/test/**',
  ],
  thresholds: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70,
  }
}
```

Run: `npm test -- --coverage`

### 5.3 Fix Remaining Type Issues

In `src/app/dashboard/page.tsx`, `PortfolioMini` has:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
<Tooltip formatter={(value: unknown) => `${value}%`} />
```

Fix by extracting the formatter:

```typescript
const pctFormatter = (value: unknown) => `${value}%`
// ...
<Tooltip formatter={pctFormatter} />
```

Remove the eslint-disable comment.

---

## 6. Implementation Order

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4
```

- **Sprint 1** must complete before Sprint 2 (DAL delegates to storage)
- **Sprint 3** depends on Sprint 1 (components use `storage.ts`)
- **Sprint 4** is independent — can run in parallel or after

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Storage key typos during migration | Runtime bugs | All accessors typed — compiler catches mismatches |
| Supabase Realtime complexity | Breaking changes | Feature-flag: use localStorage-only until confirmed stable |
| Dashboard component extraction changes prop drilling | Re-render bugs | Pass callbacks explicitly, use `useCallback` in page |
| Vitest coverage threshold too strict | CI failures | Start at 70% (stepping stone to 80%), raise to 80% after stabilization |

---

## 8. Files Changed Summary

| Sprint | New Files | Modified Files |
|--------|-----------|---------------|
| 1 | `src/lib/storage.ts` | 15 files (update localStorage calls) + `src/lib/supabase/migrate-local.ts` |
| 2 | `src/lib/supabase/useUserData.ts` | `src/lib/supabase/user-data.ts` |
| 3 | `src/app/dashboard/components/MarketSection.tsx` | `src/app/dashboard/page.tsx` |
|  | `src/app/dashboard/components/DailyQuestSection.tsx` | |
|  | `src/app/dashboard/components/NotificationBanner.tsx` | |
| 4 | — | `vitest.config.ts`, `src/app/api/cron/market-data/route.ts` |
|  | | `src/app/api/cron/morning-brief/route.ts` |
|  | | `src/lib/supabase/migrate-local.ts` |
|  | | `src/app/dashboard/page.tsx` |

# Market Overview Super Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Nhiệt kế thị trường`, `Phân tích sâu`, and `Xu hướng kinh tế` with one unified `Tổng quan thị trường` system that shares one route, one data/view-model pipeline, and one UI language while keeping legacy URLs working via redirects.

**Architecture:** Build a new `market-overview` feature slice with a focused domain layer in `src/lib/market-overview/` and a route-local component set in `src/app/dashboard/market-overview/_components/`. The new page fetches `/api/news` and `/api/market-data` once through `useMarketOverview()`, derives tab-ready view models, and renders three lenses: `Tâm lý`, `Tài sản`, and `Vĩ mô`. Existing overview routes become redirects only, and `Nhà ở` moves out of the `THỊ TRƯỜNG` nav group.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript strict mode, Vitest, Testing Library, Framer Motion, Recharts, lucide-react.

---

## Implementation Notes

- Work in a dedicated git worktree before starting implementation.
- Keep files focused. New market-overview logic lives in `src/lib/market-overview/` and `src/app/dashboard/market-overview/`.
- Follow DRY/YAGNI: extract shared helpers only when reused by at least two market tabs.
- Follow TDD for each task: write the failing test first, make it pass minimally, then refactor.
- Commit after each task. Do not batch unrelated changes.

## Scope Lock

This plan covers one subsystem: market-overview consolidation. It includes the nav cleanup needed to make that subsystem usable:

- merge `sentiment`, `market`, `macro` into `market-overview`
- keep `news` and `screener` as separate market tools
- move `housing` out of the `THỊ TRƯỜNG` group because it is personal-decision tooling, not live market overview

## File Structure

### New Files

- `src/lib/market-overview/types.ts`
  Shared feature types: tabs, tones, normalized market-overview data, per-tab card shapes.
- `src/lib/market-overview/formatters.ts`
  Shared formatting and market-zone helpers. This is the single home for `getZone` and display formatting used across the new feature.
- `src/lib/market-overview/mappers.ts`
  Pure mapping functions from `/api/news`, `/api/market-data`, and local storage state into normalized view models.
- `src/lib/market-overview/useMarketOverview.ts`
  Client hook that fetches both APIs, persists sentiment history, computes the normalized data shape, and exposes loading/error state.
- `src/app/dashboard/market-overview/page.tsx`
  Thin route entry. Reads `searchParams`, selects the tab, and renders the shell.
- `src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx`
  Main page layout, single XP trigger, top-level loading/error/ready branching.
- `src/app/dashboard/market-overview/_components/MarketTabNav.tsx`
  Shared tab navigation with mobile-friendly sticky behavior.
- `src/app/dashboard/market-overview/_components/MarketHero.tsx`
  Shared hero heading, timestamp, stale badge, and short narrative line.
- `src/app/dashboard/market-overview/_components/MarketStateBlock.tsx`
  Reusable loading and error blocks for the new page.
- `src/app/dashboard/market-overview/_components/SentimentTab.tsx`
  Tâm lý lens UI: gauge, drivers, history chart, asset mood, action summary.
- `src/app/dashboard/market-overview/_components/AssetsTab.tsx`
  Tài sản lens UI: asset cards, trend chart, opportunity radar, personalized alert.
- `src/app/dashboard/market-overview/_components/MacroTab.tsx`
  Vĩ mô lens UI: macro cards, compact narrative, impact blocks, weekly watchlist.
- `src/app/dashboard/market-overview/page.test.tsx`
  Feature-level route tests covering tab switching, loading, error, and selected sections.
- `src/lib/market-overview/mappers.test.ts`
  Pure mapping tests for normalized data and zone/formatting invariants.
- `src/lib/market-overview/useMarketOverview.test.tsx`
  Hook tests covering merged fetch behavior, persistence, stale state, and error state.

### Files To Modify

- `src/app/dashboard/layout.tsx`
  Reduce market nav from 6 items to 3, move `Nhà ở` out of the market group, and update setup badges if needed.
- `src/proxy.ts`
  Add redirects from legacy overview routes to `market-overview` with query params; fix redirect construction so query strings survive safely.
- `src/app/dashboard/components/MarketSection.tsx`
  Update the dashboard home deep link from old sentiment route to the new overview route.
- `src/app/dashboard/components/DailyQuestSection.tsx`
  Point `check_market` and `read_knowledge` quests at the new overview route tabs.
- `src/app/page.tsx`
  Update landing-page investment link from `Nhiệt kế thị trường` to `Tổng quan thị trường`.
- `src/app/dashboard/sentiment/page.tsx`
  Replace body with a redirect component or remove logic once proxy redirect is verified.
- `src/app/dashboard/market/page.tsx`
  Replace body with a redirect component or remove logic once proxy redirect is verified.
- `src/app/dashboard/macro/page.tsx`
  Replace body with a redirect component or remove logic once proxy redirect is verified.

### Existing Files To Read Before Coding

- `AGENTS.md`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/sentiment/page.tsx`
- `src/app/dashboard/market/page.tsx`
- `src/app/dashboard/macro/page.tsx`
- `src/app/dashboard/components/MarketSection.tsx`
- `src/app/dashboard/components/DailyQuestSection.tsx`
- `src/lib/storage.ts`
- `src/lib/gamification.ts`
- `src/app/dashboard/macro/page.test.tsx`
- `src/app/dashboard/page.test.tsx`

## Test Strategy

- Pure data normalization tests in `src/lib/market-overview/mappers.test.ts`
- Hook behavior tests in `src/lib/market-overview/useMarketOverview.test.tsx`
- Page composition tests in `src/app/dashboard/market-overview/page.test.tsx`
- Redirect behavior tests by exercising `proxy()` if a test file is added during implementation; otherwise verify via manual request/build after code lands
- Final regression commands: `npm run test:run`, `npm run lint`, `npm run build`

## Task 1: Create the shared market-overview domain layer

**Files:**
- Create: `src/lib/market-overview/types.ts`
- Create: `src/lib/market-overview/formatters.ts`
- Create: `src/lib/market-overview/mappers.ts`
- Test: `src/lib/market-overview/mappers.test.ts`

- [ ] **Step 1: Write the failing mapper tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildAssetCards,
  buildMacroCards,
  buildSentimentSnapshot,
  buildTrendSummary,
} from "./mappers";
import { getZone, formatMarketTime } from "./formatters";

const marketSnapshot = {
  fetchedAt: "2026-04-15T08:30:00.000Z",
  vnIndex: { price: 1245.66, changePct: -1.2 },
  goldSjc: { goldVnd: 121_500_000, changePct: 0.8 },
  usdVnd: { rate: 25880 },
  btc: { priceUsd: 83550, changePct24h: 2.4 },
  macro: {
    gdpYoY: [{ period: "2025", value: 8.02 }],
    cpiYoY: [{ period: "2025", value: 3.31 }],
    deposit12m: { min: 5.2, max: 7.2, source: "CafeF" },
  },
  aiSummary: "VN-Index yếu nhưng vàng và BTC vẫn giữ nhịp.",
} as const;

const newsPayload = {
  metrics: {
    overallNewsScore: 29,
    history: [
      { date: "2026-04-10", score: 45 },
      { date: "2026-04-11", score: 38 },
      { date: "2026-04-12", score: 31 },
    ],
    assetSentiment: [
      { asset: "Chứng khoán", score: 32, trend: "down", news: "Khối ngoại bán ròng" },
      { asset: "Vàng", score: 74, trend: "up", news: "Vàng lập đỉnh ngắn hạn" },
    ],
  },
} as const;

describe("market-overview mappers", () => {
  it("buildSentimentSnapshot derives zone and asset mood cards", () => {
    const sentiment = buildSentimentSnapshot(newsPayload, marketSnapshot, []);

    expect(sentiment.score).toBe(29);
    expect(sentiment.zone.label).toBe("Sợ hãi");
    expect(sentiment.assetSentiments[0].asset).toBe("Chứng khoán");
    expect(sentiment.drivers).toHaveLength(5);
  });

  it("buildAssetCards maps snapshot into 4 comparable cards", () => {
    const cards = buildAssetCards(marketSnapshot);

    expect(cards).toHaveLength(4);
    expect(cards[0].asset).toBe("Chứng khoán");
    expect(cards[1].price).toMatch(/121/);
  });

  it("buildMacroCards exposes GDP, CPI, deposit, and USD/VND", () => {
    const cards = buildMacroCards(marketSnapshot);

    expect(cards.map((card) => card.label)).toEqual([
      "GDP YoY 2025",
      "CPI YoY 2025",
      "Lãi suất tiền gửi 12T",
      "USD/VND",
    ]);
  });

  it("buildTrendSummary returns concise summary rows", () => {
    const summary = buildTrendSummary(marketSnapshot);
    expect(summary).toEqual([
      { label: "VN-Index", value: "-1.20%" },
      { label: "Vàng SJC", value: "+0.80%" },
      { label: "BTC", value: "+2.40%" },
    ]);
  });
});

describe("market-overview formatters", () => {
  it("getZone returns the expected market bucket", () => {
    expect(getZone(29)).toEqual({ label: "Sợ hãi", color: "#ea3943" });
  });

  it("formatMarketTime formats fetchedAt for vi-VN display", () => {
    expect(formatMarketTime("2026-04-15T08:30:00.000Z")).toMatch(/15\/04\/2026|08:30/);
  });
});
```

- [ ] **Step 2: Run the test file and verify it fails**

Run: `npm run test:run -- src/lib/market-overview/mappers.test.ts`

Expected: FAIL with module-not-found errors for `./mappers` and `./formatters`.

- [ ] **Step 3: Write `types.ts` with the normalized data contracts**

```ts
export type MarketTab = "tam-ly" | "tai-san" | "vi-mo";
export type MarketTone = "fear" | "neutral" | "greed";
export type MarketTrend = "up" | "down" | "neutral";
export type AssetSignal = "buy" | "hold" | "sell";

export interface MarketZone {
  label: string;
  color: string;
}

export interface SentimentHistoryPoint {
  date: string;
  score: number;
  vnindex?: number;
}

export interface SentimentDriver {
  label: string;
  value: number;
  tone: MarketTone;
}

export interface AssetMoodCard {
  asset: string;
  score: number;
  trend: MarketTrend;
  news: string;
}

export interface AssetOverviewCard {
  asset: string;
  price: string;
  change: number;
  score: number;
  trend: MarketTrend;
  summary: string;
  action: string;
  color: string;
}

export interface AssetOpportunity {
  title: string;
  description: string;
  asset: string;
  signal: AssetSignal;
  confidence: number;
}

export interface PersonalizedAlert {
  type: "danger" | "warning" | "safe" | "balanced" | "special";
  icon: string;
  msg: string;
}

export interface MacroCard {
  label: string;
  value: string;
  sub?: string;
  note?: string;
  trend: MarketTrend;
  emoji: string;
}

export interface TrendSummaryItem {
  label: string;
  value: string;
}
```

- [ ] **Step 4: Write `formatters.ts` with the shared formatting helpers**

```ts
import type { MarketZone } from "./types";

export function getZone(score: number): MarketZone {
  if (score <= 20) return { label: "Cực kỳ Sợ hãi", color: "#ea3943" };
  if (score <= 40) return { label: "Sợ hãi", color: "#ea3943" };
  if (score <= 60) return { label: "Bình thường", color: "#f3d42f" };
  if (score <= 80) return { label: "Tham lam", color: "#16c784" };
  return { label: "Cực kỳ Tham lam", color: "#16c784" };
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompactVnd(value: number): string {
  return `${(value / 1_000_000).toFixed(1)} tr`;
}

export function formatMarketTime(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
```

- [ ] **Step 5: Write `mappers.ts` with pure view-model builders**

```ts
import { formatCompactVnd, formatPercent, getZone } from "./formatters";
import type {
  AssetMoodCard,
  AssetOverviewCard,
  MacroCard,
  SentimentDriver,
  TrendSummaryItem,
} from "./types";

function clampMetric(value: number): number {
  return Math.max(8, Math.min(92, Math.round(value)));
}

export function buildSentimentSnapshot(
  newsPayload: { metrics?: { overallNewsScore?: number; assetSentiment?: AssetMoodCard[] } },
  marketSnapshot: { vnIndex?: { changePct?: number } | null; goldSjc?: { changePct?: number } | null; btc?: { changePct24h?: number } | null; usdVnd?: { rate?: number } | null } | null,
  history: Array<{ date: string; score: number }>,
) {
  const score = Math.max(0, Math.min(100, newsPayload.metrics?.overallNewsScore ?? 48));
  const vnChange = marketSnapshot?.vnIndex?.changePct ?? 0;
  const goldChange = marketSnapshot?.goldSjc?.changePct ?? 0;
  const btcChange = marketSnapshot?.btc?.changePct24h ?? 0;
  const fxRate = marketSnapshot?.usdVnd?.rate ?? 25_500;
  const fxPressure = (fxRate - 25_500) / 40;

  const drivers: SentimentDriver[] = [
    { label: "Đà giá", value: clampMetric(score + vnChange * 10), tone: score >= 58 ? "greed" : score <= 42 ? "fear" : "neutral" },
    { label: "Tin tức", value: clampMetric(score + vnChange * 7 - goldChange * 5 + 4), tone: score >= 55 ? "greed" : score <= 40 ? "fear" : "neutral" },
    { label: "Độ rộng", value: clampMetric(score + vnChange * 14 + btcChange * 2), tone: score >= 52 ? "greed" : score <= 38 ? "fear" : "neutral" },
    { label: "Vàng", value: clampMetric(50 - goldChange * 14 + score * 0.18), tone: goldChange > 0.8 ? "fear" : goldChange < -0.4 ? "greed" : "neutral" },
    { label: "Khối ngoại", value: clampMetric(score + vnChange * 8 - fxPressure), tone: score >= 57 ? "greed" : score <= 44 ? "fear" : "neutral" },
  ];

  return {
    score,
    zone: getZone(score),
    history,
    historicalValues: [],
    yearlyExtremes: [],
    assetSentiments: newsPayload.metrics?.assetSentiment ?? [],
    drivers,
  };
}

export function buildAssetCards(snapshot: {
  vnIndex?: { price?: number; changePct?: number } | null;
  goldSjc?: { goldVnd?: number; changePct?: number } | null;
  btc?: { priceUsd?: number; changePct24h?: number } | null;
}): AssetOverviewCard[] {
  return [
    {
      asset: "Chứng khoán",
      price: snapshot.vnIndex?.price?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "--",
      change: snapshot.vnIndex?.changePct ?? 0,
      score: 32,
      trend: (snapshot.vnIndex?.changePct ?? 0) >= 0 ? "up" : "down",
      summary: "Theo dõi VN-Index và định giá blue-chip trước khi tăng tỷ trọng.",
      action: "Ưu tiên giải ngân theo đợt nhỏ nếu dòng tiền cải thiện.",
      color: "#3B82F6",
    },
    {
      asset: "Vàng SJC",
      price: snapshot.goldSjc?.goldVnd ? snapshot.goldSjc.goldVnd.toLocaleString("vi-VN") : "--",
      change: snapshot.goldSjc?.changePct ?? 0,
      score: 72,
      trend: (snapshot.goldSjc?.changePct ?? 0) >= 0 ? "up" : "down",
      summary: "Vàng là lớp phòng thủ khi tâm lý thị trường xấu đi.",
      action: "Nếu đã có vị thế, ưu tiên giữ thay vì FOMO mua đuổi.",
      color: "#F59E0B",
    },
    {
      asset: "Bất động sản",
      price: "45-65tr/m²",
      change: -2.1,
      score: 28,
      trend: "down",
      summary: "Thanh khoản còn yếu, phù hợp theo dõi nhu cầu ở thực hơn là đầu cơ.",
      action: "Giữ kỷ luật tiền mặt, chỉ khảo giá khi có nhu cầu thật.",
      color: "#8B5CF6",
    },
    {
      asset: "Bitcoin",
      price: snapshot.btc?.priceUsd ? `$${snapshot.btc.priceUsd.toLocaleString("en-US")}` : "--",
      change: snapshot.btc?.changePct24h ?? 0,
      score: 48,
      trend: (snapshot.btc?.changePct24h ?? 0) >= 0 ? "up" : "neutral",
      summary: "BTC phản ứng nhanh với khẩu vị rủi ro toàn cầu.",
      action: "Giữ tỷ trọng nhỏ, không để crypto lấn sang quỹ an toàn.",
      color: "#F97316",
    },
  ];
}

export function buildMacroCards(snapshot: {
  macro: { gdpYoY: Array<{ period: string; value: number }>; cpiYoY: Array<{ period: string; value: number }>; deposit12m: { min: number; max: number } };
  usdVnd?: { rate?: number } | null;
}): MacroCard[] {
  return [
    { emoji: "📈", label: "GDP YoY 2025", value: formatPercent(snapshot.macro.gdpYoY[0]?.value ?? 0), trend: "up" },
    { emoji: "⚖️", label: "CPI YoY 2025", value: formatPercent(snapshot.macro.cpiYoY[0]?.value ?? 0), trend: "neutral" },
    { emoji: "🏦", label: "Lãi suất tiền gửi 12T", value: `${snapshot.macro.deposit12m.min.toFixed(1)}-${snapshot.macro.deposit12m.max.toFixed(1)}%`, trend: "neutral" },
    { emoji: "💵", label: "USD/VND", value: snapshot.usdVnd?.rate?.toLocaleString("vi-VN") ?? "--", trend: "neutral" },
  ];
}

export function buildTrendSummary(snapshot: {
  vnIndex?: { changePct?: number } | null;
  goldSjc?: { changePct?: number } | null;
  btc?: { changePct24h?: number } | null;
}): TrendSummaryItem[] {
  return [
    { label: "VN-Index", value: formatPercent(snapshot.vnIndex?.changePct ?? 0) },
    { label: "Vàng SJC", value: formatPercent(snapshot.goldSjc?.changePct ?? 0) },
    { label: "BTC", value: formatPercent(snapshot.btc?.changePct24h ?? 0) },
  ];
}

export function buildMacroNarrative(snapshot: { aiSummary?: string | null; vnIndex?: { changePct?: number } | null; goldSjc?: { goldVnd?: number } | null }): string {
  if (snapshot.aiSummary) return snapshot.aiSummary;
  return `VN-Index ${formatPercent(snapshot.vnIndex?.changePct ?? 0)}, vàng SJC ${formatCompactVnd(snapshot.goldSjc?.goldVnd ?? 0)}.`;
}
```

- [ ] **Step 6: Run the mapper tests and verify they pass**

Run: `npm run test:run -- src/lib/market-overview/mappers.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the domain layer**

```bash
git add src/lib/market-overview/types.ts src/lib/market-overview/formatters.ts src/lib/market-overview/mappers.ts src/lib/market-overview/mappers.test.ts
git commit -m "feat: add market overview domain layer"
```

## Task 2: Add the market-overview hook and persistence behavior

**Files:**
- Create: `src/lib/market-overview/useMarketOverview.ts`
- Test: `src/lib/market-overview/useMarketOverview.test.tsx`
- Read: `src/lib/storage.ts`

- [ ] **Step 1: Write the failing hook tests**

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMarketOverview } from "./useMarketOverview";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const pushSentimentDay = vi.fn();
const getSentimentHistory = vi.fn(() => ({
  entries: [{ date: "2026-04-14", score: 35, overallZone: "Sợ hãi", topNews: [] }],
  yearlyHigh: { date: "2026-03-01", score: 70 },
  yearlyLow: { date: "2026-04-01", score: 12 },
}));

vi.mock("@/lib/storage", () => ({
  getSentimentHistory,
  pushSentimentDay,
  getRiskResult: () => ({ score: 9 }),
  getIncome: () => 30_000_000,
  getBudgetPots: () => [{ name: "Ăn uống", allocated: 5_000_000 }],
  getDebts: () => [{ min_payment: 3_000_000 }],
}));

describe("useMarketOverview", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    pushSentimentDay.mockReset();
  });

  it("merges news and market payloads into one ready state", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ metrics: { overallNewsScore: 29, history: [], assetSentiment: [] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ fetchedAt: "2026-04-15T08:30:00.000Z", macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 5.2, max: 7.2, source: "CafeF" } } }) });

    const { result } = renderHook(() => useMarketOverview());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.sentiment.score).toBe(29);
  });

  it("persists today sentiment after successful news fetch", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ metrics: { overallNewsScore: 29, history: [], assetSentiment: [{ asset: "Vàng", score: 70, trend: "up", news: "Tăng mạnh" }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ fetchedAt: "2026-04-15T08:30:00.000Z", macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 5.2, max: 7.2, source: "CafeF" } } }) });

    renderHook(() => useMarketOverview());

    await waitFor(() => expect(pushSentimentDay).toHaveBeenCalledTimes(1));
  });

  it("returns error state when either fetch fails hard", async () => {
    mockFetch.mockRejectedValueOnce(new Error("news down"));

    const { result } = renderHook(() => useMarketOverview());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/news down/i);
  });
});
```

- [ ] **Step 2: Run the hook tests and verify they fail**

Run: `npm run test:run -- src/lib/market-overview/useMarketOverview.test.tsx`

Expected: FAIL with module-not-found for `useMarketOverview`.

- [ ] **Step 3: Implement `useMarketOverview.ts` with merged fetch and persistence**

```ts
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBudgetPots,
  getDebts,
  getIncome,
  getRiskResult,
  getSentimentHistory,
  pushSentimentDay,
} from "@/lib/storage";
import {
  buildAssetCards,
  buildMacroCards,
  buildMacroNarrative,
  buildSentimentSnapshot,
  buildTrendSummary,
} from "./mappers";
import { formatMarketTime } from "./formatters";

type HookState =
  | { status: "loading"; data: null; error: null }
  | { status: "error"; data: null; error: string }
  | { status: "ready"; data: Record<string, unknown>; error: null };

function buildPersonalizedAlert() {
  const income = getIncome();
  const pots = getBudgetPots();
  const debts = getDebts();
  const risk = getRiskResult();
  const essentials = pots.reduce((sum, pot) => sum + (pot.allocated ?? 0), 0);
  const debtMin = debts.reduce((sum, debt) => sum + (debt.min_payment ?? 0), 0);
  const freeCashflow = income - essentials - debtMin;

  if (freeCashflow < 0) return { type: "danger" as const, icon: "🚨", msg: "Dòng tiền âm. Đừng cố đầu tư hăng hơn thị trường." };
  if ((risk?.score ?? 0) <= 6) return { type: "balanced" as const, icon: "🛡️", msg: "Ưu tiên vốn an toàn, chỉ quan sát cơ hội rõ ràng." };
  return { type: "safe" as const, icon: "📊", msg: "Bạn còn dòng tiền rảnh. Có thể giải ngân theo lớp tài sản phù hợp khẩu vị rủi ro." };
}

export function useMarketOverview() {
  const [state, setState] = useState<HookState>({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [newsResp, marketResp] = await Promise.all([
          fetch("/api/news", { cache: "no-store" }),
          fetch("/api/market-data", { cache: "no-store" }),
        ]);

        if (!newsResp.ok) throw new Error(`news ${newsResp.status}`);
        if (!marketResp.ok) throw new Error(`market ${marketResp.status}`);

        const newsPayload = await newsResp.json();
        const marketSnapshot = await marketResp.json();
        const stored = getSentimentHistory();
        const history = (stored.entries ?? []).slice(-16).map((entry: { date: string; score: number }) => ({
          date: new Date(entry.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          score: entry.score,
          vnindex: marketSnapshot.vnIndex?.price,
        }));

        const sentiment = buildSentimentSnapshot(newsPayload, marketSnapshot, history);
        pushSentimentDay({
          date: new Date().toISOString().slice(0, 10),
          score: sentiment.score,
          overallZone: sentiment.zone.label,
          topNews: sentiment.assetSentiments.slice(0, 3).map((item) => item.news),
        });

        const data = {
          lastUpdated: formatMarketTime(marketSnapshot.fetchedAt),
          stale: Boolean(newsPayload.stale || marketSnapshot.stale),
          sentiment,
          assets: {
            cards: buildAssetCards(marketSnapshot),
            trendData: [],
            opportunities: [],
            personalizedAlert: buildPersonalizedAlert(),
          },
          macro: {
            cards: buildMacroCards(marketSnapshot),
            commentary: buildMacroNarrative(marketSnapshot),
            trendSummary: buildTrendSummary(marketSnapshot),
          },
        };

        if (active) setState({ status: "ready", data, error: null });
      } catch (error) {
        if (active) setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => state, [state]);
}
```

- [ ] **Step 4: Run the hook tests and verify they pass**

Run: `npm run test:run -- src/lib/market-overview/useMarketOverview.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the hook**

```bash
git add src/lib/market-overview/useMarketOverview.ts src/lib/market-overview/useMarketOverview.test.tsx
git commit -m "feat: add market overview hook"
```

## Task 3: Create the route shell, tabs, and shared state blocks

**Files:**
- Create: `src/app/dashboard/market-overview/page.tsx`
- Create: `src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx`
- Create: `src/app/dashboard/market-overview/_components/MarketTabNav.tsx`
- Create: `src/app/dashboard/market-overview/_components/MarketHero.tsx`
- Create: `src/app/dashboard/market-overview/_components/MarketStateBlock.tsx`
- Test: `src/app/dashboard/market-overview/page.test.tsx`

- [ ] **Step 1: Write the failing route tests**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketOverviewPage from "./page";

vi.mock("@/lib/market-overview/useMarketOverview", () => ({
  useMarketOverview: () => ({
    status: "ready",
    error: null,
    data: {
      lastUpdated: "08:30 15/04/2026",
      stale: false,
      sentiment: { score: 29, zone: { label: "Sợ hãi", color: "#ea3943" }, drivers: [], assetSentiments: [], history: [], historicalValues: [], yearlyExtremes: [] },
      assets: { cards: [], trendData: [], opportunities: [], personalizedAlert: null },
      macro: { cards: [], commentary: "VN-Index yếu", trendSummary: [] },
    },
  }),
}));

describe("MarketOverviewPage", () => {
  it("renders the page title and default tab", () => {
    render(<MarketOverviewPage searchParams={{}} />);

    expect(screen.getByText("Tổng quan thị trường")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tâm lý" })).toHaveAttribute("aria-selected", "true");
  });

  it("selects the assets tab from search params", () => {
    render(<MarketOverviewPage searchParams={{ tab: "tai-san" }} />);

    expect(screen.getByRole("tab", { name: "Tài sản" })).toHaveAttribute("aria-selected", "true");
  });
});
```

- [ ] **Step 2: Run the route tests and verify they fail**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: FAIL with module-not-found for `./page`.

- [ ] **Step 3: Write the shared shell and route entry**

```tsx
// src/app/dashboard/market-overview/page.tsx
import { MarketOverviewShell } from "./_components/MarketOverviewShell";
import type { MarketTab } from "@/lib/market-overview/types";

function normalizeTab(value: string | string[] | undefined): MarketTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "tai-san" || tab === "vi-mo") return tab;
  return "tam-ly";
}

export default function MarketOverviewPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] };
}) {
  return <MarketOverviewShell initialTab={normalizeTab(searchParams?.tab)} />;
}
```

```tsx
// src/app/dashboard/market-overview/_components/MarketStateBlock.tsx
export function MarketLoadingState() {
  return <div data-testid="market-overview-loading" className="glass-card p-6 text-white/60">Đang tải tổng quan thị trường...</div>;
}

export function MarketErrorState({ message }: { message: string }) {
  return <div data-testid="market-overview-error" className="glass-card p-6 text-red-300">{message}</div>;
}
```

```tsx
// src/app/dashboard/market-overview/_components/MarketTabNav.tsx
import type { MarketTab } from "@/lib/market-overview/types";

const tabs: Array<{ key: MarketTab; label: string }> = [
  { key: "tam-ly", label: "Tâm lý" },
  { key: "tai-san", label: "Tài sản" },
  { key: "vi-mo", label: "Vĩ mô" },
];

export function MarketTabNav({ activeTab, onChange }: { activeTab: MarketTab; onChange: (tab: MarketTab) => void }) {
  return (
    <div role="tablist" aria-label="Tổng quan thị trường" className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onChange(tab.key)}
          className={activeTab === tab.key ? "rounded-full bg-[#E6B84F] px-4 py-2 text-sm font-semibold text-[#111318]" : "rounded-full border border-white/10 px-4 py-2 text-sm text-white/60"}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// src/app/dashboard/market-overview/_components/MarketHero.tsx
export function MarketHero({ lastUpdated, stale, narrative }: { lastUpdated: string | null; stale: boolean; narrative: string | null }) {
  return (
    <div className="mb-6 space-y-2">
      <h1 className="text-xl md:text-2xl font-bold text-white">Tổng quan <span className="text-gradient">thị trường</span></h1>
      <div className="flex items-center gap-2 text-[13px] text-white/40">
        <span>{lastUpdated ? `Cập nhật: ${lastUpdated}` : "Đang tải dữ liệu..."}</span>
        {stale ? <span className="rounded bg-yellow-400/10 px-2 py-0.5 text-yellow-300">Dữ liệu cũ</span> : null}
      </div>
      {narrative ? <p className="max-w-3xl text-[13px] leading-relaxed text-white/50">{narrative}</p> : null}
    </div>
  );
}
```

```tsx
// src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx
"use client";

import { useEffect, useState } from "react";
import { addXP } from "@/lib/gamification";
import { useMarketOverview } from "@/lib/market-overview/useMarketOverview";
import type { MarketTab } from "@/lib/market-overview/types";
import { MarketHero } from "./MarketHero";
import { MarketTabNav } from "./MarketTabNav";
import { MarketErrorState, MarketLoadingState } from "./MarketStateBlock";

export function MarketOverviewShell({ initialTab }: { initialTab: MarketTab }) {
  const [activeTab, setActiveTab] = useState<MarketTab>(initialTab);
  const state = useMarketOverview();

  useEffect(() => {
    addXP("check_market");
  }, []);

  if (state.status === "loading") return <MarketLoadingState />;
  if (state.status === "error") return <MarketErrorState message={state.error} />;

  return (
    <div>
      <MarketHero lastUpdated={state.data.lastUpdated as string | null} stale={state.data.stale as boolean} narrative={state.data.macro.commentary as string | null} />
      <MarketTabNav activeTab={activeTab} onChange={setActiveTab} />
      <div data-testid="market-overview-active-tab" className="mt-6">{activeTab}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run the route tests and verify they pass**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the shell**

```bash
git add src/app/dashboard/market-overview/page.tsx src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx src/app/dashboard/market-overview/_components/MarketTabNav.tsx src/app/dashboard/market-overview/_components/MarketHero.tsx src/app/dashboard/market-overview/_components/MarketStateBlock.tsx src/app/dashboard/market-overview/page.test.tsx
git commit -m "feat: add market overview route shell"
```

## Task 4: Build the Tâm lý tab

**Files:**
- Create: `src/app/dashboard/market-overview/_components/SentimentTab.tsx`
- Modify: `src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx`
- Read: `src/app/dashboard/components/MarketSection.tsx`

- [ ] **Step 1: Extend the route test to fail on missing Tâm lý content**

```tsx
it("renders the sentiment lens when the default tab is active", () => {
  vi.doMock("@/lib/market-overview/useMarketOverview", () => ({
    useMarketOverview: () => ({
      status: "ready",
      error: null,
      data: {
        lastUpdated: "08:30 15/04/2026",
        stale: false,
        sentiment: {
          score: 29,
          zone: { label: "Sợ hãi", color: "#ea3943" },
          drivers: [{ label: "Đà giá", value: 22, tone: "fear" }],
          assetSentiments: [{ asset: "Vàng", score: 72, trend: "up", news: "Tăng mạnh" }],
          history: [{ date: "10/04", score: 35 }],
          historicalValues: [{ label: "Hôm qua", score: 34 }],
          yearlyExtremes: [{ label: "Thấp hàng năm", date: "06/02/2026", score: 5 }],
        },
        assets: { cards: [], trendData: [], opportunities: [], personalizedAlert: null },
        macro: { cards: [], commentary: "VN-Index yếu", trendSummary: [] },
      },
    }),
  }));

  render(<MarketOverviewPage searchParams={{}} />);

  expect(screen.getByText("Nhiệt độ thị trường hôm nay")).toBeInTheDocument();
  expect(screen.getByText("Đà giá")).toBeInTheDocument();
  expect(screen.getByText("Vàng")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the route test and verify it fails**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: FAIL because `Nhiệt độ thị trường hôm nay` is not rendered.

- [ ] **Step 3: Implement `SentimentTab.tsx` and wire it into the shell**

```tsx
// src/app/dashboard/market-overview/_components/SentimentTab.tsx
import { getZone } from "@/lib/market-overview/formatters";

export function SentimentTab({
  score,
  drivers,
  assetSentiments,
}: {
  score: number;
  drivers: Array<{ label: string; value: number; tone: "fear" | "neutral" | "greed" }>;
  assetSentiments: Array<{ asset: string; score: number; trend: "up" | "down" | "neutral"; news: string }>;
}) {
  const zone = getZone(score);

  return (
    <div className="space-y-6">
      <section className="glass-card p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/30">Nhiệt độ thị trường hôm nay</p>
        <div className="mt-3 flex items-end gap-3">
          <span className="text-5xl font-black text-white">{score}</span>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: zone.color, backgroundColor: `${zone.color}18` }}>
            {zone.label}
          </span>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {drivers.map((driver) => (
          <div key={driver.label} className="glass-card p-4">
            <p className="text-[11px] text-white/40">{driver.label}</p>
            <p className="mt-2 text-xl font-bold text-white">{driver.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {assetSentiments.map((asset) => (
          <div key={asset.asset} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{asset.asset}</p>
              <span className="text-xs text-white/40">{asset.score}/100</span>
            </div>
            <p className="mt-2 text-[12px] text-white/50">{asset.news}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

```tsx
// in MarketOverviewShell.tsx render branch
import { SentimentTab } from "./SentimentTab";

const tabContent = activeTab === "tam-ly"
  ? <SentimentTab score={state.data.sentiment.score} drivers={state.data.sentiment.drivers} assetSentiments={state.data.sentiment.assetSentiments} />
  : <div data-testid="market-overview-active-tab">{activeTab}</div>;

return (
  <div>
    <MarketHero lastUpdated={state.data.lastUpdated} stale={state.data.stale} narrative={state.data.macro.commentary} />
    <MarketTabNav activeTab={activeTab} onChange={setActiveTab} />
    <div className="mt-6">{tabContent}</div>
  </div>
);
```

- [ ] **Step 4: Run the route test and verify it passes**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Tâm lý tab**

```bash
git add src/app/dashboard/market-overview/_components/SentimentTab.tsx src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx src/app/dashboard/market-overview/page.test.tsx
git commit -m "feat: add market overview sentiment tab"
```

## Task 5: Build the Tài sản tab

**Files:**
- Create: `src/app/dashboard/market-overview/_components/AssetsTab.tsx`
- Modify: `src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx`
- Read: `src/app/dashboard/market/page.tsx`

- [ ] **Step 1: Add a failing route test for the assets tab**

```tsx
it("renders asset cards and personalized alert on the assets tab", () => {
  render(<MarketOverviewPage searchParams={{ tab: "tai-san" }} />);

  expect(screen.getByText("4 lớp tài sản chính")).toBeInTheDocument();
  expect(screen.getByText("Chứng khoán")).toBeInTheDocument();
  expect(screen.getByText(/dòng tiền/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the route test and verify it fails**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: FAIL because assets content is not rendered.

- [ ] **Step 3: Implement `AssetsTab.tsx` and wire it into the shell**

```tsx
// src/app/dashboard/market-overview/_components/AssetsTab.tsx
export function AssetsTab({
  cards,
  personalizedAlert,
}: {
  cards: Array<{ asset: string; price: string; change: number; summary: string; action: string }>;
  personalizedAlert: { type: string; icon: string; msg: string } | null;
}) {
  return (
    <div className="space-y-6">
      {personalizedAlert ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E6B84F]">Vẹt Vàng nhìn dòng tiền của bạn</p>
          <p className="mt-2 text-sm text-white/85">{personalizedAlert.icon} {personalizedAlert.msg}</p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold text-white">4 lớp tài sản chính</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.asset} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{card.asset}</span>
                <span className="text-xs text-white/40">{card.change.toFixed(2)}%</span>
              </div>
              <p className="mt-2 text-lg font-bold text-white">{card.price}</p>
              <p className="mt-2 text-[12px] text-white/50">{card.summary}</p>
              <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-[11px] text-white/65">{card.action}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

```tsx
// in MarketOverviewShell.tsx
import { AssetsTab } from "./AssetsTab";

const tabContent = activeTab === "tam-ly"
  ? <SentimentTab score={state.data.sentiment.score} drivers={state.data.sentiment.drivers} assetSentiments={state.data.sentiment.assetSentiments} />
  : activeTab === "tai-san"
    ? <AssetsTab cards={state.data.assets.cards} personalizedAlert={state.data.assets.personalizedAlert} />
    : <div data-testid="market-overview-active-tab">{activeTab}</div>;
```

- [ ] **Step 4: Run the route test and verify it passes**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Tài sản tab**

```bash
git add src/app/dashboard/market-overview/_components/AssetsTab.tsx src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx src/app/dashboard/market-overview/page.test.tsx
git commit -m "feat: add market overview assets tab"
```

## Task 6: Build the Vĩ mô tab

**Files:**
- Create: `src/app/dashboard/market-overview/_components/MacroTab.tsx`
- Modify: `src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx`
- Read: `src/app/dashboard/macro/page.tsx`

- [ ] **Step 1: Add a failing route test for the macro tab**

```tsx
it("renders macro cards and impact blocks on the macro tab", () => {
  render(<MarketOverviewPage searchParams={{ tab: "vi-mo" }} />);

  expect(screen.getByText("Tín hiệu vĩ mô chính")).toBeInTheDocument();
  expect(screen.getByText("Ảnh hưởng tới gửi tiết kiệm")).toBeInTheDocument();
  expect(screen.getByText("Việc cần theo dõi tuần này")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the route test and verify it fails**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: FAIL because macro tab content is not rendered.

- [ ] **Step 3: Implement `MacroTab.tsx` and wire it into the shell**

```tsx
// src/app/dashboard/market-overview/_components/MacroTab.tsx
export function MacroTab({
  cards,
  commentary,
  trendSummary,
}: {
  cards: Array<{ label: string; value: string; emoji: string }>;
  commentary: string | null;
  trendSummary: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-bold text-white">Tín hiệu vĩ mô chính</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="glass-card p-5">
              <p className="text-xl">{card.emoji}</p>
              <p className="mt-2 text-lg font-bold text-white">{card.value}</p>
              <p className="text-[12px] text-white/45">{card.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-5">
        <h3 className="text-sm font-bold text-white">Tóm tắt nhanh</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">{commentary}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới gửi tiết kiệm</h3><p className="mt-2 text-[12px] text-white/55">Lãi suất và USD/VND quyết định mức hấp dẫn của tiền gửi.</p></div>
        <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới cổ phiếu</h3><p className="mt-2 text-[12px] text-white/55">GDP và CPI tác động trực tiếp đến kỳ vọng lợi nhuận và định giá.</p></div>
        <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới mua nhà</h3><p className="mt-2 text-[12px] text-white/55">Lãi suất thực và tỷ giá ảnh hưởng sức mua và chi phí vay mua nhà.</p></div>
      </section>

      <section className="glass-card p-5">
        <h3 className="text-sm font-bold text-white">Việc cần theo dõi tuần này</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {trendSummary.map((item) => (
            <span key={item.label} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{item.label}: {item.value}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
```

```tsx
// in MarketOverviewShell.tsx
import { MacroTab } from "./MacroTab";

const tabContent = activeTab === "tam-ly"
  ? <SentimentTab score={state.data.sentiment.score} drivers={state.data.sentiment.drivers} assetSentiments={state.data.sentiment.assetSentiments} />
  : activeTab === "tai-san"
    ? <AssetsTab cards={state.data.assets.cards} personalizedAlert={state.data.assets.personalizedAlert} />
    : <MacroTab cards={state.data.macro.cards} commentary={state.data.macro.commentary} trendSummary={state.data.macro.trendSummary} />;
```

- [ ] **Step 4: Run the route test and verify it passes**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Vĩ mô tab**

```bash
git add src/app/dashboard/market-overview/_components/MacroTab.tsx src/app/dashboard/market-overview/_components/MarketOverviewShell.tsx src/app/dashboard/market-overview/page.test.tsx
git commit -m "feat: add market overview macro tab"
```

## Task 7: Wire nav, redirects, and deep links; move Housing out of market

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/proxy.ts`
- Modify: `src/app/dashboard/components/MarketSection.tsx`
- Modify: `src/app/dashboard/components/DailyQuestSection.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/sentiment/page.tsx`
- Modify: `src/app/dashboard/market/page.tsx`
- Modify: `src/app/dashboard/macro/page.tsx`

- [ ] **Step 1: Write a failing test for legacy redirect-safe behavior or note the manual verification target**

```ts
// If you add src/proxy.test.ts, start with this:
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy market redirects", () => {
  it("redirects /dashboard/sentiment to the new tabbed route", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard/sentiment");
    const response = await proxy(request);
    expect(response.headers.get("location")).toContain("/dashboard/market-overview?tab=tam-ly");
  });
});
```

If you do not add this test file during implementation, the required manual verification is:

Run: `npm run build`

Expected: build passes, and local manual browser checks confirm the 3 old URLs land on the correct new tabs.

- [ ] **Step 2: Update `layout.tsx` nav groups**

```ts
const navGroups = [
  {
    label: "THỊ TRƯỜNG",
    items: [
      { href: "/dashboard/market-overview", label: "Tổng quan thị trường", icon: Activity },
      { href: "/dashboard/screener", label: "Lọc cổ phiếu", icon: Search },
      { href: "/dashboard/news", label: "Tin tức AI", icon: Newspaper },
    ],
  },
  {
    label: "KẾ HOẠCH LỚN",
    items: [
      { href: "/dashboard/housing", label: "Nhà ở", icon: Home },
    ],
  },
];
```

- [ ] **Step 3: Fix `proxy.ts` redirect construction and add legacy route mappings**

```ts
const redirects: Record<string, { pathname: string; search?: string }> = {
  "/dashboard/budget": { pathname: "/dashboard/cashflow", search: "?tab=budget" },
  "/dashboard/ledger": { pathname: "/dashboard/cashflow", search: "?tab=ledger" },
  "/dashboard/personal-cpi": { pathname: "/dashboard/spending-insights", search: "?tab=inflation" },
  "/dashboard/sentiment": { pathname: "/dashboard/market-overview", search: "?tab=tam-ly" },
  "/dashboard/market": { pathname: "/dashboard/market-overview", search: "?tab=tai-san" },
  "/dashboard/macro": { pathname: "/dashboard/market-overview", search: "?tab=vi-mo" },
};

const destination = redirects[pathname];
if (destination) {
  const url = request.nextUrl.clone();
  url.pathname = destination.pathname;
  url.search = destination.search ?? "";
  return NextResponse.redirect(url);
}
```

- [ ] **Step 4: Update all deep links to the new route**

```ts
// src/app/dashboard/components/MarketSection.tsx
href="/dashboard/market-overview"

// src/app/dashboard/components/DailyQuestSection.tsx
const questLinks: Record<string, string> = {
  log_expense: "/dashboard/budget",
  check_market: "/dashboard/market-overview?tab=tam-ly",
  setup_budget: "/dashboard/budget",
  read_knowledge: "/dashboard/market-overview?tab=vi-mo",
};

// src/app/page.tsx
{ href: "/dashboard/market-overview", label: "Tổng quan thị trường" }
```

- [ ] **Step 5: Thin old page files so they cannot double-fire page-specific side effects**

```tsx
"use client";

import { redirect } from "next/navigation";

export default function LegacySentimentPage() {
  redirect("/dashboard/market-overview?tab=tam-ly");
}
```

Repeat with:

- `LegacyMarketPage` -> `/dashboard/market-overview?tab=tai-san`
- `LegacyMacroPage` -> `/dashboard/market-overview?tab=vi-mo`

- [ ] **Step 6: Run targeted tests, then full verification**

Run: `npm run test:run -- src/app/dashboard/market-overview/page.test.tsx src/lib/market-overview/mappers.test.ts src/lib/market-overview/useMarketOverview.test.tsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit the integration wiring**

```bash
git add src/app/dashboard/layout.tsx src/proxy.ts src/app/dashboard/components/MarketSection.tsx src/app/dashboard/components/DailyQuestSection.tsx src/app/page.tsx src/app/dashboard/sentiment/page.tsx src/app/dashboard/market/page.tsx src/app/dashboard/macro/page.tsx
git commit -m "feat: wire market overview navigation and redirects"
```

## Task 8: Final cleanup and regression sweep

**Files:**
- Modify: any touched files from Tasks 1-7 only if required by failing lint/test/build output

- [ ] **Step 1: Remove dead duplicated helpers only after all new tests are green**

Check for duplicates before deleting:

```bash
rg "function getZone|const fallbackFgScore|IndicatorCard\(|buildIndicatorMetrics|addXP\(\"check_market\"\)" src/app/dashboard src/lib
```

Delete only helpers made obsolete by the new system. Keep code still used by dashboard home or unrelated pages.

- [ ] **Step 2: Run the full automated suite used by this repo**

Run: `npm run test:run`

Expected: PASS, or only the same known pre-existing failures already documented before this refactor. If failures change, fix them before continuing.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Manually verify the user-facing flows**

Check these routes in the browser:

- `/dashboard/market-overview`
- `/dashboard/market-overview?tab=tam-ly`
- `/dashboard/market-overview?tab=tai-san`
- `/dashboard/market-overview?tab=vi-mo`
- `/dashboard/sentiment`
- `/dashboard/market`
- `/dashboard/macro`
- dashboard home market card link
- daily quest links for `check_market` and `read_knowledge`
- landing page investment link

Expected:

- legacy URLs land on correct tabs
- sidebar shows 3 market items only
- `Nhà ở` no longer appears inside `THỊ TRƯỜNG`
- mobile tab nav remains usable without horizontal layout breakage

- [ ] **Step 4: Commit cleanup fixes if needed**

```bash
git add src
git commit -m "refactor: finalize market overview cleanup"
```

## Self-Review

### Spec Coverage

- 1 route: covered by Tasks 3 and 7.
- 1 data/view-model layer: covered by Tasks 1 and 2.
- 1 shared UI kit: covered by Tasks 3 through 6.
- 3 lenses (`Tâm lý`, `Tài sản`, `Vĩ mô`): covered by Tasks 4, 5, and 6.
- old routes become redirects only: covered by Task 7.
- nav reduced from 6 to 3 and `Nhà ở` moved out: covered by Task 7.
- build/lint/tests/manual verification: covered by Tasks 7 and 8.

No spec gaps found.

### Placeholder Scan

- No `TODO`, `TBD`, or "similar to task" placeholders remain.
- Every code-writing step includes an explicit code block.
- Every verification step includes an exact command and expected outcome.

### Type Consistency

- Tabs use one union: `"tam-ly" | "tai-san" | "vi-mo"`.
- Shared zone helper is always `getZone` from `src/lib/market-overview/formatters.ts`.
- Shared route is always `/dashboard/market-overview`.
- Normalized state entry point is always `useMarketOverview()`.

Plan is internally consistent.

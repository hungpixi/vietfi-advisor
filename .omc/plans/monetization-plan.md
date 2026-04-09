# VietFi Advisor — Monetization Work Plan

**Version:** 2.1 · **Date:** 2026-04-09
**Author:** Senior Fintech Planner
**Status:** Final — pending approval
**Changelog:** See Appendix F

---

## Table of Contents

1. [Requirements Summary](#1-requirements-summary)
2. [Acceptance Criteria](#2-acceptance-criteria)
3. [Phase 0 — Premium Auth Architecture (Day 0 — Pre-Phase 1)](#3-phase-0--premium-auth-architecture-day-0)
4. [Phase 1 — Loan & Insurance Affiliate (Days 1–3)](#4-phase-1--quick-win)
5. [Phase 2 — Premium Tier "Vẹt Vàng VIP" (Days 4–8)](#5-phase-2--premium-tier)
6. [Phase 3 — Gold & Unit Trust Distribution (Days 9–11)](#6-phase-3--gold--unit-trust)
7. [File Map](#7-file-map)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Verification Steps](#9-verification-steps)
10. [RALPLAN-DR Summary](#10-ralplan-dr-summary)
11. [ADR — Architecture Decisions](#11-adr)
12. [Appendix F — Changelog](#appendix-f--changelog)

---

## 1. Requirements Summary

### Revenue Levers

| # | Lever | Model | Commission Range |
|---|---|---|---|
| 1 | Loan & Insurance Affiliate | CPA / CPL | 1–5% per loan · 5–15% per insurance |
| 2 | Premium Tier "Vẹt Vàng VIP" | Subscription | ₫59,000/month |
| 3 | Digital Gold Distribution | AUM | 0.3–1.5%/year on AUM |

### Key Users

- **DTI < 35% + debts.length > 0** → loan affiliate (managing debt responsibly)
- **DTI ≥ 35% + debts.length > 0** → refinance + insurance upsell (existing `canRefinance` logic in `DTIDominoGauge.tsx` line 16)
- **All users** → premium upsell, gold investment
- **Logged-in / guest** → both served; unified `verifyPremium()` prevents split-brain

### Tech Constraints

- API routes: **standard (non-Edge) Runtime** for premium routes; Edge allowed for market/news crawlers
- No Stripe SDK yet — Phase 2 uses a mock subscription endpoint with `MOCK_AUTH_ENABLED`
- `src/lib/storage.ts` = single source of truth for guest data (18 typed keys)
- `src/lib/rbac.ts` = role gate system; `hasPremium()` unifies XP + promo code checks
- Promo codes: read from `NEXT_PUBLIC_VIETFI_PROMO_CODES` env var — never hardcoded
- Gemini API cost hierarchy: scripted → regex → streaming

---

## 2. Acceptance Criteria

### Phase 0 — Auth Architecture
- [ ] `src/lib/premium-auth.ts` exports `PremiumAuth { source: "local" | "supabase" | "xp"; active: boolean }`
- [ ] `src/lib/premium-auth.ts` exports `verifyPremium(req: Request): Promise<PremiumAuth>`
- [ ] `src/app/api/premium/route.ts` is a **standard (non-Edge)** Route Handler
- [ ] `.env.example` includes `NEXT_PUBLIC_VIETFI_PROMO_CODES="HUNGPIXI,TESTVIP"` and `MOCK_AUTH_ENABLED=false`
- [ ] `src/lib/affiliate/analytics.ts` exports typed `AnalyticsEvent` union and `trackEvent()` helper
- [ ] All affiliate UI components render "Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên." disclosure text
- [ ] `src/lib/rbac.ts` exports `UserRole.PREMIUM` (rank 4), `getRoleRank(role)`, and `hasPremium(currentXp, promoCode?)` — **all in Phase 0 Step 0.5 (C-1 fix)**
- [ ] `src/lib/rbac.ts` exports `ROLE_THRESHOLDS[UserRole.PREMIUM] = 0` and `ROLE_DESCRIPTIONS[UserRole.PREMIUM]`
- [ ] `src/lib/premium-auth.test.ts`, `src/lib/premium.test.ts`, `src/lib/affiliate/analytics.test.ts` test stubs exist — **Step 0.6 (T-3 fix)**

### Phase 1 — Affiliate
- [ ] `src/lib/affiliate/products.ts` exports ≥8 products (≥5 loans, ≥3 insurance)
- [ ] `LoanAffiliateModal` renders in `src/app/dashboard/debt/page.tsx` when `(dtiRatio < 35 AND debts.length > 0) OR (sessionStorage plan-viewed AND debts.length > 0)`
- [ ] Modal also renders after user views Snowball/Avalanche result (tracked via `sessionStorage`)
- [ ] Modal displays Vietnamese copy: *"Bạn đang gánh X triệu/năm lãi. Đề xuất khoản vay tốt hơn?"*
- [ ] CTA button opens partner URL (mock `href`) — no dead UI
- [ ] Modal is dismissible and does not re-appear for 24h (`vietfi_affiliate_dismissed_until`)
- [ ] Each product card shows: name, min/max loan, interest rate range, estimated monthly payment
- [ ] Insurance cards show: provider, coverage type, premium range/month
- [ ] `trackEvent("affiliate_modal_shown", { dtiBucket })` called on modal open
- [ ] `trackEvent("affiliate_cta_click", { productId, productType })` called on CTA click
- [ ] **Affiliate disclosure text** visible at bottom of modal
- [ ] `src/app/dashboard/debt/page.tsx` does not import any Stripe or payment SDK
- [ ] No hardcoded real phone numbers, bank account numbers, or API keys in affiliate files

### Phase 2 — Premium Tier
- [ ] `src/lib/rbac.ts` exports `UserRole.PREMIUM` enum value, rank 4 (above `LEGEND`)
- [ ] `src/lib/rbac.ts` exports `hasPremium(currentXp, promoCode)` checking both `role === PREMIUM` and env-var promo codes
- [ ] `src/lib/rbac.ts` exports `ROLE_THRESHOLDS[UserRole.PREMIUM]` = 0 (PREMIUM is subscription-based)
- [ ] LEGEND users (XP ≥ 2000) can access **3yr backtest** via `GET /api/portfolio/backtest` — verified via `X-User-XP: 2500` header — **T-1 fix**
- [ ] Non-LEGEND users (XP < 2000) calling `GET /api/portfolio/backtest` receive `403 { premiumRequired: true }` — **T-1 fix**
- [ ] `src/lib/premium-auth.ts` coverage ≥ 90% · `src/lib/premium.ts` coverage ≥ 90% · `src/lib/rbac.ts` `hasPremium` coverage ≥ 90% — **T-2 fix**
- [ ] `src/app/api/premium/route.ts` returns 200 with `{ active, tier, expiresAt }` on GET — standard runtime
- [ ] `src/app/api/premium/route.ts` returns 200 on POST (subscribe) and DELETE (cancel)
- [ ] `src/lib/premium-auth.ts` `verifyPremium()` called by all gated API routes
- [ ] `src/app/dashboard/debt/page.tsx` — "Portfolio Backtest 3yr" link gated by `hasPremium()`
- [ ] `src/app/dashboard/portfolio/page.tsx` — Monte Carlo projection button gated by `hasPremium()`
- [ ] `/api/portfolio/backtest` returns `{ premiumRequired: true }` when not premium
- [ ] `/api/portfolio/projection` returns `{ premiumRequired: true }` for `years > 5` on non-premium
- [ ] VIP badge in sidebar uses `hasPremium()` — **wrapped in `useState`/`useEffect` mounted guard**
- [ ] `src/lib/affiliate/analytics.ts` logs `premium_subscribe`, `premium_cancel` events
- [ ] LEGEND users (rank 3) can access 3yr backtest; only PREMIUM unlocks >5yr projection + Monte Carlo

### Phase 3 — Gold Distribution
- [ ] `GoldTracker.tsx` renders "Mua Vàng SJC/DOJI/PNJ" CTA button with disclosure footer
- [ ] CTA button opens `href` to partner page (mock URL in `src/lib/affiliate/gold-partners.ts`)
- [ ] `src/lib/affiliate/gold-partners.ts` exports ≥3 vendors with: name, logo placeholder, affiliate URL, commission rate
- [ ] `UnitTrustProduct` type includes `updatedAt: string (ISO)` and `isStale(hrs = 24): boolean` helper
- [ ] Unit trust recommendation panel renders in portfolio page with disclosure footer
- [ ] All affiliate links use `rel="noopener noreferrer"` and `utm_source=vietfi&utm_medium=gold_affiliate`
- [ ] `trackEvent("gold_affiliate_click", { vendorId })` called on each gold CTA click

---

## 3. Phase 0 — Premium Auth Architecture (Day 0)

> **CRITICAL-1, CRITICAL-2, CRITICAL-3, CRITICAL-5, MEDIUM-5 + Architect Synthesis**
>
> This phase is mandatory before Phase 2 begins. It prevents the premium auth split-brain
> that would silently break subscriptions in production on Vercel Edge Runtime.

### Step 0.1 — Premium Auth Interface & Verification
**File:** `src/lib/premium-auth.ts` (NEW)

```typescript
// ─── Types ───────────────────────────────────────────────
export type PremiumSource = "local" | "supabase" | "xp";

export interface PremiumAuth {
  source: PremiumSource;   // how premium was determined
  active: boolean;
  tier?: "Vẹt Vàng VIP";
  expiresAt?: string | null;  // ISO date
}

/**
 * Unified premium verification — the single source of truth for
 * all gated API routes and client-side premium checks.
 *
 * Resolution order:
 *  1. X-Premium-Key header (Phase 2 mock — only if MOCK_AUTH_ENABLED=true)
 *  2. XP-based (LEGEND+ users get premium features by XP rank)
 *  3. localStorage premium state (guest subscriptions)
 *  4. Supabase session (logged-in users) — Phase 3
 */
export async function verifyPremium(req: Request): Promise<PremiumAuth> {
  // 1. Mock header check (Phase 2 only)
  const mockEnabled = process.env.MOCK_AUTH_ENABLED === "true";
  if (mockEnabled) {
    const key = req.headers.get("X-Premium-Key");
    if (key === "vip-mock-key") {
      return { source: "local", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
    }
  }

  // 2. XP-based premium (LEGEND rank 3 and above)
  const xpHeader = req.headers.get("X-User-XP");
  if (xpHeader) {
    const xp = parseInt(xpHeader, 10);
    if (!isNaN(xp) && getRoleRank(getRoleFromXP(xp)) >= getRoleRank(UserRole.LEGEND)) {
      return { source: "xp", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
    }
  }

  // 3. localStorage check (client-initiated subscription)
  // Note: This requires the route to be standard (non-Edge) Runtime.
  // In Edge Runtime, localStorage is unavailable and this branch is skipped.
  // The client is responsible for calling GET /api/premium to sync state.
  const cookieHeader = req.headers.get("cookie") || "";
  const premiumCookie = parseCookie(cookieHeader, "vietfi_premium");
  if (premiumCookie === "active") {
    return { source: "local", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
  }

  // 4. Supabase session (Phase 3 — stub for now)
  // TODO(Phase 3): Verify Supabase JWT, check is_premium in profiles table
  return { source: "local", active: false };
}

// ─── Helpers ──────────────────────────────────────────────
import { getRoleFromXP, getRoleRank, UserRole } from "@/lib/rbac";

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1].trim()) : null;
}
```

> **Why this resolves CRITICAL-1:** `verifyPremium()` reads the `vietfi_premium=active` **cookie**, not localStorage. Cookies are sent to standard runtime routes automatically. The `/api/premium` route itself sets this cookie on subscribe.

### Step 0.2 — Env Var & Promo Code Management
**File:** `.env.example` (MODIFY — add entries)

```bash
# ─── Monetization ─────────────────────────────────────────
# Comma-separated promo codes that grant VIP access
NEXT_PUBLIC_VIETFI_PROMO_CODES="HUNGPIXI,TESTVIP"

# Enable mock premium auth (Phase 2 only — NEVER true in production)
MOCK_AUTH_ENABLED=false
```

**File:** `src/lib/rbac.ts` (MODIFY — promo codes from env)

```typescript
// Promo codes read from env — NEVER hardcoded in source
function getAllowedPromoCodes(): Record<string, boolean> {
  const envCodes = process.env.NEXT_PUBLIC_VIETFI_PROMO_CODES ?? "";
  const codes: Record<string, boolean> = {};
  for (const code of envCodes.split(",").map((c) => c.trim())) {
    if (code) codes[code.toUpperCase()] = true;
  }
  return codes;
}

const PROMO_CODES = getAllowedPromoCodes();

export function hasPremium(currentXp: number, promoCode?: string): boolean {
  const role = getRoleFromXP(currentXp);
  // PREMIUM role set via subscription
  if (role === UserRole.PREMIUM) return true;
  // LEGEND+ rank gets premium features by XP
  if (getRoleRank(role) >= getRoleRank(UserRole.LEGEND)) return true;
  // Promo code from env var
  if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) return true;
  return false;
}
```

> **Why this resolves CRITICAL-3:** `HUNGPIXI` is no longer in source. Code review in GitHub history will never expose it. Changing codes requires only a redeploy of env vars.

> **Why this resolves CRITICAL-5:** `hasPremium()` now checks XP rank (LEGEND) + promo codes + PREMIUM role. VIP badge can safely call `hasPremium(currentXp, promoCode)` without reading localStorage.

### Step 0.3 — Premium API Route (Standard Runtime)
**File:** `src/app/api/premium/route.ts` (NEW — explicitly standard runtime)

```typescript
// ⚠️ Explicitly standard (non-Edge) runtime — required for cookie + localStorage access
// Do NOT add "export const runtime = 'edge'" here.
export const dynamic = "force-dynamic"; // opt out of static generation

import { NextRequest, NextResponse } from "next/server";
import { getPremiumState, subscribePremium, cancelPremium } from "@/lib/premium";
import { setCookie } from "@/lib/premium-auth"; // helper to set auth cookie

// GET — check subscription status
export async function GET(_req: NextRequest) {
  const state = getPremiumState();
  const response = NextResponse.json({
    active: state.active,
    tier: state.tier,
    subscribedAt: state.subscribedAt,
    expiresAt: state.expiresAt,
  });
  // Sync cookie for verifyPremium() on subsequent API calls
  if (state.active) {
    response.cookies.set("vietfi_premium", "active", {
      httpOnly: false,  // readable by client JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
  return response;
}

// POST — subscribe (mock — no real Stripe)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const promoCode = typeof body.promoCode === "string" ? body.promoCode : undefined;
  const state = subscribePremium(promoCode);
  const response = NextResponse.json({ success: true, ...state }, { status: 200 });
  if (state.active) {
    response.cookies.set("vietfi_premium", "active", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

// DELETE — cancel
export async function DELETE(_req: NextRequest) {
  const state = cancelPremium();
  const response = NextResponse.json({ success: true, ...state }, { status: 200 });
  response.cookies.delete("vietfi_premium");
  return response;
}
```

> **Why this resolves CRITICAL-1:** No Edge Runtime — localStorage access is safe. Cookie is set so `verifyPremium()` can read it on subsequent requests from the same client.

### Step 0.5 — Extend RBAC with PREMIUM Role + Helpers
**File:** `src/lib/rbac.ts` (MODIFY — add before Phase 2)

> **C-1 fix:** This step must land in Phase 0, not Phase 2. Step 2.1 cannot compile without these additions. GamificationState.xp is already confirmed present in source (Architect G-4 verified).

```typescript
// ─── Add to existing UserRole enum ───────────────────────
export enum UserRole {
  MEMBER = "MEMBER",
  PRO = "PRO",
  MASTER = "MASTER",
  LEGEND = "LEGEND",
  PREMIUM = "PREMIUM",    // subscription-based — not XP-gated; rank 4
}

const ROLE_RANKS: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.PRO]: 1,
  [UserRole.MASTER]: 2,
  [UserRole.LEGEND]: 3,
  [UserRole.PREMIUM]: 4,  // above LEGEND
};

// ─── Export getRoleRank (Architect G-1 fix) ────────────────
export function getRoleRank(role: UserRole): number {
  return ROLE_RANKS[role] ?? 0;
}

// ─── Add hasPremium (Architect G-3 fix) ──────────────────
export function hasPremium(currentXp: number, promoCode?: string): boolean {
  const role = getRoleFromXP(currentXp);
  if (role === UserRole.PREMIUM) return true;
  if (getRoleRank(role) >= getRoleRank(UserRole.LEGEND)) return true;
  if (promoCode) {
    const codes = (process.env.NEXT_PUBLIC_VIETFI_PROMO_CODES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (codes.includes(promoCode.toUpperCase())) return true;
  }
  return false;
}

export const ROLE_THRESHOLDS = {
  ...ROLE_THRESHOLDS,           // preserve existing
  [UserRole.PREMIUM]: 0,        // subscription — not XP-gated
};

export const ROLE_DESCRIPTIONS = {
  ...ROLE_DESCRIPTIONS,         // preserve existing
  [UserRole.PREMIUM]: "Vẹt Vàng VIP",
};
```

> **Why this resolves C-1:** `getRoleRank()` is now exported (G-1). `PREMIUM` is added to `UserRole` with rank 4 (G-2). `hasPremium()` is added with XP rank + promo code logic (G-3). Step 2.1 can now compile.

### Step 0.6 — Phase 0 Unit Test Stubs
**Files:** `src/lib/premium-auth.test.ts`, `src/lib/premium.test.ts`, `src/lib/affiliate/analytics.test.ts` (NEW)

> **T-3 fix:** All Phase 0 pure-logic files get test stubs before Phase 1 begins.

**`src/lib/premium-auth.test.ts`** — stub:
```typescript
import { describe, it, expect } from "vitest";
import { verifyPremium } from "./premium-auth";

describe("verifyPremium", () => {
  it("returns active:false when no auth present", async () => {
    const req = new Request("http://localhost");
    const result = await verifyPremium(req);
    expect(result.active).toBe(false);
  });

  it("accepts mock header when MOCK_AUTH_ENABLED=true", async () => {
    // TODO: set MOCK_AUTH_ENABLED=true via env stub
  });

  it("accepts LEGEND XP header (rank 3)", async () => {
    const req = new Request("http://localhost", {
      headers: { "X-User-XP": "2500" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(true);
  });

  it("rejects non-LEGEND XP", async () => {
    const req = new Request("http://localhost", {
      headers: { "X-User-XP": "500" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(false);
  });
});
```

**`src/lib/premium.test.ts`** — stub:
```typescript
import { describe, it, expect } from "vitest";
import { getPremiumState, subscribePremium, cancelPremium } from "./premium";

describe("premium state", () => {
  it("getPremiumState returns inactive by default", () => {
    const state = getPremiumState();
    expect(state.active).toBe(false);
  });

  it("subscribePremium sets active:true", () => {
    const state = subscribePremium();
    expect(state.active).toBe(true);
    expect(state.tier).toBe("Vẹt Vàng VIP");
  });

  it("cancelPremium clears state", () => {
    subscribePremium();
    const state = cancelPremium();
    expect(state.active).toBe(false);
  });

  it("expiresAt past date returns inactive", () => {
    // TODO: set expiresAt to past date in localStorage, verify expiry
  });
});
```

**`src/lib/affiliate/analytics.test.ts`** — stub:
```typescript
import { describe, it, expect } from "vitest";
import { dtiBucket } from "./affiliate/analytics";

describe("dtiBucket", () => {
  it("returns low for DTI < 35", () => expect(dtiBucket(30)).toBe("low"));
  it("returns medium for DTI 35–49", () => expect(dtiBucket(40)).toBe("medium"));
  it("returns high for DTI ≥ 50", () => expect(dtiBucket(55)).toBe("high"));
});
```

---

### Step 0.7 — Analytics Event Schema
**File:** `src/lib/affiliate/analytics.ts` (NEW)

```typescript
// ─── Event Types ──────────────────────────────────────────
export type AnalyticsEvent =
  | { type: "affiliate_modal_shown"; payload: { dtiBucket: "low" | "medium" | "high"; debts: number } }
  | { type: "affiliate_cta_click"; payload: { productId: string; productType: "loan" | "insurance" } }
  | { type: "affiliate_link_click"; payload: { vendorId: string; source: "gold" | "unit_trust" } }
  | { type: "premium_subscribe"; payload: { promoCode?: string; source: PremiumSource } }
  | { type: "premium_cancel"; payload: Record<string, never> }
  | { type: "premium_gate_shown"; payload: { feature: string } };

// ─── Tracker ──────────────────────────────────────────────
export function trackEvent(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === "test") return;

  // Phase 1–2: console.log + localStorage queue (zero-cost)
  const entry = { ts: new Date().toISOString(), event };
  try {
    const queue = JSON.parse(localStorage.getItem("vietfi_analytics_queue") ?? "[]") as typeof entry[];
    queue.push(entry);
    // Keep last 50 events
    if (queue.length > 50) queue.shift();
    localStorage.setItem("vietfi_analytics_queue", JSON.stringify(queue));
  } catch {
    // localStorage unavailable (server-side)
  }
}

// ─── Helpers ──────────────────────────────────────────────
export function dtiBucket(dtiRatio: number): "low" | "medium" | "high" {
  if (dtiRatio < 35) return "low";
  if (dtiRatio < 50) return "medium";
  return "high";
}
```

> **Why this resolves HIGH-2:** Typed `AnalyticsEvent` union enables TypeScript coverage of all event shapes. Without this, F1 pre-mortem signal ("session duration drop >20%") is unmeasurable.

---

## 4. Phase 1 — Loan & Insurance Affiliate (Days 1–3)

**Goal:** Affiliate revenue from loan & insurance leads — zero payment integration.

### Step 1.1 — Product Catalog
**File:** `src/lib/affiliate/products.ts` (NEW)

```typescript
// ─── Types ───────────────────────────────────────────────
export interface LoanProduct {
  id: string;
  name: string;                    // "Vay Tín Chấp Techcombank"
  bank: string;
  minAmount: number;                // VND
  maxAmount: number;                // VND
  rateMin: number;                 // %/năm
  rateMax: number;                 // %/năm
  maxTenorMonths: number;
  affiliateUrl: string;
  commissionRate: number;          // decimal, e.g. 0.015 = 1.5%
  tags: string[];                  // e.g. ["refinance", "fast_approval"]
  badge?: string;                  // e.g. "Ưu đãi 0% lãi 6 tháng đầu"
}

export interface InsuranceProduct {
  id: string;
  provider: string;
  name: string;                    // "Bảo hiểm Tai nạn 24/7"
  type: "life" | "health" | "accident" | "property";
  premiumMinMonthly: number;        // VND
  premiumMaxMonthly: number;       // VND
  coverageMin: number;             // VND
  coverageMax: number;             // VND
  affiliateUrl: string;
  commissionRate: number;          // decimal
}

// ─── Mock Catalog ─────────────────────────────────────────
export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "tcb-refi",
    name: "Vay Tái tài chính",
    bank: "Techcombank",
    minAmount: 30_000_000,
    maxAmount: 300_000_000,
    rateMin: 7.9,
    rateMax: 11.9,
    maxTenorMonths: 60,
    affiliateUrl: "https://partner.vietfi.io/tcb-refi?src=vietfi",
    commissionRate: 0.015,
    tags: ["refinance", "low_rate"],
    badge: "Trả nợ thẻ tín dụng",
  },
  {
    id: "vpbank-cash",
    name: "Vay Tiền Mặt",
    bank: "VPBank",
    minAmount: 10_000_000,
    maxAmount: 100_000_000,
    rateMin: 12.0,
    rateMax: 17.0,
    maxTenorMonths: 36,
    affiliateUrl: "https://partner.vietfi.io/vp-cash?src=vietfi",
    commissionRate: 0.02,
    tags: ["fast_approval", "no_collateral"],
    badge: "Giải ngân 30 phút",
  },
  {
    id: "bidv-home",
    name: "Vay Mua Nhà",
    bank: "BIDV",
    minAmount: 500_000_000,
    maxAmount: 10_000_000_000,
    rateMin: 5.8,
    rateMax: 8.5,
    maxTenorMonths: 240,
    affiliateUrl: "https://partner.vietfi.io/bidv-home?src=vietfi",
    commissionRate: 0.008,
    tags: ["mortgage", "long_tenor"],
  },
  {
    id: "hdsaison-personal",
    name: "Vay Cá Nhân HD SAISON",
    bank: "HD SAISON",
    minAmount: 5_000_000,
    maxAmount: 50_000_000,
    rateMin: 16.0,
    rateMax: 22.0,
    maxTenorMonths: 24,
    affiliateUrl: "https://partner.vietfi.io/hdsaison?src=vietfi",
    commissionRate: 0.03,
    tags: ["fast_approval", "poor_credit"],
    badge: "Không cần chứng minh thu nhập",
  },
  {
    id: "fe-credit-refi",
    name: "Vay Trả Nợ Fe Credit",
    bank: "Fe Credit",
    minAmount: 10_000_000,
    maxAmount: 75_000_000,
    rateMin: 14.0,
    rateMax: 18.0,
    maxTenorMonths: 48,
    affiliateUrl: "https://partner.vietfi.io/fecredit-refi?src=vietfi",
    commissionRate: 0.025,
    tags: ["refinance", "debt_consolidation"],
    badge: "Có thể vay dù nợ xấu nhóm 2",
  },
];

export const INSURANCE_PRODUCTS: InsuranceProduct[] = [
  {
    id: "manulife-accident",
    provider: "Manulife",
    name: "Bảo Hiểm Tai Nạn 24/7",
    type: "accident",
    premiumMinMonthly: 150_000,
    premiumMaxMonthly: 500_000,
    coverageMin: 100_000_000,
    coverageMax: 500_000_000,
    affiliateUrl: "https://partner.vietfi.io/manulife-acc?src=vietfi",
    commissionRate: 0.12,
  },
  {
    id: "baoviet-health",
    provider: "Bảo Việt",
    name: "Bảo Hiểm Sức Khỏe Toàn Cầu",
    type: "health",
    premiumMinMonthly: 300_000,
    premiumMaxMonthly: 1_200_000,
    coverageMin: 200_000_000,
    coverageMax: 1_000_000_000,
    affiliateUrl: "https://partner.vietfi.io/baoviet-health?src=vietfi",
    commissionRate: 0.10,
  },
  {
    id: "aia-life",
    provider: "AIA",
    name: "Bảo Hiểm Nhân Thọ Tích Lũy",
    type: "life",
    premiumMinMonthly: 500_000,
    premiumMaxMonthly: 5_000_000,
    coverageMin: 500_000_000,
    coverageMax: 5_000_000_000,
    affiliateUrl: "https://partner.vietfi.io/aia-life?src=vietfi",
    commissionRate: 0.08,
  },
];

// ─── Helpers ──────────────────────────────────────────────
export function filterLoansByAmount(maxAmount: number): LoanProduct[] {
  return LOAN_PRODUCTS.filter((p) => p.minAmount <= maxAmount);
}

export function formatRateRange(min: number, max: number): string {
  return min === max ? `${min}%` : `${min}–${max}%`;
}
```

### Step 1.2 — Loan Affiliate Modal Component
**File:** `src/components/affiliate/LoanAffiliateModal.tsx` (NEW)

- Position: `src/components/affiliate/` (new directory)
- Props: `{ dtiRatio: number; totalMonthlyInterest: number; onClose: () => void }`
- Dismiss logic: stores `vietfi_affiliate_dismissed_until` = `Date.now() + 86_400_000` in localStorage
- On re-open check: skip if `Date.now() < dismissedUntil`
- Two tabs: **"Vay Tái Tài Chính"** (default) | **"Bảo Hiểm"**
- Loan cards: show bank logo placeholder, badge, rate range, max amount, monthly payment estimate
- Insurance cards: show provider, type icon, premium range, coverage range
- All CTAs: `<a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">`
- **Calls `trackEvent("affiliate_modal_shown", { dtiBucket, debts })` on mount**
- **Calls `trackEvent("affiliate_cta_click", { productId, productType })` on CTA click**
- **Affiliate disclosure footer** (see HIGH-1): *"Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên."*

### Step 1.3 — Wire into Debt Page
**File:** `src/app/dashboard/debt/page.tsx`

Changes:
1. **Add imports:**
   ```typescript
   import { LoanAffiliateModal } from "@/components/affiliate/LoanAffiliateModal";
   import { dtiBucket } from "@/lib/affiliate/analytics";
   ```
2. **Add state** (after existing state declarations):
   ```typescript
   const [showAffiliateModal, setShowAffiliateModal] = useState(false);
   ```
3. **Add "Viewed Plan" flag** — after `currentPlan` is computed:
   ```typescript
   useEffect(() => {
     if (currentPlan.length > 0) {
       sessionStorage.setItem("vf_viewed_plan", "1");
     }
   }, [currentPlan]);
   ```
4. **Add trigger condition** (FIXED per CRITICAL-6 + Architect):
   ```typescript
   useEffect(() => {
     const dismissedUntil = localStorage.getItem("vietfi_affiliate_dismissed_until");
     if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
       // Both triggers require debts.length > 0 (ADR-001 clarification)
       const hasDebts = debts.length > 0;
       const viewedPlan = sessionStorage.getItem("vf_viewed_plan") === "1";
       if (hasDebts && (dtiRatio < 35 || viewedPlan)) {
         setShowAffiliateModal(true);
       }
     }
   }, [dtiRatio, debts.length]);
   ```
5. **Track modal shown** (add to modal render):
   ```typescript
   // In the modal's useEffect or on mount:
   trackEvent("affiliate_modal_shown", {
     dtiBucket: dtiBucket(dtiRatio),
     debts: debts.length,
   });
   ```
6. **Render modal** after the `{showAddModal && ...}` block:
   ```tsx
   {showAffiliateModal && (
     <LoanAffiliateModal
       dtiRatio={dtiRatio}
       totalMonthlyInterest={totalHiddenInterest / 12}
       onClose={() => {
         setShowAffiliateModal(false);
         localStorage.setItem("vietfi_affiliate_dismissed_until", String(Date.now() + 86_400_000));
       }}
     />
   )}
   ```

> **ADR-001 Clarification (CRITICAL-6):** The trigger condition now correctly implements ADR-001 as clarified by the Architect:
> - `dtiRatio < 35 AND debts.length > 0` — users managing debt (not yet in danger)
> - `plan-viewed AND debts.length > 0` — users actively planning debt payoff
> Both sub-conditions require `debts.length > 0` to avoid showing the modal to debt-free users.

---

## 5. Phase 2 — Premium Tier (Days 4–8)

### Step 2.1 — Verify RBAC Extensions (Phase 0 prerequisite met)
**File:** `src/lib/rbac.ts`

> All RBAC additions (PREMIUM enum, `getRoleRank()`, `hasPremium()`, ROLE_THRESHOLDS/ROLE_DESCRIPTIONS extensions) are in Phase 0 Step 0.5. Step 2.1 is a verification step: confirm the additions compile and existing `getRoleFromXP()` is unchanged (PREMIUM is NOT returned by XP — only via `subscribePremium()`).

**Verification checklist:**
- [ ] `UserRole.PREMIUM` exists with rank 4
- [ ] `getRoleRank(UserRole.LEGEND)` returns `3`
- [ ] `getRoleRank(UserRole.PREMIUM)` returns `4`
- [ ] `hasPremium(2500)` returns `true` (LEGEND XP)
- [ ] `hasPremium(100)` returns `false` (non-LEGEND XP)
- [ ] `hasPremium(100, "HUNGPIXI")` returns `true` (valid promo code from env var)
- [ ] `hasPremium(100, "INVALID")` returns `false` (invalid promo code)
- [ ] `ROLE_THRESHOLDS[UserRole.PREMIUM]` equals `0`
- [ ] `ROLE_DESCRIPTIONS[UserRole.PREMIUM]` equals `"Vẹt Vàng VIP"`

### Step 2.2 — Premium State Management
**File:** `src/lib/premium.ts` (NEW)

```typescript
import type { GamificationState } from "@/lib/gamification";

export interface PremiumState {
  active: boolean;
  tier: "Vẹt Vàng VIP";
  subscribedAt: string | null;
  expiresAt: string | null;
  promoCode: string | null;
}

const PREMIUM_KEY = "vietfi_premium";

const DEFAULT_STATE: PremiumState = {
  active: false,
  tier: "Vẹt Vàng VIP",
  subscribedAt: null,
  expiresAt: null,
  promoCode: null,
};

function isServer() {
  return typeof window === "undefined";
}

export function getPremiumState(): PremiumState {
  if (isServer()) return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PremiumState>;
    // Expire check
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(PREMIUM_KEY);
      return DEFAULT_STATE;
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function subscribePremium(promoCode?: string): PremiumState {
  if (isServer()) return DEFAULT_STATE;
  const state: PremiumState = {
    active: true,
    tier: "Vẹt Vàng VIP",
    subscribedAt: new Date().toISOString(),
    expiresAt: null,
    promoCode: promoCode ?? null,
  };
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(state));
  return state;
}

export async function cancelPremium(): Promise<PremiumState> {
  if (isServer()) return DEFAULT_STATE;
  // C-2 fix: call DELETE /api/premium first to clear the server-set cookie
  // before removing localStorage. Without this, the cookie survives browser restart
  // and GET /api/premium returns active:true on next reload.
  try {
    await fetch("/api/premium", { method: "DELETE" });
  } catch {
    // Network error — proceed with localStorage cleanup anyway
  }
  localStorage.removeItem(PREMIUM_KEY);
  return DEFAULT_STATE;
}

export function isPremiumActive(): boolean {
  return getPremiumState().active;
}

/**
 * Sync premium state from Supabase on app load.
 * Called by useEffect in dashboard layout.
 */
export async function syncPremiumFromSupabase(): Promise<PremiumState> {
  // Phase 3 stub — for now, just return local state
  // TODO(Phase 3): fetch /api/premium which sets cookie for server-side reads
  return getPremiumState();
}
```

### Step 2.3 — Add storage keys
**File:** `src/lib/storage.ts`

Append (before `clearAllUserData`):
```typescript
const PREMIUM_KEY = "vietfi_premium";

export function getPremiumStateLS(): PremiumState | null {
  return getItem<PremiumState | null>(PREMIUM_KEY, null);
}

export function setPremiumStateLS(state: PremiumState): void {
  setItem(PREMIUM_KEY, state);
}
```

Update `ALL_USER_KEYS` array to include `PREMIUM_KEY`.

### Step 2.4 — Premium Gate Modal
**File:** `src/components/gamification/PremiumGateModal.tsx` (NEW)

- Props: `{ featureName: string; onClose: () => void }`
- Vietnamese copy: *"Tính năng [Tên] chỉ dành cho Vẹt Vàng VIP"*
- Price display: "**59.000đ / tháng**" (≈ $2.40 USD)
- CTA: "Nâng cấp ngay" → calls `subscribePremium()` → closes modal → VIP badge appears
- Secondary: "Nhập mã VIP" → input + promo code validation (reads env var codes)
- Dismissible
- Calls `trackEvent("premium_gate_shown", { feature: featureName })` on mount

### Step 2.5 — Gate Backtest API (LEGEND = 3yr free, PREMIUM = full)
**File:** `src/app/api/portfolio/backtest/route.ts`

```typescript
import { verifyPremium } from "@/lib/premium-auth";
import type { PremiumSource } from "@/lib/premium-auth";

export async function GET(req: NextRequest) {
  // LEGEND (rank 3) gets 3yr backtest; PREMIUM (rank 4) gets 3yr + 5yr+
  const auth = await verifyPremium(req);
  if (!auth.active) {
    return NextResponse.json(
      { error: "PREMIUM_REQUIRED", message: "Backtest requires Vẹt Vàng VIP", premiumRequired: true },
      { status: 403 }
    );
  }
  // ... existing backtest logic
}
```

> **ADR-002 revision:** LEGEND users now get 3yr backtest. Only Monte Carlo and >5yr projections are PREMIUM-only.

### Step 2.6 — Gate Projection API
**File:** `src/app/api/portfolio/projection/route.ts`

```typescript
import { verifyPremium } from "@/lib/premium-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyPremium(req);
  const requestedYears = parseInt(req.nextUrl.searchParams.get("years") || "10", 10);

  // > 5yr requires PREMIUM; ≤5yr is free (LEGEND and below)
  if (requestedYears > 5 && !auth.active) {
    return NextResponse.json(
      { error: "PREMIUM_REQUIRED", message: "Projection > 5yr requires Vẹt Vàng VIP", premiumRequired: true },
      { status: 403 }
    );
  }
  // ... existing projection logic
}
```

### Step 2.7 — Gate Portfolio Page Features
**File:** `src/app/dashboard/portfolio/page.tsx` (modify)

1. Import: `import { PremiumGateModal } from "@/components/gamification/PremiumGateModal";`
2. Add state: `const [premiumGate, setPremiumGate] = useState<{ featureName: string } | null>(null);`
3. On "Monte Carlo Projection" click → check `isPremiumActive()` from `src/lib/premium.ts`. If false, `setPremiumGate({ featureName: "Monte Carlo Projection" })`
4. Render: `{premiumGate && <PremiumGateModal featureName={premiumGate.featureName} onClose={() => setPremiumGate(null)} />}`

### Step 2.8 — VIP Sidebar Badge (Hydration-Safe, XP-Aware)
**File:** `src/app/dashboard/layout.tsx`

> **C-1 fix (G-5):** Badge must call `hasPremium(currentXp, promoCode)` — not `isPremiumActive()`. `isPremiumActive()` only checks localStorage subscription state; it misses XP-rank-based premium (LEGEND users) and promo-code users. `useUserGamification()` provides `currentXp`.

Add imports:
```tsx
import { useUserGamification } from "@/lib/supabase/useUserData";
import { hasPremium } from "@/lib/rbac";
```

Add hook call (before the component return):
```tsx
const gamification = useUserGamification();
const currentXp = gamification?.xp ?? 0;
```

VIP badge JSX:
```tsx
// ─── VIP Badge — hydration-safe ──────────────────────────
// hasPremium() checks: (a) subscription active, (b) XP rank ≥ LEGEND, (c) promo code
// Wrapped in mounted guard to avoid SSR/hydration mismatch.
const [premiumMounted, setPremiumMounted] = useState(false);
useEffect(() => { setPremiumMounted(true); }, []);

{premiumMounted && hasPremium(currentXp) && (
  <div className="mx-4 mb-2 px-3 py-2 bg-gradient-to-r from-[#E6B84F]/20 to-[#FF6B35]/10 border border-[#E6B84F]/30 rounded-xl flex items-center gap-2">
    <span className="text-sm">👑</span>
    <span className="text-xs font-bold text-[#E6B84F]">Vẹt Vàng VIP</span>
  </div>
)}
```

> **Hydration safety fix (Architect Violation 1):** `hasPremium()` reads localStorage (for subscription) and evaluates XP rank synchronously. SSR always renders `false`; client hydration may differ if localStorage has an active subscription or XP ≥ 2000. The `mounted` guard prevents the flash.

### Step 2.9 — Supabase Premium Sync on App Load
**File:** `src/app/dashboard/layout.tsx` (modify — in root layout or a provider)

```typescript
// Sync premium state from server on app load (resolves CRITICAL-2 split-brain)
useEffect(() => {
  async function sync() {
    try {
      const res = await fetch("/api/premium");
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          // Cookie is set by API route; localStorage already updated by subscribePremium
          // Just verify consistency
          await syncPremiumFromSupabase();
        }
      }
    } catch {
      // Network error — use localStorage fallback (graceful degradation)
    }
  }
  sync();
}, []);
```

---

## 6. Phase 3 — Gold & Unit Trust (Days 9–11)

### Step 3.1 — Gold Partner Catalog + Staleness
**File:** `src/lib/affiliate/gold-partners.ts` (NEW)

```typescript
export interface GoldVendor {
  id: string;
  name: string;
  type: "sjc" | "brand";
  affiliateUrl: string;
  commissionRate: number;
  note: string;
  utm: string;
}

export const GOLD_VENDORS: GoldVendor[] = [
  {
    id: "sjc-official",
    name: "SJC Gold (Điểm bán chính hãng)",
    type: "sjc",
    affiliateUrl: "https://sjc.com.vn/mua-vang",
    commissionRate: 0.005,
    note: "Cam kết thu mua lại — phù hợp mua vàng tích trữ dài hạn",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=sjc",
  },
  {
    id: "doji-gold",
    name: "DOJI Gold & Jewellery",
    type: "brand",
    affiliateUrl: "https://doji.vn/mua-vang",
    commissionRate: 0.008,
    note: "Thanh khoản nhanh, nhiều chi nhánh HCM & HN",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=doji",
  },
  {
    id: "pnj-gold",
    name: "PNJ — Vàng 24K",
    type: "brand",
    affiliateUrl: "https://pnj.com.vn/vang-24k",
    commissionRate: 0.006,
    note: "Thương hiệu niêm yết — minh bạch giá",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=pnj",
  },
];

export interface UnitTrustProduct {
  id: string;
  fundName: string;
  fundCode: string;
  fundHouse: string;
  category: "equity" | "bond" | "balanced" | "money_market";
  nav: number;
  ytdReturn: number;
  return1yr: number;
  return3yr: number;
  aumFee: number;
  minBuyAmount: number;
  affiliateUrl: string;
  commissionRate: number;
  updatedAt: string; // ISO 8601 — CRITICAL-4 fix
}

/**
 * Returns true if the fund data is older than `hrs` hours.
 * Used to render a "Dữ liệu có thể cũ" warning badge.
 */
export function isStale(product: UnitTrustProduct, hrs = 24): boolean {
  const ageMs = Date.now() - new Date(product.updatedAt).getTime();
  return ageMs > hrs * 60 * 60 * 1000;
}

export const UNIT_TRUST_PRODUCTS: UnitTrustProduct[] = [
  {
    id: "vndf-equity",
    fundName: "Quỹ Đầu Tư Cổ Phiếu Việt Nam (VNDF)",
    fundCode: "VNDF-Equity",
    fundHouse: "Dragon Capital",
    category: "equity",
    nav: 38_500,
    ytdReturn: 8.2,
    return1yr: 18.5,
    return3yr: 32.1,
    aumFee: 0.015,
    minBuyAmount: 10_000_000,
    affiliateUrl: "https://partner.vietfi.io/vndf?src=vietfi",
    commissionRate: 0.01,
    updatedAt: "2026-04-09T00:00:00.000Z", // CRITICAL-4 fix
  },
  {
    id: "vcbf-growth",
    fundName: "VCBF Equity Fund",
    fundCode: "VCBF-GROWTH",
    fundHouse: "VCB Capital",
    category: "equity",
    nav: 124_000,
    ytdReturn: 6.1,
    return1yr: 14.2,
    return3yr: 28.7,
    aumFee: 0.018,
    minBuyAmount: 5_000_000,
    affiliateUrl: "https://partner.vietfi.io/vcbf?src=vietfi",
    commissionRate: 0.012,
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
  {
    id: "ssg-bond",
    fundName: "Quỹ Trái Phiếu SSG",
    fundCode: "SSG-Bond",
    fundHouse: "SSG Capital",
    category: "bond",
    nav: 12_800,
    ytdReturn: 3.1,
    return1yr: 6.8,
    return3yr: 18.4,
    aumFee: 0.008,
    minBuyAmount: 5_000_000,
    affiliateUrl: "https://partner.vietfi.io/ssg-bond?src=vietfi",
    commissionRate: 0.008,
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
];

export function buildGoldAffiliateUrl(vendor: GoldVendor): string {
  const separator = vendor.affiliateUrl.includes("?") ? "&" : "?";
  return `${vendor.affiliateUrl}${separator}${vendor.utm}`;
}
```

> **CRITICAL-4 fix:** Every `UnitTrustProduct` now has `updatedAt: string (ISO)`. `isStale()` is exported and used in the UI to render a staleness badge when data is >24h old.

### Step 3.2 — GoldTracker CTA Enhancement
**File:** `src/components/portfolio/GoldTracker.tsx`

Add to imports:
```typescript
import { GOLD_VENDORS, buildGoldAffiliateUrl } from "@/lib/affiliate/gold-partners";
import { trackEvent } from "@/lib/affiliate/analytics";
```

Add state and UI after the purchase list:
```tsx
{/* ─── Affiliate CTA ─── */}
<div className="mt-4 pt-4 border-t border-[#E6B84F]/10">
  <p className="text-[11px] text-white/30 mb-3 text-center">Mua vàng chính hãng — hoàn tiền qua VietFi</p>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    {GOLD_VENDORS.map((vendor) => (
      <a
        key={vendor.id}
        href={buildGoldAffiliateUrl(vendor)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent({ type: "affiliate_link_click", payload: { vendorId: vendor.id, source: "gold" } })}
        className="flex items-center gap-2 px-3 py-2.5 bg-[#E6B84F]/5 hover:bg-[#E6B84F]/10 border border-[#E6B84F]/15 hover:border-[#E6B84F]/30 rounded-xl transition-all text-xs group"
      >
        <span className="text-base">🏆</span>
        <div>
          <div className="font-semibold text-[#E6B84F] group-hover:text-[#FFD700] transition-colors leading-tight">{vendor.name}</div>
          <div className="text-[10px] text-white/40 mt-0.5">{vendor.note}</div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[#E6B84F]/40 group-hover:text-[#E6B84F] ml-auto transition-colors" />
      </a>
    ))}
  </div>
  {/* HIGH-1: Affiliate disclosure */}
  <p className="text-[9px] text-white/20 mt-3 text-center">
    Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên.
  </p>
</div>
```

Add `ArrowRight` to lucide-react import list.

### Step 3.3 — Unit Trust Panel in Portfolio
**File:** `src/app/dashboard/portfolio/page.tsx` (modify)

Add after `GoldTracker` component render:
```tsx
{/* ─── Unit Trust Recommendations ─── */}
<div className="glass-card p-5 border border-[#22C55E]/10">
  <div className="flex items-center gap-2 mb-4">
    <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
      <BarChart2 className="w-4 h-4 text-[#22C55E]" />
    </div>
    <h3 className="text-sm font-semibold text-white">Quỹ Đầu Tư — Danh Mục VietFi</h3>
    <span className="text-[9px] bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded font-mono uppercase">Affiliate</span>
  </div>
  <div className="space-y-3">
    {UNIT_TRUST_PRODUCTS.map((fund) => {
      const stale = isStale(fund);
      return (
        <a
          key={fund.id}
          href={fund.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent({ type: "affiliate_link_click", payload: { vendorId: fund.id, source: "unit_trust" } })}
          className="block p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#22C55E]/20 rounded-xl transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-[13px] text-white leading-tight flex items-center gap-2">
                {fund.fundName}
                {stale && (
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                    Cũ
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{fund.fundHouse} · {fund.fundCode}</div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">{CATEGORY_LABELS[fund.category]}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">NAV: {new Intl.NumberFormat("vi-VN").format(fund.nav)}đ</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">Phí quản lý: {(fund.aumFee*100).toFixed(1)}%/năm</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-[14px] font-bold ${fund.return1yr >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                {fund.return1yr >= 0 ? "+" : ""}{fund.return1yr}%
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">1 năm</div>
              <div className="text-[10px] text-[#22C55E]/60 mt-1">3yr: +{fund.return3yr}%</div>
            </div>
          </div>
        </a>
      );
    })}
  </div>
  {/* HIGH-1: Affiliate disclosure */}
  <p className="text-[10px] text-white/20 mt-3 text-center">
    Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên.
  </p>
</div>
```

Add to imports: `BarChart2` from lucide-react, `UNIT_TRUST_PRODUCTS, isStale, type UnitTrustProduct` from `@/lib/affiliate/gold-partners`.

Add helper at top of component:
```typescript
const CATEGORY_LABELS: Record<string, string> = {
  equity: "Cổ phiếu",
  bond: "Trái phiếu",
  balanced: "Cân bằng",
  money_market: "Thị trường tiền tệ",
};
```

---

## 7. File Map

```
src/
├── app/
│   ├── dashboard/
│   │   ├── debt/page.tsx                   [MODIFY — wire modal + trigger]
│   │   ├── portfolio/page.tsx               [MODIFY — premium gate + unit trust panel]
│   │   └── layout.tsx                       [MODIFY — VIP badge (mounted guard) + sync]
│   └── api/
│       ├── premium/route.ts                 [NEW — standard runtime, cookie-based]
│       ├── portfolio/backtest/route.ts      [MODIFY — verifyPremium() gate]
│       └── portfolio/projection/route.ts    [MODIFY — verifyPremium() gate >5yr]
├── components/
│   ├── affiliate/
│   │   └── LoanAffiliateModal.tsx          [NEW]
│   └── gamification/
│       └── PremiumGateModal.tsx             [NEW]
└── lib/
    ├── affiliate/
    │   ├── products.ts                      [NEW]
    │   ├── gold-partners.ts                 [NEW — + isStale(), updatedAt]
    │   └── analytics.ts                     [NEW — AnalyticsEvent types + trackEvent]
    ├── premium-auth.ts                      [NEW — PremiumAuth + verifyPremium()]
    ├── premium.ts                           [NEW — getPremiumState/subscribe/cancel]
    ├── rbac.ts                              [MODIFY — hasPremium() from env, PREMIUM role]
    └── storage.ts                           [MODIFY — add premium keys]
.env.example                                [MODIFY — add promo codes + MOCK_AUTH_ENABLED]
```

---

## 8. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Affiliate DOM selectors on partner pages break | Medium | Low | All affiliate links are direct URLs — no scraping |
| R2 | Crawler/selector changes in GoldTracker break gold price display | Medium | Low | 3-level fallback (goldBrands → goldSjc → goldUsd) |
| R3 | Mock premium auth spoofed in production | High | High | `MOCK_AUTH_ENABLED=false` in `.env.example`; env-check in `verifyPremium()` |
| R4 | Promo code exposed in git history | Medium | High | `NEXT_PUBLIC_VIETFI_PROMO_CODES` env var — zero source exposure |
| R5 | Affiliate modal fires too aggressively | Medium | Medium | 24h dismiss + `debts.length > 0` guard + always dismissible |
| R6 | `sessionStorage` resets on tab close — plan-viewed flag lost | Low | Low | **Intentional** (ADR-001 Consequences — MEDIUM-2). SessionStorage resets on tab close; users who re-open a new tab see the modal once more. Correct UX — don't relabel. |
| R7 | `/api/premium` standard runtime breaks Edge-first assumption | Medium | Medium | Standard runtime only for premium routes; market/news crawlers stay Edge |
| R8 | localStorage premium state deleted by "Clear Data" | Low | Low | Cookie-based sync in `verifyPremium()` provides secondary fallback |
| R9 | Unit trust fund data goes stale | Medium | Medium | `isStale()` renders warning badge; mock data timestamped at daily granularity |
| R10 | Vietnam fintech regulations for affiliate distribution | Low | High | Mock partner URLs; legal review required before real affiliate agreements |
| R11 | F1 pre-mortem signal unmeasurable | High | High | `AnalyticsEvent` typed schema + `trackEvent()` in place before Phase 1 ships |
| R12 | VIP badge hydration mismatch flashes | Medium | Medium | `useState`/`useEffect` mounted guard on badge — always use guard pattern |

---

## 9. Verification Steps

### Phase 0 Verification
1. `MOCK_AUTH_ENABLED=false` by default in `.env.example` — verify
2. `NEXT_PUBLIC_VIETFI_PROMO_CODES` present in `.env.example`
3. `src/app/api/premium/route.ts` has no `export const runtime = 'edge'`
4. `src/lib/premium-auth.ts` exports `verifyPremium` and `PremiumAuth`
5. `src/lib/affiliate/analytics.ts` exports `AnalyticsEvent` union and `trackEvent()`
6. `src/lib/rbac.ts` — `hasPremium()` does NOT contain any hardcoded strings

### Phase 1 Verification
1. Navigate to `/dashboard/debt` with no debts → modal should NOT appear
2. Add a debt (any amount) → modal should appear within 2s
3. With debt added, set income to 3M VND via localStorage → modal appears with "Vay Tái Tài Chính" tab
4. Switch to **"Bảo Hiểm"** tab → 3 insurance cards visible
5. Click any "Đăng ký ngay" → new tab opens with correct `utm_source=vietfi`
6. Check affiliate disclosure text present in modal footer
7. Click X → reload → modal does NOT reappear within 24h
8. DevTools → Application → localStorage → `vietfi_analytics_queue` shows `affiliate_modal_shown` event
9. `npm run lint` → zero errors

### Phase 2 Verification
1. `GET /api/premium` before subscribing → `{ active: false }`
2. `POST /api/premium { promoCode: "HUNGPIXI" }` → `{ active: true, tier: "Vẹt Vàng VIP" }`
3. `GET /api/premium` → response sets `vietfi_premium=active` cookie
4. `GET /api/portfolio/backtest` without premium → 403 `{ premiumRequired: true }`
5. `GET /api/portfolio/backtest` with `X-Premium-Key: vip-mock-key` and `MOCK_AUTH_ENABLED=true` → 200
6. **`GET /api/portfolio/backtest` with `X-User-XP: 2500` (LEGEND)** → 200 — 3yr backtest granted to XP rank 3 users — **T-1 fix**
7. `GET /api/portfolio/backtest` with `X-User-XP: 500` (non-LEGEND) → 403 — **T-1 fix**
8. `GET /api/portfolio/projection?years=10` → 403 (≤5yr allowed, >5yr gated)
9. `/dashboard/portfolio` → "Monte Carlo" → `PremiumGateModal` appears
10. "Nâng cấp ngay" → premium activates → VIP badge appears in sidebar
11. VIP badge does NOT flash/mismatch on hydration (check SSR vs client)
12. `npm test` → `hasPremium()` coverage: XP 299/300/999/1000/1999/2000/5000 + promo combos + PREMIUM role — **T-2 coverage target**
13. `npm run test:run -- --coverage` → `premium-auth.ts ≥90%`, `premium.ts ≥90%`, `rbac.ts hasPremium ≥90%` — **T-2 fix**

### Phase 3 Verification
1. `/dashboard/portfolio` → GoldTracker renders 3 gold CTA buttons with disclosure footer
2. Each gold CTA href includes `utm_source=vietfi&utm_medium=gold_affiliate`
3. Unit trust panel renders 3 fund cards; each shows staleness badge if `isStale()` returns true
4. All affiliate `<a>` tags have `rel="noopener noreferrer"`
5. Unit trust affiliate disclosure footer visible
6. `npm run build` → zero TypeScript errors
7. `npm test` → all existing tests pass; `isStale()` edge cases covered
8. `npm run test:e2e` → portfolio page loads without crash

---

## 10. RALPLAN-DR Summary

### 3–5 Governing Principles

1. **Scripted-First Monetization:** Every affiliate dollar earned without an AI API call is superior — prioritize zero-cost revenue (Phase 1) before spending on premium infra.
2. **No Payment Infrastructure Before Product-Market Fit:** Mock Stripe in Phase 2; real payment integration only after ≥5% of active users convert to paid.
3. **Premium Gating Must Not Degrade Free Tier:** 3yr backtest free for LEGEND; only Monte Carlo and >5yr projections are PREMIUM-gated. Non-payers never feel hard-blocked.
4. **Unified Auth, No Split-Brain:** Single `verifyPremium()` function gates all API routes. Cookie-based sync prevents localStorage/Edge conflicts that silently break subscriptions in production.
5. **Affiliate Is UI + Disclosure, Not Logic:** Affiliate components are pure presentational wrappers. Business logic lives in typed `AnalyticsEvent` + `trackEvent()`. Full affiliate disclosure on every CTA (HIGH-1 / Circular 46/2021/TT-NHNN).

### Top 4 Decision Drivers

| Driver | Rationale |
|---|---|
| **D1: DTI trigger = < 35%** | Architect synthesis: `dtiRatio >= 35` targets users already in danger; `< 35% AND debts.length > 0` targets users managing debt responsibly — the correct affiliate window |
| **D2: Standard Runtime for premium routes** | Edge Runtime cannot access localStorage. Cookie-based auth + standard runtime is the minimal change that resolves CRITICAL-1 without redesigning all routes |
| **D3: LEGEND = 3yr backtest; PREMIUM = >5yr + Monte Carlo** | ADR-002 revision: preserves XP progression. LEGEND users earned their rank — they get meaningful premium features. Only Monte Carlo and long-horizon projections remain exclusive |
| **D4: Promo codes from env, not source** | HUNGPIXI in git history is permanent. Env vars can be rotated without code changes. `MOCK_AUTH_ENABLED=false` prevents accidental production exposure |

### Viable Options Considered

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| **A: Phase 1 = Premium tier first** | Build subscription flow before affiliate | Recurring revenue | No conversion data; likely low conversion without proven value | **Rejected — no PMF** |
| **B: Edge Runtime for all API routes** | Keep Edge everywhere, use cookies for premium | Consistent runtime | Cannot read localStorage for initial premium check; complex cookie dance | **Rejected — localStorage needed for guest subscribe** |
| **C: Phase 1 = Loan affiliate (CHOSEN)** | Refinance modal for DTI < 35% + debts > 0 | High intent, zero infra, architect-aligned | Commission delayed 30–90 days | **Selected** |
| **D: Promo code hardcoded** | `HUNGPIXI: true` in rbac.ts | Simple | Git history exposure; cannot rotate without code deploy | **Rejected — env var required** |
| **E: No Phase 0, fix auth in Phase 2** | Skip premium auth architecture, fix when it breaks | Faster Phase 1 | Silent failure in production on Vercel Edge; logged-in users gated despite active subscription | **Rejected — architect synthesis** |

### Pre-Mortem — 3 Failure Scenarios

| # | Scenario | Earliest Signal | Prevention |
|---|---|---|---|
| **F1** | Phase 1 modal confuses users → they leave debt page | Drop-off in debt page session duration >20% — measurable via `affiliate_modal_shown` timestamp vs `affiliate_cta_click` delta in analytics queue | A/B test "subtle banner" vs modal; keep dismiss easy; `debts.length > 0` guard prevents showing to debt-free users |
| **F2** | Premium gate bypassed via `X-Premium-Key: vip-mock-key` spoofing in production | Revenue $0 but user complaints of paying; `MOCK_AUTH_ENABLED` still `true` in production | `MOCK_AUTH_ENABLED=false` by default; gate check fails open to `active: false` if env var is absent; remove mock header before Phase 3 |
| **F3** | Gold affiliate links degrade (partner page down) | Support tickets spike; measurable via `gold_affiliate_click` event count dropping to 0 | Fallback: show "đối tác tạm thời không khả dụng" message; remove broken CTA from `GOLD_VENDORS` array |

> **Analytics dependency note:** F1 is only measurable because `AnalyticsEvent` schema and `trackEvent()` are implemented in Phase 0 before Phase 1 ships. Without typed events, the analytics queue is unreadable noise.

---

## 11. ADR

### ADR-001: Trigger Condition for Loan Affiliate Modal (v2 — CRITICAL-6 fix)

**Decision:** Show modal when:
- `(dtiRatio < 35 AND debts.length > 0)` — users managing debt responsibly
- **OR** `(sessionStorage plan-viewed AND debts.length > 0)` — users actively planning payoff

Both sub-conditions require `debts.length > 0`. Dismiss: 24h via `vietfi_affiliate_dismissed_until`.

**Drivers:**
- Architect synthesis: `dtiRatio >= 35` targets users already in dangerous territory; `< 35%` targets users in the refinancing window who are managing debt (the correct affiliate moment)
- Vietnam consumer credit flags DTI ≥ 40% as high-risk; 35% is the safety buffer
- `debts.length > 0` on both triggers prevents modal appearing for debt-free users
- Snowball/Avalanche plan view signals peak refinancing intent regardless of DTI

**Alternatives Considered:**
- *Trigger on DTI ≥ 35% only:* Targets users already in danger — Vet Vang's brand is anti-debt, creating perception conflict. Rejected.
- *Trigger on every debt page visit:* UX harassment → bounce.
- *No 24h dismiss timer:* Lose retargeting opportunity permanently.

**Consequences:**
- `sessionStorage` intentionally resets on tab close — modal can re-trigger on new tab if plan was viewed. **This is intentional (MEDIUM-2):** Each new session is a fresh opportunity; we only want to suppress within-session repetition.
- DTI < 35% users with no debts are excluded — correct.

**Follow-ups:**
- `affiliate_modal_shown { dtiBucket }` event enables A/B testing threshold variants
- After 2 weeks, adjust threshold to maximize click-through on "Đăng ký ngay" CTA

---

### ADR-002: Premium Tier Rank in Role Hierarchy (v2 — 3yr backtest for LEGEND)

**Decision:** `PREMIUM` has rank **4** (above `LEGEND` rank 3). LEGEND users (rank 3) access 3yr backtest. PREMIUM (rank 4) unlocks Monte Carlo + >5yr projections. `getRoleFromXP()` does NOT return PREMIUM — must be set via `subscribePremium()`.

**Drivers:**
- Preserve XP-based progression: LEGEND users earned rank via activity — meaningful premium features are their reward
- Subscribe adds on top: premium is additive, not a replacement
- `hasPremium(currentXp, promoCode)` checks role rank + promo code + PREMIUM flag simultaneously

**Alternatives Considered:**
- *PREMIUM replaces XP role:* Downgrades active LEGEND users → immediate backlash
- *Separate `isPremium` boolean not in role enum:* Scattered logic; harder to gate consistently

**Consequences:**
- `getRoleFromXP()` alone will NOT reflect premium status → always check `hasPremium()`
- Supabase `is_premium: boolean` column needed in Phase 3 follow-up
- **`SECURITY_NOTE` — httpOnly: false cookie (Phase 2 compromise):** The `vietfi_premium` cookie is set with `httpOnly: false` so client JS and `verifyPremium()` can read it. This is an **acceptable Phase 2 compromise** for the mock subscription. The risk: any XSS vulnerability on any VietFi page can set `vietfi_premium=active` for that user's browser, granting unauthorized access to gated features.
  - **Phase 3 remediation:** Migrate to `httpOnly: true` + `sameSite: "strict"` + server-side session store (Supabase KV or Redis). Remove `httpOnly: false` once a proper session token system is in place.

**Follow-ups:**
- Add `is_premium` column to `profiles` table (Phase 3 migration)
- Update `src/lib/supabase/user-data.ts` to sync premium state with Supabase on subscribe/cancel

---

### ADR-003: Gold Distribution Channel Architecture (unchanged)

**Decision:** Gold CTA opens partner's direct URL with UTM parameters. No in-app purchase, no escrow, no order management. Commission tracked via UTM analytics only.

**Drivers:**
- VietFi is a PFM app, not a gold exchange — regulatory risk of acting as financial intermediary
- Zero operational overhead (no inventory, no custody, no KYC)
- UTM-based attribution is sufficient for affiliate commission reconciliation

**Consequences:**
- Commission tracking is imprecise (UTM only, not postback) → accept for Phase 3
- `isStale()` helper renders warning when NAV data >24h old
- All gold and unit trust CTAs display affiliate disclosure per Circular 46/2021/TT-NHNN

**Follow-ups:**
- Negotiate postback URL with SJC/DOJI/PNJ affiliate managers
- Add server-side postback when affiliate volume justifies integration cost

---

## Appendix F — Changelog

### v1.0 → v2.0 (2026-04-09)

| ID | Category | Change |
|---|---|---|
| **CRITICAL-1** | Architecture | `/api/premium/route.ts` changed from implicit Edge to **explicit standard (non-Edge) Runtime**. Added `export const dynamic = "force-dynamic"`. |
| **CRITICAL-2** | Auth | Added `src/lib/premium-auth.ts` with `PremiumAuth` interface and `verifyPremium(req)` as the **unified gate function** for all API routes. Client syncs via `syncPremiumFromSupabase()` on app load. Cookie-based fallback when localStorage is unavailable. |
| **CRITICAL-3** | Security | `HUNGPIXI` removed from `rbac.ts` source. Now read from `NEXT_PUBLIC_VIETFI_PROMO_CODES` env var. Added to `.env.example`. |
| **CRITICAL-4** | Data | `UnitTrustProduct` interface now includes `updatedAt: string (ISO)`. Exported `isStale(product, hrs?)` helper. Staleness badge rendered in unit trust panel. |
| **CRITICAL-5** | Badge | VIP sidebar badge now calls `hasPremium(currentXp, promoCode)` (which includes LEGEND rank + env promo codes). Previously used `isPremiumActive()` which only checked localStorage. Promo-code users now correctly see badge. |
| **CRITICAL-6** | Trigger | Step 1.3 trigger condition corrected to `(dtiRatio < 35 AND debts.length > 0) OR (viewedPlan AND debts.length > 0)`. ADR-001 updated to reflect this. Previously `dtiRatio >= 35` without the debts guard on plan-viewed trigger. |
| **HIGH-1** | Compliance | Added "Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên." disclosure footer to `LoanAffiliateModal`, `GoldTracker` gold CTA section, and unit trust panel. Required by Circular 46/2021/TT-NHNN. |
| **HIGH-2** | Analytics | Added `src/lib/affiliate/analytics.ts` with typed `AnalyticsEvent` union (`affiliate_modal_shown`, `affiliate_cta_click`, `affiliate_link_click`, `premium_subscribe`, `premium_cancel`, `premium_gate_shown`) and `trackEvent()` helper. F1 pre-mortem signal now measurable. |
| **HIGH-3** | Testing | Expanded test plan added to Section 9 verification steps. Minimum 80% coverage target added to Phase 2, Phase 3 verification. |
| **MEDIUM-2** | Documentation | ADR-001 Consequences now documents that `sessionStorage` intentionally resets on tab close — this is correct UX behavior, not a bug. |
| **MEDIUM-4** | Naming | AC-Phase2-8 corrected: client-side storage function is `getPremiumStateLS()` (not `getPremiumState()`). |
| **MEDIUM-5** | Security | `MOCK_AUTH_ENABLED=false` added to `.env.example`. `verifyPremium()` explicitly checks `process.env.MOCK_AUTH_ENABLED === "true"` before accepting `X-Premium-Key` header. |
| **Architect Synthesis** | Architecture | Phase 0 added as mandatory pre-Phase-1 day. Phase 0 implements: (1) standard runtime premium route, (2) `PremiumAuth` + `verifyPremium()`, (3) env-var promo codes, (4) analytics schema, (5) affiliate disclosure. ~1 day prevents breaking change in Phase 3. |
| **ADR-002 revision** | Feature | LEGEND users (rank 3) now get 3yr backtest free. Only Monte Carlo and >5yr projections are PREMIUM-only. ADR-002 updated accordingly. |
| **Hydration fix** | Safety | VIP sidebar badge wrapped in `useState(false)` + `useEffect(() => setMounted(true), [])` guard to prevent SSR/hydration mismatch. |
| **LEGEND → 3yr backtest** | Feature | Per Architect Tension B resolution: 3yr backtest accessible to LEGEND; gate only >5yr + Monte Carlo behind PREMIUM. |

### v2.0 → v2.1 (2026-04-09)

| ID | Category | Change |
|---|---|---|
| **C-1** | Phase 0 scaffolding | Added Phase 0 Step 0.5: `PREMIUM` enum (rank 4), exported `getRoleRank(role)`, and `hasPremium(currentXp, promoCode?)` — all required before Step 2.1 can compile. Previously these were only in Step 2.1 (Phase 2), creating a dependency gap. |
| **C-1 (G-5)** | VIP badge | Step 2.8 VIP badge now calls `hasPremium(currentXp)` — imports `useUserGamification()` to get `currentXp`. Previously called `isPremiumActive()` which missed XP-rank-based and promo-code premium users. |
| **C-2** | Cookie cleanup | `cancelPremium()` now calls `fetch("/api/premium", {method:"DELETE"})` **before** removing localStorage. Previously the server-set `vietfi_premium` cookie survived cancellation and browser restart, causing `active: true` to persist on reload. |
| **C-3** | Security | ADR-002 Consequences now includes `SECURITY_NOTE`: `httpOnly: false` is a Phase 2 compromise (XSS can set cookie); Phase 3 must migrate to `httpOnly: true` + Supabase/Redis session store. |
| **H-1** | Coding style | Removed `console.log("[analytics]", JSON.stringify(entry))` from `trackEvent()`. localStorage queue is sufficient. |
| **T-1** | Testing | Phase 2 verification steps 6–7 added: LEGEND user (`X-User-XP: 2500`) gets 200 on backtest; non-LEGEND (`X-User-XP: 500`) gets 403. AC Phase 2 updated with LEGEND backtest AC. |
| **T-2** | Testing | AC Phase 2 updated: `premium-auth.ts ≥90%`, `premium.ts ≥90%`, `rbac.ts hasPremium ≥90%`. Phase 2 verification step 13 added: `npm run test:run -- --coverage` named coverage targets. |
| **T-3** | Testing | Added Phase 0 Step 0.6: test stubs for `premium-auth.test.ts`, `premium.test.ts`, `analytics.test.ts`. AC Phase 0 updated to include stub existence check. |
| **Step 2.1 refactor** | Architecture | Step 2.1 converted from code-implementation step to verification checklist. All code additions now live in Phase 0 Step 0.5, making Phase 2 a compile-and-verify step only. |
| **ADR-002 SECURITY_NOTE** | Security | Added `SECURITY_NOTE` block documenting XSS risk from `httpOnly: false` cookie and Phase 3 remediation path. |

# VietFi Advisor -- Monetization Plan: Architecture Review

**Reviewer:** Architect Agent  **Date:** 2026-04-09  **Plan Version:** 1.0

---

## Executive Summary

The plan is well-structured with strong ADR coverage and correct Phase 1-2-3 sequencing.
Three fault lines must be resolved before implementation: (1) dual-premium-source conflict
between localStorage and Supabase, (2) hydration-unsafe VIP badge pattern, and
(3) affiliate trust transfer contradicting the app PFM positioning.

---

## 1. Strongest Steelman Counterargument (Antithesis)

**Phase 1 (Loan Affiliate) is favored -- but for the wrong reason.**
The plan argues Phase 1 wins on high intent, zero infra, proven Vietnam model.
This is true but incomplete. The strongest counterargument:

**Affiliate revenue from financial products in a PFM app creates a fiduciary
perception problem that poisons user trust at the precise moment the app is
trying to build it.**

A PFM app core value: I help you understand and control your money.
A loan affiliate modal core value: I get paid when you borrow more money.
These are structurally opposed. VietFi debt page already has a DTIDominoGauge
screaming GET OUT OF DEBT NOW -- then the affiliate modal whispers
borrow again. The Vet Vang mascot entire brand is anti-debt roasting.

**Reframe:** Trigger on DTI less than 35 percent AND debts.length greater than 0 --
users who have debts but are managing them, not users already in trouble.
---

## 2. Tradeoff Tensions

### Tension A: localStorage vs. Supabase -- Dual-Premium-Source Problem

Phase 2 writes to localStorage["vietfi_premium"]; API routes check X-Premium-Key
header only. A logged-in user who subscribed on their phone will be gated on their
laptop. The /api/premium route reads localStorage -- always returns active:false on
Edge. These two systems will diverge.

**Resolution:** Create getPremiumAuth() returning source: local|supabase, active: boolean.
API routes call shared verifyPremium(req) checking header then Supabase JWT.

### Tension B: Gating Portfolio Features Erodes the Free Tier

ADR-002 places PREMIUM at rank 4 (above LEGEND). A LEGEND user (2,000+ XP)
discovers their hard-won rank does NOT unlock the 3-year backtest.
This contradicts the plan own stated principle of preserving XP progression.

**Resolution:** Make 3-year backtest accessible to LEGEND (rank 3).
Gate only greater than 5yr projection and Monte Carlo behind PREMIUM.

---

## 3. Synthesis Path

### Unified Premium Auth Architecture
- Client: getPremiumState() reads localStorage cache;
  syncPremiumFromSupabase() called on app load
- API routes: verifyPremium(req) checks X-Premium-Key header (Phase 2 mock)
  then Supabase JWT (Phase 3)

### Trigger Reframing
- Change Phase 1 modal trigger from dtiRatio >= 35
  to dtiRatio less than 35 AND debts.length greater than 0
---

## 4. Principle Violations

### Violation 1: Hydration Safety -- VIP Sidebar Badge

Phase 2, Step 2.9 renders: {isPremiumActive() and VIPBadge} -- localStorage
is read synchronously during render. Server returns false; on hydration the badge
may flash in if active:true. Hydration mismatch risk.

Fix: Wrap in a mounted guard using useState(false) + useEffect(() => setMounted(true), []).

### Violation 2: Mutation in debt-optimizer.ts

Line 114: debt.balance = debt.balance + interest - payment -- direct mutation
of a cloned object. Violates the no-mutation convention.
Fix: Replace direct mutation with an immutable map over the remaining array.

### Violation 3: any Type in GoldTracker.tsx

Line 9: marketData: any -- pre-existing TypeScript violation.
Should be a typed MarketData interface.

### Violation 4: new Date() in JSX

No hydration violations in the plan new code. CSV download uses new Date() inside
an event handler, not JSX -- acceptable.
---

## 5. Missing Architectural Concerns

### Concern 1: Affiliate Disclosure Missing -- Regulatory Risk

Circular 46/2021/TT-NHNN and draft Vietnam fintech decree require disclosure of
commercial affiliation. All affiliate CTAs need: "Lien ket tai chinh.
VietFi nhan phi gioi thieu tu cac doi tac tren." Absent from the plan.

### Concern 2: /api/premium Breaks on Edge Runtime

Phase 2, Step 2.4: GET /api/premium calls getPremiumState() -- localStorage access.
Edge workers have no localStorage. typeof window === undefined always returns true on
the server, so the route always returns active:false in production on Vercel Hobby.

The plan specifies Edge Runtime for all API routes but writes a route requiring
server-side storage -- a direct contradiction. Will silently pass CI and fail in prod.

Fix: Make /api/premium a standard Node.js Route Handler, or use a cookie-based flow.

### Concern 3: No Analytics Event Schema

Plan mentions logging affiliate_cta_click and premium_subscribe but no typed event
schema. Define src/lib/analytics/events.ts before Phase 1 ships.

### Concern 4: Promo Code HUNGPIXI in Source Code

Phase 2, Step 2.1 shows HUNGPIXI in plaintext in a committed code block.
Git history retains it permanently regardless of later env-var migration.

Fix: Use NEXT_PUBLIC_VIETFI_PROMO_CODES env var now. Add to .env.example immediately.

### Concern 5: Unit Trust Mock Data Has No Staleness Indicator

UNIT_TRUST_PRODUCTS has no updatedAt timestamp. A stale NAV is worse than no data.

Fix: Add updatedAt: string (ISO) to UnitTrustProduct and an isStale() helper.
---

## 6. Additional Observations

Positive: ADR-003 (Gold CTA via direct URL with UTM) is architecturally correct.
Positive: 24h dismiss pattern (vietfi_affiliate_dismissed_until via Date.now()) is well-designed.
Positive: Separation of affiliate UI from business logic is respected throughout.
Concerning: sessionStorage for viewed-plan flag -- modal re-appears in new tabs.
Should be documented in the ADR.
Concerning: Zero unit test coverage for premium.ts, products.ts, gold-partners.ts.
Codebase convention requires 80 percent coverage.

---

## 7. Summary Assessment

| Dimension                  | Status                                        |
|---|---|
| Phase sequencing logic    | Strong                                        |
| Affiliate trigger logic   | Needs reframing                               |
| Premium auth architecture  | Incomplete -- localStorage/Edge contradiction |
| Hydration safety          | Plan code safe; pre-existing any in GoldTracker|
| Immutability              | Pre-existing mutation debt-optimizer.ts:114     |
| Regulatory compliance     | Missing affiliate disclosure                  |
| Analytics schema          | No typed event schema                          |
| Secret management         | HUNGPIXI in source; env var deferred too late  |
| Test coverage             | Zero unit tests for new files                  |

---

## Key Findings (5 Bullets)

- **Premium auth has a structural split-brain**: API routes read X-Premium-Key header;
  client reads localStorage. A logged-in user gated in API despite active Supabase row.
  Unify behind verifyPremium(req) before Phase 2.

- **/api/premium is broken on Edge Runtime**: localStorage access always returns default
  state on Edge workers. Route must be Node.js or use cookie-based approach.

- **Affiliate modal targets the wrong users**: DTI >= 35 triggers for users already in
  dangerous debt. Flip to DTI less than 35 AND debts.length greater than 0.

- **Promo code HUNGPIXI in plaintext source is a security leak**: Must use
  NEXT_PUBLIC_VIETFI_PROMO_CODES env var at implementation time.

- **Missing affiliate disclosure is a regulatory liability**: All affiliate CTAs need
  "VietFi nhan phi gioi thieu tu cac doi tac" footer before Phase 1 ships.

## Strongest Concern

**The /api/premium Edge Runtime contradiction** -- it silently passes CI/local testing
(Edge not enforced locally) and fails in production on Vercel Hobby. A logged-in user
who subscribes gets active:false from GET /api/premium and 403 from gated APIs.
Broken subscription flow that surfaces as user complaints, not build errors.
Must be resolved before Phase 2 begins.

## Synthesis Recommendation

**Do not implement Phase 2 until the premium auth architecture is re-resolved.**
Add a Phase 2a stub:

1. Move /api/premium to a standard (non-Edge) Route Handler
2. Add PremiumAuth interface in src/lib/premium.ts with source: local|supabase, active: boolean
3. Gate API routes on shared verifyPremium(req) -- checks X-Premium-Key header then Supabase JWT
4. Add affiliate disclosure text to all affiliate UI before Phase 1 ships

This adds approximately 1 day of architecture work but prevents a breaking change
in Phase 3 when Supabase sync is added.

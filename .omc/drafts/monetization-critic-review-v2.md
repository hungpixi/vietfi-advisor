# VietFi Advisor — Monetization Plan v2.0: Critic Review (Round 3)

**Reviewer:** Critic Agent
**Date:** 2026-04-09
**Plan Version:** 2.0
**Status:** REVISE

---

## Executive Summary

The plan advances on v1.0 but fails to close 4 architect-identified issues. Two unchanged from prior round (cookie cleanup console.log). Two partially addressed (Phase 0 scaffolding split across Phase 2 missing ADR security note). A new test-plan gap also surfaces.

---

## 1. Architect Issue Resolution Status

### CRITICAL-5: Phase 0 scaffolding — PARTIALLY ADDRESSED

The architect identified 5 Phase 0 gaps (G-1 through G-5). Verified against source:


CRITICAL-5 status summary:
- G-1/G-2/G-3: NOT in source rbac.ts. Step 2.1 has them but Phase 0 creates no scaffolding for these.
- G-4: CONFIRMED. GamificationState has xp: number in source.
- G-5: NOT in source. layout.tsx has no useUserGamification import; badge uses isPremiumActive not hasPremium.

Root cause: G-1/G-2/G-3 in Step 2.1 (Phase 2), not Phase 0. Step 2.1 cannot compile without G-1/G-2/G-3 first. Changelog claims CRITICAL-5 fixed but Step 2.8 badge still uses isPremiumActive.

Required fix: Add Phase 0 step 0.5 with G-1/G-2/G-3/G-5 explicit additions. G-4 already done.

---

### CRITICAL-1 extension: Cookie cleanup on cancel — UNCHANGED

cancelPremium() only calls localStorage.removeItem(PREMIUM_KEY). DELETE handler sets maxAge:0 correctly. But plan never specifies cancelPremium() must call DELETE /api/premium. User sees active:true on next reload because browser sends stale vietfi_premium=active cookie.

Required fix: cancelPremium() must call fetch("/api/premium",{method:"DELETE"}) before removing localStorage.

---

### CRITICAL-3/4/6: ADDRESSED

Confirmed: HUNGPIXI removed env var approach correct staleness data present trigger condition correct per ADR-001 v2.

---

### httpOnly: false — ADR-002 SECURITY_NOTE MISSING

Architect requested SECURITY_NOTE in ADR-002 documenting Phase 2 httpOnly:false and Phase 3 migration path. Note does not appear in ADR-002.

Required fix: Add to ADR-002: SECURITY_NOTE describing XSS risk from httpOnly:false and Phase 3 migration to httpOnly:true plus server-side session (Supabase KV or Redis).

---

### Violation 1: console.log in trackEvent() — UNCHANGED

Step 0.4 line 314: console.log("[analytics]",JSON.stringify(entry)) remains. Architect flagged this. Changelog does not mention.

Required fix: Remove line 314.

---

## 2. Test Plan Gaps

### Gap T-1: No LEGEND-tier backtest test case

ADR-002 v2 grants LEGEND (rank 3) 3yr backtest access. Neither AC nor verification steps test this path.

Required fix: Add to Phase 2 verification step 5:
5a. LEGEND user (X-User-XP: 2500) calls GET /api/portfolio/backtest -> 200 (3yr allowed)
5b. Non-LEGEND user (XP=500) calls GET /api/portfolio/backtest -> 403

### Gap T-2: No explicit coverage targets

80%+ mentioned but no files named. premium-auth.ts (4 paths) and premium.ts (expiry default error) need 90%+ target.

Required fix: Add to Phase 2 AC: premium-auth.ts >=90% premium.ts >=90% rbac.ts hasPremium >=90%.

### Gap T-3: No unit test stubs for Phase 0 pure-logic files

Phase 0 creates premium-auth.ts premium.ts analytics.ts all pure logic with no test stubs.

Required fix: Add Phase 0 step 0.6: premium-auth.test.ts premium.test.ts analytics.test.ts stubs.

---

## 3. Principle-Option Consistency

Scripted-First Monetization: Upheld. No Mutation: Upheld. No console.log: VIOLATED (trackEvent line 314 unchanged). Immutable data: Upheld.

---

## 4. ADR Completeness

ADR-001 v2: Complete. ADR-002 v2: Incomplete (missing SECURITY_NOTE). ADR-003: Complete.

---

## 5. Pre-Mortem Quality

F1: session duration delta >20%. Kill: feature flag disable modal.
F2: MOCK_AUTH_ENABLED=true in production. Kill: MOCK_AUTH_ENABLED=false default env var check.
F3: gold_affiliate_click drops to 0. Kill: remove broken vendor from GOLD_VENDORS.

F1 only measurable because analytics ships in Phase 0 before Phase 1.

---

## 6. Verification Steps Assessment

Phase 0: 6 steps complete. Phase 1: 9 steps complete. Phase 2: 10 steps missing LEGEND backtest T-1. Phase 3: 8 steps complete.

---

## 7. Summary of Required Changes

CRITICAL G-1/G-2/G-3 to Phase 0 step 0.5 | CRITICAL wire useUserGamification xp hasPremium Step 2.8 | CRITICAL cookie cleanup cancelPremium | HIGH remove console.log | HIGH add SECURITY_NOTE ADR-002 | MEDIUM LEGEND backtest | MEDIUM coverage targets | MEDIUM test stubs phase 0

---

## Verdict: REVISE

All 6 original CRITICALs addressed at design level. Architecture sound. Two architect issues unchanged (cookie cleanup console.log). Two partially addressed (Phase 0 scaffolding missing ADR security note).

8 changes needed: 3 CRITICALs 2 HIGHs 3 MEDIUMs. Minimum viable for approval: CRITICAL3 + HIGH2 = 5 changes. MEDIUMs are quality improvements add before Phase 0 begins.

# VietFi Advisor — Monetization Plan v2.0: Architecture Review

**Reviewer:** Architect Agent
**Date:** 2026-04-09
**Plan Version:** 2.0
**Status:** **REVISE**

---

## Executive Summary

The v2.0 plan is a substantial improvement over v1.0. All 6 CRITICALs are addressed at the design level. However, 3 of those fixes introduce new implementation risks that surface immediately on first compilation. Additionally, 1 new tradeoff tension and 2 remaining principle violations require resolution before approval.

**Core verdict:** Fixes are directionally correct but implementation scaffolding for CRITICAL-5 is missing from both the codebase and the plan. CRITICAL-1 cookie cleanup has a subtle edge case. CRITICAL-5 hasPremium() signature introduces a known-codebase gap. These must be closed before approval.
---

## 1. CRITICAL Fix Status

### CRITICAL-1: Edge Runtime + localStorage for /api/premium — Addressed with 1 New Issue

/api/premium is now a standard (non-Edge) Route Handler with export const dynamic = "force-dynamic". Cookie-based fallback for verifyPremium() is the correct pattern.

**New issue — Cookie cleanup gap on cancel:**

cancelPremium() only removes the localStorage key — it does NOT clear the server-set cookie. On next page load: browser sends stale vietfi_premium=active cookie, GET /api/premium returns active: true. Cancellation was localStorage-only; cookie survives browser restart.

**Fix:** Have cancelPremium() call DELETE /api/premium, OR use js-cookie Cookies.remove() client-side, OR change DELETE handler to set maxAge: 0.

**Severity:** Medium — silent cancellation bug.

---

### CRITICAL-2: Premium split-brain — unified verifyPremium(req) — Addressed

verifyPremium() is a well-designed unified gate. Cookie resolution order (mock header, XP header, cookie, Supabase stub) is correct.

---

### CRITICAL-3: HUNGPIXI hardcoded — Addressed

NEXT_PUBLIC_VIETFI_PROMO_CODES env var approach is correct. Acceptable for Phase 2 client and server use.

---

### CRITICAL-4: No updatedAt in unit trust data — Addressed

updatedAt: string (ISO) and isStale(product, hrs?) are present. Staleness badge renders correctly. Solid.

---

### CRITICAL-5: VIP badge uses wrong function — hasPremium() — Addressed with 2 New Implementation Gaps

Fix is directionally correct. VIP badge now calls hasPremium(currentXp, promoCode).

**Gap 1 — Missing functions in rbac.ts (verified against source):**

Existing src/lib/rbac.ts has: no PREMIUM in UserRole enum, no getRoleRank() function (only internal ROLE_RANKS, not exported), no hasPremium() function, no promo code logic.

The plan proposes all of these but:

(a) **getRoleRank() does not exist.** The plan calls it in verifyPremium() line 151 and hasPremium() line 593, but existing rbac.ts only has internal ROLE_RANKS. Either export getRoleRank() or replace calls with direct ROLE_RANKS[role] >= ROLE_RANKS[UserRole.LEGEND]. Plan must pick one.

(b) **hasPremium(currentXp, promoCode) requires XP from somewhere.** VIP badge calls hasPremium(currentXp, promoCode) but currentXp is not available in the sidebar layout. The existing useUserGamification hook in src/lib/supabase/useUserData.ts (verified) returns GamificationState | null — the current type does NOT include an xp field. Without plumbing, currentXp is always 0 in the badge and LEGEND users will NOT see the badge.

**Severity:** CRITICAL — LEGEND users silently excluded from VIP badge.

**Fix:** Extend GamificationState with xp: number; call useUserGamification() in layout.tsx passing currentXp.

---

### CRITICAL-6: Trigger condition — Addressed

(dtiRatio < 35 AND debts.length > 0) OR (viewedPlan AND debts.length > 0). ADR-001 v2 is consistent.
---

## 2. New Architectural Issues

### Issue A: Circular dependency risk (Low-Medium)

premium-auth.ts imports from @/lib/rbac (line 172). If rbac.ts later imports back from premium-auth.ts (Phase 3 Supabase sync), circular dependency forms. No back-reference yet — monitor in Phase 3.

### Issue B: getRoleRank() undefined (Medium)

verifyPremium() calls getRoleRank(UserRole.LEGEND) — a function that does not exist in the codebase and is never defined in the plan. Must be added to Phase 0 step 0.1.

---

## 3. New Tradeoff Tension

### Tension C: httpOnly: false cookie vs. security posture

vietfi_premium cookie set with httpOnly: false so client JS and verifyPremium() can read it. This enables XSS attacks to set vietfi_premium=active.

Real fix: httpOnly: true + server-side session store (Supabase/KV) — significant infra for mock Phase 2.

**Acceptable for Phase 2** with explicit SECURITY_NOTE in ADR-002: httpOnly: false is a Phase 2 compromise. Phase 3 must migrate to httpOnly: true + Supabase session.

---

## 4. Remaining Principle Violations

### Violation 1: console.log in trackEvent() — NEW (Low severity)

trackEvent() calls console.log("[analytics]", JSON.stringify(entry)). Codebase coding style requires removing console.log from production code. localStorage queue is sufficient — remove console.log.

### Violation 2: Mutation in debt-optimizer.ts — Pre-existing (out of scope)

### Violation 3: any in GoldTracker.tsx — Pre-existing (out of scope)
---

## 5. Phase 0 Gaps (Must Be Added)

| Gap | File | Required Addition |
|-----|------|-----------------|
| G-1 | src/lib/rbac.ts | Export getRoleRank(role: UserRole): number |
| G-2 | src/lib/rbac.ts | Add PREMIUM to UserRole enum and ROLE_RANKS |
| G-3 | src/lib/rbac.ts | Add hasPremium(currentXp, promoCode?) |
| G-4 | src/lib/gamification.ts | Ensure GamificationState includes xp: number |
| G-5 | src/app/dashboard/layout.tsx | Call useUserGamification(); pass xp to VIP badge |

Without G-4/G-5: hasPremium(currentXp=0) never checks XP rank; LEGEND users silently excluded.

---

## 6. Summary Assessment

| Dimension | Status | Notes |
|---|---|---|
| CRITICAL-1 (Edge Runtime) | Fixed — 1 gap | Cookie cleanup missing on cancel |
| CRITICAL-2 (Split-brain) | Fixed | verifyPremium() is sound |
| CRITICAL-3 (HUNGPIXI hardcoded) | Fixed | Env var approach correct |
| CRITICAL-4 (Staleness) | Fixed | isStale() solid |
| CRITICAL-5 (Wrong badge function) | Fixed — 2 gaps | getRoleRank() missing + no currentXp plumbing |
| CRITICAL-6 (Trigger condition) | Fixed | ADR-001 v2 consistent |
| httpOnly: false cookie | Accepted risk | Document; remediate Phase 3 |
| console.log in analytics | Low | Remove from trackEvent() |
| Circular dependency risk | Monitored | No back-ref yet |
| Pre-existing: debt-optimizer mutation | Deferred | Out of scope |
| Pre-existing: GoldTracker any | Deferred | Out of scope |
| Phase 0 completeness | Incomplete | 5 scaffolding gaps |
---

## 7. Key Findings (5 Bullets)

- **CRITICAL-5 fix has missing implementation scaffolding:** rbac.ts (verified) has no PREMIUM role, no getRoleRank(), and no hasPremium(). LEGEND users silently excluded from VIP badge — add useUserGamification() + GamificationState.xp to Phase 0.

- **Cookie cleanup gap on cancel:** cancelPremium() removes localStorage but vietfi_premium cookie survives browser restart. User who cancels sees active: true on next reload. Must call DELETE /api/premium from cancel flow.

- **httpOnly: false cookie is a Phase 2 security compromise:** Acceptable for mock subscription but must be documented and remediated in Phase 3. Add SECURITY_NOTE to ADR-002.

- **console.log in trackEvent() violates coding style:** Remove console.log from analytics helper. localStorage queue is sufficient for Phase 1-2.

- **All 6 CRITICALs are directionally fixed:** Plan Phase 0 + 1-3 structure is sound. Remaining issues are implementation scaffolding gaps, not design errors.

---

## 8. Verdict

**REVISE**

The plan is substantially sound. All 6 CRITICALs addressed at design level. But CRITICAL-5 cannot compile without Phase 0 scaffolding (G-1 through G-5). CRITICAL-1 cookie cleanup gap creates a silent cancellation bug.

**Minimum required before approval:**
1. Phase 0 step 0.5: G-1 through G-5 — export getRoleRank(), add PREMIUM enum, add hasPremium(), GamificationState.xp, plumb xp to VIP badge
2. Fix cookie cleanup: cancelPremium() calls DELETE /api/premium OR Cookies.remove()
3. Remove console.log from trackEvent()
4. Add SECURITY_NOTE to ADR-002: httpOnly: false is Phase 2 compromise

With these additions, the plan is approvable.
/* ═══════════════════════════════════════════════════════════
 * Premium Auth — unified verification for all gated routes.
 * Resolves CRITICAL-1 (Edge/localStorage split-brain) and
 * CRITICAL-2 (client/API state split-brain).
 * ═══════════════════════════════════════════════════════════ */

import { getRoleFromXP, getRoleRank, UserRole } from "@/lib/rbac";

/* ─── Types ─────────────────────────────────────────────── */
export type PremiumSource = "local" | "supabase" | "xp";

export interface PremiumAuth {
  source: PremiumSource;
  active: boolean;
  tier?: "Vẹt Vàng VIP";
  expiresAt?: string | null;
}

/* ─── Cookie helper ─────────────────────────────────── */
function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1].trim()) : null;
}

/* ─── Unified verification ────────────────────────────── */
/**
 * Single source of truth for all gated API routes and client-side premium checks.
 *
 * Resolution order:
 *  1. X-Premium-Key header (Phase 2 mock — only if MOCK_AUTH_ENABLED=true)
 *  2. XP-based (LEGEND+ rank → premium)
 *  3. vietfi_premium cookie (client-initiated subscription)
 *  4. Supabase session (Phase 3 stub)
 */
export async function verifyPremium(req: Request): Promise<PremiumAuth> {
  // 1. Mock header check (Phase 2 only — NEVER true in production)
  if (process.env.MOCK_AUTH_ENABLED === "true") {
    const key = req.headers.get("X-Premium-Key");
    if (key === "vip-mock-key") {
      return { source: "local", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
    }
  }

  // 2. XP-based premium (LEGEND rank ≥ 3)
  const xpHeader = req.headers.get("X-User-XP");
  if (xpHeader) {
    const xp = parseInt(xpHeader, 10);
    if (!isNaN(xp) && getRoleRank(getRoleFromXP(xp)) >= getRoleRank(UserRole.LEGEND)) {
      return { source: "xp", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
    }
  }

  // 3. Subscription cookie (set by /api/premium on subscribe)
  const cookieHeader = req.headers.get("cookie") || "";
  if (parseCookie(cookieHeader, "vietfi_premium") === "active") {
    return { source: "local", active: true, tier: "Vẹt Vàng VIP", expiresAt: null };
  }

  // 4. Supabase session — Phase 3 stub
  // TODO(Phase 3): Verify Supabase JWT, check is_premium in profiles table
  return { source: "local", active: false };
}

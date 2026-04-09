export enum UserRole {
  MEMBER = "MEMBER",  // 0 - 299 XP
  PRO = "PRO",        // 300 - 999 XP
  MASTER = "MASTER", // 1000 - 1999 XP
  LEGEND = "LEGEND", // 2000+ XP
  PREMIUM = "PREMIUM", // subscription-based — rank 4, above LEGEND
}

const ROLE_RANKS: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.PRO]: 1,
  [UserRole.MASTER]: 2,
  [UserRole.LEGEND]: 3,
  [UserRole.PREMIUM]: 4,
};

export function getRoleRank(role: UserRole): number {
  return ROLE_RANKS[role] ?? 0;
}

export function getRoleFromXP(xp: number): UserRole {
  if (xp >= 2000) return UserRole.LEGEND;
  if (xp >= 1000) return UserRole.MASTER;
  if (xp >= 300) return UserRole.PRO;
  return UserRole.MEMBER;
}

export function hasRole(currentXp: number, requiredRole: UserRole): boolean {
  const currentRole = getRoleFromXP(currentXp);
  return ROLE_RANKS[currentRole] >= ROLE_RANKS[requiredRole];
}

export const ROLE_THRESHOLDS = {
  [UserRole.MEMBER]: 0,
  [UserRole.PRO]: 300,
  [UserRole.MASTER]: 1000,
  [UserRole.LEGEND]: 2000,
  [UserRole.PREMIUM]: 0,  // subscription — not XP-gated
};

export const ROLE_DESCRIPTIONS = {
  [UserRole.MEMBER]: "Học viên Vẹt",
  [UserRole.PRO]: "Nhà đầu tư nghiêm túc",
  [UserRole.MASTER]: "Chuyên gia lướt sóng",
  [UserRole.LEGEND]: "Huyền thoại VietFi",
  [UserRole.PREMIUM]: "Vẹt Vàng VIP",
};

/* ─── Premium check ──────────────────────────────────────── */
/**
 * Unifies XP rank + subscription role + promo codes for UI premium gates.
 * For API routes use verifyPremium(req) from premium-auth.ts instead.
 */
export function hasPremium(currentXp: number, promoCode?: string): boolean {
  const role = getRoleFromXP(currentXp);
  // Subscription role (set via /api/premium POST)
  if (role === UserRole.PREMIUM) return true;
  // LEGEND+ XP rank
  if (getRoleRank(role) >= getRoleRank(UserRole.LEGEND)) return true;
  // Promo code from env var (never hardcoded)
  if (promoCode) {
    const codes = (process.env.NEXT_PUBLIC_VIETFI_PROMO_CODES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (codes.includes(promoCode.toUpperCase())) return true;
  }
  return false;
}

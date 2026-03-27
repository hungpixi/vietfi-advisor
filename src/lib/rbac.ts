export enum UserRole {
  MEMBER = "MEMBER", // 0 - 299 XP
  PRO = "PRO",       // 300 - 999 XP
  MASTER = "MASTER", // 1000 - 1999 XP
  LEGEND = "LEGEND", // 2000+ XP
}

const ROLE_RANKS: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.PRO]: 1,
  [UserRole.MASTER]: 2,
  [UserRole.LEGEND]: 3,
};

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
};

export const ROLE_DESCRIPTIONS = {
  [UserRole.MEMBER]: "Học viên Vẹt",
  [UserRole.PRO]: "Nhà đầu tư nghiêm túc",
  [UserRole.MASTER]: "Chuyên gia lướt sóng",
  [UserRole.LEGEND]: "Huyền thoại VietFi",
};

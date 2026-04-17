/**
 * @deprecated Use `@/lib/domain/gamification/rules` directly for new code.
 * Re-export barrel maintained for backward compatibility.
 *
 * RBAC logic (Role-Based Access Control) is now part of the gamification domain.
 */
export {
  UserRole,
  getRoleFromXP,
  hasRole,
  ROLE_THRESHOLDS,
  ROLE_DESCRIPTIONS,
} from "./domain/gamification/rules";

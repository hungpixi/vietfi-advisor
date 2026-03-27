import { CreditCard, Smartphone, UserX, Home, ShieldAlert, Banknote } from "lucide-react";
import { Debt } from "@/lib/calculations/debt-optimizer";

export interface UIDebt extends Debt {
  icon: string;
  color: string;
}

export const ICON_MAP: Record<string, any> = {
  credit_card: CreditCard,
  bnpl: Smartphone,
  personal: UserX,
  mortgage: Home,
  loan_shark: ShieldAlert,
  other: Banknote,
};

export const COLOR_OPTIONS = ["#EF4444", "#AB47BC", "#00E5FF", "#22C55E", "#FF6B35", "#E6B84F"];

export function formatVND(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

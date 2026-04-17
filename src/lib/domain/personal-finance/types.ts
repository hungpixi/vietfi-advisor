/**
 * Personal Finance Domain Types
 *
 * Core types shared across the personal finance bounded context.
 * NOTE: BudgetPot/Expense here are the LEGACY localStorage schemas (emoji-based).
 * The Supabase-synced BudgetPot/Expense schemas live in @/lib/supabase/user-data.ts
 * and @/lib/types/budget.ts (iconKey-based).
 *
 * DebtItem and GoldPurchase REMOVED from domain:
 * - DebtItem: Supabase schema is in supabase/user-data.ts; UI schema is UIDebt
 * - GoldPurchase: defined and owned by infrastructure/persistence/storage.ts
 * No framework, no I/O.
 */

export interface RiskProfile {
    score: number;
    label: string;
    description: string;
}

export interface BudgetPot {
    id: string;
    name: string;
    iconKey: string;
    allocated: number;
    color: string;
    sort_order?: number;
}

export interface Expense {
    id: string;
    pot_id?: string | null;
    potId?: string;
    amount: number;
    note?: string;
    date: string;
    category?: string;
    created_at?: string;
}

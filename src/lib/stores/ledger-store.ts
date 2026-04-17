"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getLedgerEntries, setLedgerEntries, LedgerEntry } from "@/lib/storage";

export type Period = "today" | "month";

/* ─── State shape ─── */

interface UiState {
  inputOpen: boolean;
  period: Period;
  loading: boolean;
  error: string | null;
}

interface LedgerState {
  transactions: LedgerEntry[];
  ui: UiState;
  undoQueue: Array<{ action: "add" | "delete"; entry: LedgerEntry }>;
}

/* ─── Helpers ─── */

/**
 * Format a raw VND amount as a display string like "150.000đ"
 */
export function formatVND(amount: number): string {
  const formatted = new Intl.NumberFormat("vi-VN").format(Math.round(amount));
  return `${formatted}đ`;
}

/**
 * Parse a VND input string like "150.000" or "150,000" → 150000
 */
export function parseVNDInput(text: string): number {
  const cleaned = text
    .replace(/\s+/g, "")
    .replace(/đ$/, "")
    .replace(/\.(?=\d{3})/g, "")   // remove thousand separators (.)
    .replace(/,(?=\d{3})/g, "")   // remove thousand separators (,)
    .trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Custom hook store (no zustand) ─── */

export function useLedgerStore() {
  const [state, setState] = useState<LedgerState>({
    transactions: [],
    ui: {
      inputOpen: false,
      period: "month",
      loading: true,
      error: null,
    },
    undoQueue: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const entries = getLedgerEntries();
        setState((prev) => ({
          ...prev,
          transactions: entries,
          ui: { ...prev.ui, loading: false },
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          ui: { ...prev.ui, loading: false, error: "Kh?ng t?i ???c d? li?u" },
        }));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Persist to localStorage whenever transactions change
  const persist = useCallback((transactions: LedgerEntry[]) => {
    setLedgerEntries(transactions);
  }, []);

  /* ─── Actions ─── */

  const loadFromStorage = useCallback(() => {
    setState((prev) => ({ ...prev, ui: { ...prev.ui, loading: true } }));
    try {
      const entries = getLedgerEntries();
      setState((prev) => ({
        ...prev,
        transactions: entries,
        ui: { ...prev.ui, loading: false, error: null },
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        ui: { ...prev.ui, loading: false, error: "Không tải được dữ liệu" },
      }));
    }
  }, []);

  const addTransaction = useCallback(
    (data: Omit<LedgerEntry, "id" | "createdAt">) => {
      const entry: LedgerEntry = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        const next = [...prev.transactions, entry];
        persist(next);
        return {
          ...prev,
          transactions: next,
          undoQueue: [
            ...prev.undoQueue.slice(-9), // keep last 10
            { action: "add", entry },
          ],
        };
      });
    },
    [persist]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setState((prev) => {
        const removed = prev.transactions.find((t) => t.id === id);
        if (!removed) return prev;
        const next = prev.transactions.filter((t) => t.id !== id);
        persist(next);
        return {
          ...prev,
          transactions: next,
          undoQueue: [
            ...prev.undoQueue.slice(-9),
            { action: "delete", entry: removed },
          ],
        };
      });
    },
    [persist]
  );

  const undoLast = useCallback(() => {
    setState((prev) => {
      if (prev.undoQueue.length === 0) return prev;
      const last = prev.undoQueue[prev.undoQueue.length - 1];
      let next: LedgerEntry[];

      if (last.action === "add") {
        next = prev.transactions.filter((t) => t.id !== last.entry.id);
      } else {
        next = [...prev.transactions, last.entry];
      }

      persist(next);
      return {
        ...prev,
        transactions: next,
        undoQueue: prev.undoQueue.slice(0, -1),
      };
    });
  }, [persist]);

  const setPeriod = useCallback((period: Period) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, period },
    }));
  }, []);

  const setInputOpen = useCallback((inputOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, inputOpen },
    }));
  }, []);

  return {
    ...state,
    addTransaction,
    deleteTransaction,
    undoLast,
    setPeriod,
    setInputOpen,
    loadFromStorage,
  };
}

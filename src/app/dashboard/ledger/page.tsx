'use client';
import { useState, useEffect } from 'react';
import { useLedgerStore } from '@/lib/stores/ledger-store';
import { computeLedgerSummary } from '@/lib/calculations/ledger-summary';
import SummaryBar from './components/SummaryBar';
import PeriodToggle from './components/PeriodToggle';
import InputCard from './components/InputCard';
import TransactionList from './components/TransactionList';
import FAB from './components/FAB';
import UndoToast from './components/UndoToast';

export default function LedgerPage() {
  const [mounted, setMounted] = useState(false);
  const {
    transactions,
    ui,
    loadFromStorage,
    addTransaction,
    deleteTransaction,
    undoLast,
    setPeriod,
    setInputOpen,
    undoQueue,
  } = useLedgerStore();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      loadFromStorage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFromStorage]);

  const summary = computeLedgerSummary(transactions, ui.period);
  const undoItem = undoQueue[0] ?? null;

  return mounted ? (
    <div className="min-h-screen pb-24 space-y-3 px-4 pt-4">
      <PeriodToggle period={ui.period} onChange={setPeriod} />
      <SummaryBar summary={summary} period={ui.period} />
      <InputCard
        onAdd={addTransaction}
        isOpen={ui.inputOpen}
        onToggle={() => setInputOpen(!ui.inputOpen)}
      />
      <TransactionList
        transactions={transactions}
        onDelete={deleteTransaction}
        onAddFirst={() => setInputOpen(true)}
      />
      <FAB onClick={() => setInputOpen(true)} />
      <UndoToast
        visible={!!undoItem}
        item={undoItem}
        onUndo={undoLast}
        onDismiss={() => {}}
      />
    </div>
  ) : (
    <div className="min-h-screen bg-[--color-bg]" />
  );
}

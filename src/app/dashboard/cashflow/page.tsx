"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BudgetPage from "@/app/dashboard/budget/page";
import LedgerPage from "@/app/dashboard/ledger/page";
import { Wallet, BookOpen } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "budget", label: "Ngân sách", icon: Wallet },
  { id: "ledger", label: "Giao dịch", icon: BookOpen },
] as const;
type TabId = (typeof TABS)[number]["id"];

function CashflowContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "budget";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <div className="min-h-screen">
      <div className="mb-8 border-b border-white/[0.06] pb-6">
        <h1 className="font-heading text-[28px] md:text-[36px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)]">
          Dòng tiền
        </h1>
        <p className="mt-2 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
          Theo dõi thu chi &amp; quản lý ngân sách theo hũ
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl w-fit mb-8 shadow-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[11px] font-mono font-black uppercase tracking-wider transition-all duration-300 overflow-hidden group ${isActive
                ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "budget" && <BudgetPage key="budget" />}
            {activeTab === "ledger" && <LedgerPage key="ledger" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CashflowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="text-2xl mb-2">🦜</div>
          <p className="text-sm text-white/40">Đang tải...</p>
        </div>
      </div>
    }>
      <CashflowContent />
    </Suspense>
  );
}

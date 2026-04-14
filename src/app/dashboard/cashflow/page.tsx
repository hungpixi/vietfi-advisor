"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BudgetPage from "@/app/dashboard/budget/page";
import LedgerPage from "@/app/dashboard/ledger/page";
import { Wallet, BookOpen } from "lucide-react";
import { useState } from "react";

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
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">Dòng tiền</h1>
        <p className="text-[13px] text-white/40">Theo dõi thu chi &amp; quản lý ngân sách theo hũ</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl w-fit mb-6 border border-white/[0.06]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#E6B84F]/15 text-[#E6B84F] border border-[#E6B84F]/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "budget" && <BudgetPage key="budget" />}
      {activeTab === "ledger" && <LedgerPage key="ledger" />}
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

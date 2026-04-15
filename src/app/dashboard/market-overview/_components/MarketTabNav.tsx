import type { MarketTab } from "@/lib/market-overview/types";

const tabs: Array<{ key: MarketTab; label: string }> = [
    { key: "tam-ly", label: "Tâm lý" },
    { key: "tai-san", label: "Tài sản" },
    { key: "vi-mo", label: "Vĩ mô" },
];

export function MarketTabNav({ activeTab, onChange }: { activeTab: MarketTab; onChange: (tab: MarketTab) => void }) {
    return (
        <div role="tablist" aria-label="Tổng quan thị trường" className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => onChange(tab.key)}
                    className={activeTab === tab.key ? "rounded-full bg-[#E6B84F] px-4 py-2 text-sm font-semibold text-[#111318]" : "rounded-full border border-white/10 px-4 py-2 text-sm text-white/60"}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

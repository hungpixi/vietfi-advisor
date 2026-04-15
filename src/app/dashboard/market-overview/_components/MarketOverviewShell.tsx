"use client";

import { useEffect, useState } from "react";
import { addXP } from "@/lib/gamification";
import { useMarketOverview } from "@/lib/market-overview/useMarketOverview";
import type { MarketTab } from "@/lib/market-overview/types";
import { MarketHero } from "./MarketHero";
import { MarketTabNav } from "./MarketTabNav";
import { MarketErrorState, MarketLoadingState } from "./MarketStateBlock";
import { SentimentTab } from "./SentimentTab";
import { AssetsTab } from "./AssetsTab";
import { MacroTab } from "./MacroTab";

export function MarketOverviewShell({ initialTab }: { initialTab: MarketTab }) {
    const [activeTab, setActiveTab] = useState<MarketTab>(initialTab);
    const state = useMarketOverview();

    useEffect(() => {
        addXP("check_market");
    }, []);

    if (state.status === "loading") return <MarketLoadingState />;
    if (state.status === "error") return <MarketErrorState message={state.error} />;

    const tabContent = activeTab === "tam-ly"
        ? <SentimentTab score={state.data.sentiment.score as number} drivers={state.data.sentiment.drivers as any} assetSentiments={state.data.sentiment.assetSentiments as any} />
        : activeTab === "tai-san"
            ? <AssetsTab cards={state.data.assets.cards as any} personalizedAlert={state.data.assets.personalizedAlert as any} />
            : <MacroTab cards={state.data.macro.cards as any} commentary={state.data.macro.commentary as any} trendSummary={state.data.macro.trendSummary as any} />;

    return (
        <div>
            <MarketHero lastUpdated={state.data.lastUpdated as string | null} stale={state.data.stale as boolean} narrative={state.data.macro.commentary as string | null} />
            <MarketTabNav activeTab={activeTab} onChange={setActiveTab} />
            <div className="mt-6">{tabContent}</div>
        </div>
    );
}

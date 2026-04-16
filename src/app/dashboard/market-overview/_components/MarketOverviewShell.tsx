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

    const { data } = state;

    const tabContent = activeTab === "tam-ly"
        ? <SentimentTab score={data.sentiment.score} drivers={data.sentiment.drivers} assetSentiments={data.sentiment.assetSentiments} />
        : activeTab === "tai-san"
            ? <AssetsTab cards={data.assets.cards} personalizedAlert={data.assets.personalizedAlert} />
            : <MacroTab cards={data.macro.cards} commentary={data.macro.commentary} trendSummary={data.macro.trendSummary} />;

    return (
        <div>
            <MarketHero lastUpdated={data.lastUpdated} stale={data.stale} narrative={data.macro.commentary} />
            <MarketTabNav activeTab={activeTab} onChange={setActiveTab} />
            <div className="mt-6">{tabContent}</div>
        </div>
    );
}

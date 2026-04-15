import { MarketOverviewShell } from "./_components/MarketOverviewShell";
import type { MarketTab } from "@/lib/market-overview/types";

function normalizeTab(value: string | string[] | undefined): MarketTab {
    const tab = Array.isArray(value) ? value[0] : value;
    if (tab === "tai-san" || tab === "vi-mo") return tab;
    return "tam-ly";
}

export default function MarketOverviewPage({
    searchParams,
}: {
    searchParams?: { tab?: string | string[] };
}) {
    return <MarketOverviewShell initialTab={normalizeTab(searchParams?.tab)} />;
}

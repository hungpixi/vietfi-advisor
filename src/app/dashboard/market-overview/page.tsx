import { MarketOverviewShell } from "./_components/MarketOverviewShell";
import type { MarketTab } from "@/lib/market-overview/types";

function normalizeTab(value: string | string[] | undefined): MarketTab {
    const tab = Array.isArray(value) ? value[0] : value;
    if (tab === "tai-san" || tab === "vi-mo") return tab;
    return "tam-ly";
}

export default async function MarketOverviewPage(props: {
    searchParams?: Promise<{ tab?: string | string[] }>;
}) {
    const searchParams = await props.searchParams;
    return <MarketOverviewShell initialTab={normalizeTab(searchParams?.tab)} />;
}

import { getZone } from "@/lib/market-overview/formatters";

export function SentimentTab({
    score,
    drivers,
    assetSentiments,
}: {
    score: number;
    drivers: Array<{ label: string; value: number; tone: "fear" | "neutral" | "greed" }>;
    assetSentiments: Array<{ asset: string; score: number; trend: "up" | "down" | "neutral"; news: string }>;
}) {
    const zone = getZone(score);

    return (
        <div className="space-y-6">
            <section className="glass-card p-5">
                <p className="text-[11px] uppercase tracking-widest text-white/30">Nhiệt độ thị trường hôm nay</p>
                <div className="mt-3 flex items-end gap-3">
                    <span className="text-5xl font-black text-white">{score}</span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: zone.color, backgroundColor: `${zone.color}18` }}>
                        {zone.label}
                    </span>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-5">
                {drivers.map((driver) => (
                    <div key={driver.label} className="glass-card p-4">
                        <p className="text-[11px] text-white/40">{driver.label}</p>
                        <p className="mt-2 text-xl font-bold text-white">{driver.value}</p>
                    </div>
                ))}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                {assetSentiments.map((asset) => (
                    <div key={asset.asset} className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">{asset.asset}</p>
                            <span className="text-xs text-white/40">{asset.score}/100</span>
                        </div>
                        <p className="mt-2 text-[12px] text-white/50">{asset.news}</p>
                    </div>
                ))}
            </section>
        </div>
    );
}

import { getZone } from "@/lib/market-overview/formatters";
import type { AssetMoodCard, SentimentDriver } from "@/lib/market-overview/types";

export function SentimentTab({
    score,
    drivers,
    assetSentiments,
}: {
    score: number;
    drivers: SentimentDriver[];
    assetSentiments: AssetMoodCard[];
}) {
    const zone = getZone(score);
    const fallbackAssetSentiments: AssetMoodCard[] = [
        {
            asset: "Chứng khoán",
            score,
            trend: score >= 55 ? "up" : score <= 40 ? "down" : "neutral",
            news: "Dòng tin đang nghiêng về phòng thủ, nhưng vẫn còn cửa hồi nếu thanh khoản và độ rộng cải thiện.",
        },
        {
            asset: "Vàng",
            score: Math.max(0, Math.min(100, Math.round(100 - score / 2))),
            trend: score >= 55 ? "up" : "neutral",
            news: "Vàng giữ vai trò lớp phòng thủ khi khẩu vị rủi ro trên thị trường giảm nhiệt.",
        },
        {
            asset: "Vĩ mô",
            score: Math.max(0, Math.min(100, Math.round(50 + (score - 50) / 2))),
            trend: score >= 55 ? "up" : "neutral",
            news: "Lãi suất, tỷ giá và dòng tiền vẫn là 3 biến số quyết định nhịp thị trường ngắn hạn.",
        },
    ];

    const mergedAssetSentiments = [...assetSentiments];
    for (const fallback of fallbackAssetSentiments) {
        if (mergedAssetSentiments.length >= 3) break;
        if (!mergedAssetSentiments.some((item) => item.asset === fallback.asset)) {
            mergedAssetSentiments.push(fallback);
        }
    }

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
                {mergedAssetSentiments.map((asset) => (
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

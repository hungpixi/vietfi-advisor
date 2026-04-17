import { getZone } from "@/lib/market-overview/formatters";
import type { AssetMoodCard, SentimentDriver } from "@/lib/market-overview/types";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";

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
            <CyberCard className="p-5" variant="success">
                <CyberSubHeader>Nhiệt độ thị trường hôm nay</CyberSubHeader>
                <div className="mt-3 flex items-end gap-3">
                    <CyberMetric size="4xl" color="text-white">{score}</CyberMetric>
                    <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase mb-2 border" style={{ color: zone.color, backgroundColor: `${zone.color}18`, borderColor: `${zone.color}30` }}>
                        {zone.label}
                    </span>
                </div>
            </CyberCard>

            <section className="grid gap-3 grid-cols-2 md:grid-cols-5">
                {drivers.map((driver) => (
                    <CyberCard key={driver.label} className="p-4" showDecorators={false}>
                        <CyberSubHeader>{driver.label}</CyberSubHeader>
                        <CyberMetric size="sm" className="mt-1 block">{driver.value}</CyberMetric>
                    </CyberCard>
                ))}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                {mergedAssetSentiments.map((asset) => (
                    <CyberCard key={asset.asset} className="p-4" variant={asset.score > 50 ? "success" : "danger"}>
                        <div className="flex items-center justify-between mb-2">
                            <CyberHeader size="xs">{asset.asset}</CyberHeader>
                            <CyberMetric size="xs" color="text-white/40">{asset.score}/100</CyberMetric>
                        </div>
                        <p className="text-[12px] text-white/50 font-mono uppercase leading-relaxed">{asset.news}</p>
                    </CyberCard>
                ))}
            </section>
        </div>
    );
}

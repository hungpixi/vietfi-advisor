import { getZone } from "@/lib/market-overview/formatters";
import type { AssetMoodCard, SentimentDriver } from "@/lib/market-overview/types";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

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
            <CyberCard className="p-1" variant="success">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CyberSubHeader className="!tracking-[0.2em]">NHIỆT ĐỘ THỊ TRƯỜNG HÔM NAY</CyberSubHeader>
                        <div className="mt-4 flex items-center gap-4">
                            <CyberMetric size="4xl" className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{score}</CyberMetric>
                            <span className="h-8 w-px bg-white/10 mx-2" />
                            <span className="rounded-xl px-4 py-2 text-[13px] font-black uppercase border shadow-lg" style={{ color: zone.color, backgroundColor: `${zone.color}15`, borderColor: `${zone.color}35` }}>
                                {zone.label}
                            </span>
                        </div>
                    </div>
                    <div className="h-full hidden md:block">
                        <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: zone.color }} />
                        </div>
                    </div>
                </div>
            </CyberCard>

            <section className="grid gap-4 grid-cols-2 md:grid-cols-5">
                {drivers.map((driver) => (
                    <CyberCard key={driver.label} className="p-1" showDecorators={false}>
                        <div className="p-4 text-center">
                            <CyberSubHeader size="xs" className="mb-2 opacity-50">{driver.label}</CyberSubHeader>
                            <CyberMetric size="md" className="block text-white font-mono">{driver.value}</CyberMetric>
                        </div>
                    </CyberCard>
                ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                {mergedAssetSentiments.map((asset) => (
                    <CyberCard key={asset.asset} className="p-1" variant={asset.score > 50 ? "success" : "danger"}>
                        <div className="p-5 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-3">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1 h-4 rounded-full", asset.score > 50 ? "bg-[#22C55E]" : "bg-[#EF4444]")} />
                                    <CyberHeader size="sm" className="tracking-widest">{asset.asset}</CyberHeader>
                                </div>
                                <CyberMetric size="xs" className="text-white/30 font-mono">{asset.score}/100</CyberMetric>
                            </div>
                            <p className="text-[13px] text-white/70 font-mono uppercase leading-relaxed text-justify mb-2 italic">
                                "{asset.news}"
                            </p>
                        </div>
                    </CyberCard>
                ))}
            </section>
        </div>
    );
}

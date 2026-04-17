import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";

export function MacroTab({
    cards,
    commentary,
    trendSummary,
}: {
    cards: Array<{ label: string; value: string; emoji: string }>;
    commentary: string | null;
    trendSummary: Array<{ label: string; value: string }>;
}) {
    return (
        <div className="space-y-6">
            <section>
                <CyberHeader size="xs" className="mb-4 ml-1">Tín hiệu vĩ mô chính</CyberHeader>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <CyberCard key={card.label} className="p-5" showDecorators={false}>
                            <div className="text-2xl mb-2">{card.emoji}</div>
                            <CyberMetric size="sm" className="block text-white">{card.value}</CyberMetric>
                            <CyberSubHeader className="mt-1 block">{card.label}</CyberSubHeader>
                        </CyberCard>
                    ))}
                </div>
            </section>

            <section>
                <CyberCard className="p-5" variant="success">
                    <CyberHeader size="xs" className="mb-3">Tóm tắt nhanh</CyberHeader>
                    <p className="text-[13px] leading-relaxed text-white/55 font-mono uppercase">{commentary}</p>
                </CyberCard>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <CyberCard className="p-4" showDecorators={false}>
                    <CyberHeader size="xs" className="mb-2 text-xs">Ảnh hưởng Tiết kiệm</CyberHeader>
                    <p className="text-[11px] text-white/55 font-mono uppercase leading-relaxed">Lãi suất và USD/VND quyết định mức hấp dẫn của tiền gửi.</p>
                </CyberCard>
                <CyberCard className="p-4" showDecorators={false}>
                    <CyberHeader size="xs" className="mb-2 text-xs">Ảnh hưởng Cổ phiếu</CyberHeader>
                    <p className="text-[11px] text-white/55 font-mono uppercase leading-relaxed">GDP và CPI tác động trực tiếp đến kỳ vọng lợi nhuận.</p>
                </CyberCard>
                <CyberCard className="p-4" showDecorators={false}>
                    <CyberHeader size="xs" className="mb-2 text-xs">Ảnh hưởng BĐS</CyberHeader>
                    <p className="text-[11px] text-white/55 font-mono uppercase leading-relaxed">Lãi suất thực và tỷ giá ảnh hưởng sức mua và chi phí vay.</p>
                </CyberCard>
            </section>

            <section>
                <CyberCard className="p-5" showDecorators={false}>
                    <CyberHeader size="xs" className="mb-4">Theo dõi tuần này</CyberHeader>
                    <div className="flex flex-wrap gap-2">
                        {trendSummary.map((item) => (
                            <span key={item.label} className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase text-white/40 bg-white/5 transition-colors hover:border-[#22C55E]/30">
                                {item.label}: {item.value}
                            </span>
                        ))}
                    </div>
                </CyberCard>
            </section>
        </div>
    );
}

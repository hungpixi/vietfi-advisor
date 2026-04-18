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
                <div className="flex items-center gap-3 mb-6 ml-1">
                    <div className="h-4 w-1 bg-[#22C55E]" />
                    <CyberHeader size="sm" className="!tracking-[0.2em] text-white/90">TÍN HIỆU VĨ MÔ CHIẾN LƯỢC</CyberHeader>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 font-mono">
                    {cards.map((card) => (
                        <CyberCard key={card.label} className="p-1" showDecorators={false}>
                            <div className="p-5">
                                <div className="text-3xl mb-4 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{card.emoji}</div>
                                <CyberMetric size="lg" className="block text-white mb-1 group-hover:text-[#22C55E] transition-colors">{card.value}</CyberMetric>
                                <CyberSubHeader size="xs" className="block text-white/40 group-hover:text-white/60">{card.label}</CyberSubHeader>
                            </div>
                        </CyberCard>
                    ))}
                </div>
            </section>

            <section>
                <CyberCard className="p-1" variant="success">
                    <div className="p-6">
                        <CyberHeader size="sm" className="mb-4 text-[#22C55E] !tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                            TÓM TẮT ĐIỀU HÀNH
                        </CyberHeader>
                        <p className="text-[14px] leading-relaxed text-white/80 font-mono uppercase text-justify">{commentary}</p>
                    </div>
                </CyberCard>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {[
                    { label: "Ảnh hưởng Tiết kiệm", text: "Lãi suất và USD/VND quyết định mức hấp dẫn của tiền gửi tiền mặt." },
                    { label: "Ảnh hưởng Cổ phiếu", text: "GDP và CPI tác động trực tiếp đến kỳ vọng lợi nhuận và định giá doanh nghiệp." },
                    { label: "Ảnh hưởng BĐS", text: "Lãi suất thực và tỷ giá ảnh hưởng trực tiếp đến sức mua và chi phí vay vốn." }
                ].map((item, i) => (
                    <CyberCard key={i} className="p-1" showDecorators={false}>
                        <div className="p-5">
                            <CyberHeader size="xs" className="mb-3 text-[#22C55E]/70 font-black">{item.label}</CyberHeader>
                            <p className="text-[12px] text-white/50 font-mono uppercase leading-relaxed">{item.text}</p>
                        </div>
                    </CyberCard>
                ))}
            </section>

            <section>
                <CyberCard className="p-1" showDecorators={false}>
                    <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                        <CyberHeader size="xs" className="text-white/40 whitespace-nowrap">THEO DÕI TUẦN NÀY</CyberHeader>
                        <div className="flex flex-wrap gap-3">
                            {trendSummary.map((item) => (
                                <span key={item.label} className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black uppercase text-white/60 bg-white/[0.03] transition-all hover:border-[#22C55E]/50 hover:text-white hover:bg-white/[0.05]">
                                    {item.label}: <span className="text-[#22C55E] ml-1">{item.value}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </CyberCard>
            </section>
        </div>
    );
}

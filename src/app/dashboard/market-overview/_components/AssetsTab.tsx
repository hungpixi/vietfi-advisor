import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

export function AssetsTab({
    cards,
    personalizedAlert,
}: {
    cards: Array<{ asset: string; price: string; change: number; summary: string; action: string }>;
    personalizedAlert: { type: string; icon: string; msg: string } | null;
}) {
    return (
        <div className="space-y-6">
            {personalizedAlert && (
                <section>
                    <CyberCard className="p-4" variant="success" showDecorators={false}>
                        <CyberSubHeader color="text-[#E6B84F]">Vẹt Vàng nhìn dòng tiền của bạn</CyberSubHeader>
                        <p className="mt-2 text-sm text-white/85 font-mono uppercase leading-relaxed">
                            {personalizedAlert.icon} {personalizedAlert.msg}
                        </p>
                    </CyberCard>
                </section>
            )}

            <section>
                <CyberHeader size="xs" className="mb-4 ml-1">4 lớp tài sản chính</CyberHeader>
                <div className="grid gap-4 md:grid-cols-2">
                    {cards.map((card) => (
                        <CyberCard key={card.asset} className="p-5" variant={card.change >= 0 ? "success" : "danger"}>
                            <div className="flex items-center justify-between mb-2">
                                <CyberHeader size="xs">{card.asset}</CyberHeader>
                                <CyberMetric size="xs" color={card.change >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}>
                                    {card.change > 0 && "+"}{card.change.toFixed(2)}%
                                </CyberMetric>
                            </div>
                            <CyberMetric size="lg" className="block text-white mb-2">{card.price}</CyberMetric>
                            <p className="text-[12px] text-white/50 mb-4 font-mono uppercase leading-relaxed">{card.summary}</p>
                            <div className="rounded-lg bg-white/[0.03] p-3 text-[11px] text-white/65 font-mono uppercase border border-white/5">
                                {card.action}
                            </div>
                        </CyberCard>
                    ))}
                </div>
            </section>
        </div>
    );
}

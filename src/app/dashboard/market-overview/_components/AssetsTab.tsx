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
                    <CyberCard className="p-1" variant={personalizedAlert.type === "danger" ? "danger" : "success"} showDecorators={true}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl animate-bounce">{personalizedAlert.icon}</span>
                                <CyberHeader size="sm" className="text-[#E6B84F] !tracking-[0.15em]">PHÂN TÍCH DÒNG TIỀN</CyberHeader>
                            </div>
                            <p className="text-[16px] md:text-[18px] text-white font-black font-mono uppercase leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                {personalizedAlert.msg}
                            </p>
                        </div>
                    </CyberCard>
                </section>
            )}

            <section>
                <div className="flex items-center gap-3 mb-4 ml-1">
                    <div className="h-4 w-1 bg-[#22C55E]" />
                    <CyberHeader size="xs" className="!tracking-[0.2em] text-white/60">4 LỚP TÀI SẢN CHIẾN LƯỢC</CyberHeader>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {cards.map((card) => {
                        const isPositive = card.change >= 0;
                        return (
                            <CyberCard key={card.asset} className="p-1" variant={isPositive ? "success" : "danger"}>
                                <div className="p-4 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1 h-4 rounded-full", isPositive ? "bg-[#22C55E]" : "bg-[#EF4444]")} />
                                            <CyberHeader size="sm" className="group-hover:text-white transition-colors tracking-widest leading-none">
                                                {card.asset}
                                            </CyberHeader>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded border font-mono text-[11px] font-black tracking-wider uppercase",
                                            isPositive ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                                        )}>
                                            {card.change > 0 && "+"}{card.change.toFixed(2)}%
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <CyberMetric size="lg" className="block text-white tracking-widest leading-none">
                                            {card.price}
                                        </CyberMetric>
                                    </div>

                                    <p className="text-[12px] text-white/50 mb-4 font-mono uppercase leading-relaxed">
                                        {card.summary}
                                    </p>

                                    <div className="mt-auto group/action relative overflow-hidden rounded-lg bg-white/[0.03] p-3 border border-white/5 transition-all hover:bg-white/[0.06] hover:border-white/10">
                                        <div className="flex items-start gap-2 relative z-10">
                                            <div className={cn("mt-1 w-1 h-1 rounded-full shrink-0", isPositive ? "bg-[#22C55E]" : "bg-[#EF4444]")} />
                                            <span className="text-[11px] text-white/50 font-mono uppercase tracking-wide leading-tight group-hover:text-white/80 transition-colors">
                                                {card.action}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CyberCard>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

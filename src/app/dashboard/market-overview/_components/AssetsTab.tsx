export function AssetsTab({
    cards,
    personalizedAlert,
}: {
    cards: Array<{ asset: string; price: string; change: number; summary: string; action: string }>;
    personalizedAlert: { type: string; icon: string; msg: string } | null;
}) {
    return (
        <div className="space-y-6">
            {personalizedAlert ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#E6B84F]">Vẹt Vàng nhìn dòng tiền của bạn</p>
                    <p className="mt-2 text-sm text-white/85">{personalizedAlert.icon} {personalizedAlert.msg}</p>
                </section>
            ) : null}

            <section>
                <h2 className="mb-3 text-sm font-bold text-white">4 lớp tài sản chính</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {cards.map((card) => (
                        <div key={card.asset} className="glass-card p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">{card.asset}</span>
                                <span className="text-xs text-white/40">{card.change.toFixed(2)}%</span>
                            </div>
                            <p className="mt-2 text-lg font-bold text-white">{card.price}</p>
                            <p className="mt-2 text-[12px] text-white/50">{card.summary}</p>
                            <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-[11px] text-white/65">{card.action}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

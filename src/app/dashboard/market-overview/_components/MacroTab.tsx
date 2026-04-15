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
                <h2 className="mb-3 text-sm font-bold text-white">Tín hiệu vĩ mô chính</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <div key={card.label} className="glass-card p-5">
                            <p className="text-xl">{card.emoji}</p>
                            <p className="mt-2 text-lg font-bold text-white">{card.value}</p>
                            <p className="text-[12px] text-white/45">{card.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="glass-card p-5">
                <h3 className="text-sm font-bold text-white">Tóm tắt nhanh</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">{commentary}</p>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới gửi tiết kiệm</h3><p className="mt-2 text-[12px] text-white/55">Lãi suất và USD/VND quyết định mức hấp dẫn của tiền gửi.</p></div>
                <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới cổ phiếu</h3><p className="mt-2 text-[12px] text-white/55">GDP và CPI tác động trực tiếp đến kỳ vọng lợi nhuận và định giá.</p></div>
                <div className="glass-card p-4"><h3 className="text-sm font-semibold text-white">Ảnh hưởng tới mua nhà</h3><p className="mt-2 text-[12px] text-white/55">Lãi suất thực và tỷ giá ảnh hưởng sức mua và chi phí vay mua nhà.</p></div>
            </section>

            <section className="glass-card p-5">
                <h3 className="text-sm font-bold text-white">Việc cần theo dõi tuần này</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                    {trendSummary.map((item) => (
                        <span key={item.label} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{item.label}: {item.value}</span>
                    ))}
                </div>
            </section>
        </div>
    );
}

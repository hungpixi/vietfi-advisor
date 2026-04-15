export function MarketHero({ lastUpdated, stale, narrative }: { lastUpdated: string | null; stale: boolean; narrative: string | null }) {
    return (
        <div className="mb-6 space-y-2">
            <h1 className="text-xl md:text-2xl font-bold text-white">Tổng quan <span className="text-gradient">thị trường</span></h1>
            <div className="flex items-center gap-2 text-[13px] text-white/40">
                <span>{lastUpdated ? `Cập nhật: ${lastUpdated}` : "Đang tải dữ liệu..."}</span>
                {stale ? <span className="rounded bg-yellow-400/10 px-2 py-0.5 text-yellow-300">Dữ liệu cũ</span> : null}
            </div>
            {narrative ? <p className="max-w-3xl text-[13px] leading-relaxed text-white/50">{narrative}</p> : null}
        </div>
    );
}

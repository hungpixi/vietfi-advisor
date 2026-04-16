import { CyberHeader, CyberSubHeader } from "@/components/ui/CyberTypography";

export function MarketHero({ lastUpdated, stale, narrative }: { lastUpdated: string | null; stale: boolean; narrative: string | null }) {
    return (
        <div className="mb-6 space-y-2">
            <CyberHeader size="display">Tổng quan <span className="text-[#22C55E]">thị trường</span></CyberHeader>
            <div className="flex items-center gap-3">
                <CyberSubHeader>{lastUpdated ? `Cập nhật: ${lastUpdated}` : "Đang tải dữ liệu..."}</CyberSubHeader>
                {stale && (
                    <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-300 border border-yellow-400/20">
                        Dữ liệu cũ
                    </span>
                )}
            </div>
            {narrative && (
                <p className="max-w-3xl text-[13px] leading-relaxed text-white/50 font-mono uppercase">
                    {narrative}
                </p>
            )}
        </div>
    );
}

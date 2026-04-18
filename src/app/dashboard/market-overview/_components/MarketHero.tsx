import { CyberHeader, CyberSubHeader } from "@/components/ui/CyberTypography";

export function MarketHero({ lastUpdated, stale, narrative }: { lastUpdated: string | null; stale: boolean; narrative: string | null }) {
    return (
        <div className="mb-8 space-y-4">
            <CyberHeader size="display">Tổng quan <span className="text-[#22C55E]">thị trường</span></CyberHeader>
            <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-[#22C55E]/50" />
                <CyberSubHeader className="text-[#22C55E] font-black tracking-[0.2em] uppercase">
                    {lastUpdated ? `CẬP NHẬT: ${lastUpdated}` : "ĐANG TẢI DỮ LIỆU THỊ TRƯỜNG..."}
                </CyberSubHeader>
                {stale && (
                    <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-300 border border-yellow-400/20">
                        Dữ liệu cũ
                    </span>
                )}
            </div>
        </div>
    );
}

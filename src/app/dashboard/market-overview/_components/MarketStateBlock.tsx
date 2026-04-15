export function MarketLoadingState() {
    return <div data-testid="market-overview-loading" className="glass-card p-6 text-white/60">Đang tải tổng quan thị trường...</div>;
}

export function MarketErrorState({ message }: { message: string }) {
    return <div data-testid="market-overview-error" className="glass-card p-6 text-red-300">{message}</div>;
}

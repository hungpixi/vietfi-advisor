export type MarketTab = "tam-ly" | "tai-san" | "vi-mo";
export type MarketTone = "fear" | "neutral" | "greed";
export type MarketTrend = "up" | "down" | "neutral";
export type AssetSignal = "buy" | "hold" | "sell";

export interface MarketZone {
    label: string;
    color: string;
}

export interface SentimentHistoryPoint {
    date: string;
    score: number;
    vnindex?: number;
}

export interface SentimentDriver {
    label: string;
    value: number;
    tone: MarketTone;
}

export interface AssetMoodCard {
    asset: string;
    score: number;
    trend: MarketTrend;
    news: string;
}

export interface AssetOverviewCard {
    asset: string;
    price: string;
    change: number;
    score: number;
    trend: MarketTrend;
    summary: string;
    action: string;
    color: string;
}

export interface AssetOpportunity {
    title: string;
    description: string;
    asset: string;
    signal: AssetSignal;
    confidence: number;
}

export interface PersonalizedAlert {
    type: "danger" | "warning" | "safe" | "balanced" | "special";
    icon: string;
    msg: string;
}

export interface MacroCard {
    label: string;
    value: string;
    sub?: string;
    note?: string;
    trend: MarketTrend;
    emoji: string;
}

export interface TrendSummaryItem {
    label: string;
    value: string;
}

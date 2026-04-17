import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketOverviewPage from "./page";

vi.mock("@/lib/market-overview/useMarketOverview", () => ({
    useMarketOverview: () => ({
        status: "ready",
        error: null,
        data: {
            lastUpdated: "08:30 15/04/2026",
            stale: false,
            sentiment: { score: 29, zone: { label: "Sợ hãi", color: "#ea3943" }, drivers: [{ label: "Đà giá", value: 25, tone: "fear" }], assetSentiments: [{ asset: "Vàng", score: 72, trend: "up", news: "Tăng mạnh" }], history: [], historicalValues: [], yearlyExtremes: [] },
            assets: {
                cards: [{ asset: "Chứng khoán", price: "1250", change: 1.2, summary: "Thị trường tăng", action: "Nắm giữ" }],
                trendData: [],
                opportunities: [],
                personalizedAlert: { type: "safe", icon: "🟢", msg: "Bạn có dòng tiền ổn" }
            },
            macro: { cards: [{ label: "GDP", value: "6.5%", emoji: "📈" }], commentary: "VN-Index yếu", trendSummary: [{ label: "VN-Index", value: "1230" }] },
        },
    }),
}));

describe("MarketOverviewPage", () => {
    it("renders the page title and default tab", async () => {
        const page = await MarketOverviewPage({ searchParams: Promise.resolve({}) });
        render(page);

        expect(screen.getByRole("heading", { name: /Tổng quan thị trường/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Tâm lý" })).toHaveAttribute("aria-selected", "true");
    });

    it("selects the assets tab from search params", async () => {
        const page = await MarketOverviewPage({ searchParams: Promise.resolve({ tab: "tai-san" }) });
        render(page);

        expect(screen.getByRole("tab", { name: "Tài sản" })).toHaveAttribute("aria-selected", "true");
    });

    it("renders the sentiment lens when the default tab is active", async () => {
        // useMarketOverview is already mocked at the top, returning the sentiment data
        const page = await MarketOverviewPage({ searchParams: Promise.resolve({}) });
        render(page);

        expect(screen.getByText("Nhiệt độ thị trường hôm nay")).toBeInTheDocument();
        expect(screen.getByText("Đà giá")).toBeInTheDocument();
    });

    it("renders asset cards and personalized alert on the assets tab", async () => {
        const page = await MarketOverviewPage({ searchParams: Promise.resolve({ tab: "tai-san" }) });
        render(page);

        expect(screen.getByText("4 lớp tài sản chính")).toBeInTheDocument();
        expect(screen.getByText("Chứng khoán")).toBeInTheDocument();
        expect(screen.getAllByText(/dòng tiền/i)[0]).toBeInTheDocument();
    });

    it("renders macro cards and impact blocks on the macro tab", async () => {
        const page = await MarketOverviewPage({ searchParams: Promise.resolve({ tab: "vi-mo" }) });
        render(page);

        expect(screen.getByText("Tín hiệu vĩ mô chính")).toBeInTheDocument();
        expect(screen.getByText("Ảnh hưởng tới gửi tiết kiệm")).toBeInTheDocument();
        expect(screen.getByText("Việc cần theo dõi tuần này")).toBeInTheDocument();
    });
});

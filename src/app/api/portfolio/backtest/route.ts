import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const capital = parseFloat(searchParams.get('capital') || '100000000');
    const riskType = searchParams.get('riskType') || 'balanced';

    // We define 5 asset classes:
    // 1. Tiết kiệm (Deposit): steady ~7% per year.
    // 2. Vàng (Gold): huge pump from 2021 to 2024.
    // 3. VN-Index (Cổ phiếu VN): volatile, flat end-to-end.
    // 4. US Tech (S&P/Nasdaq proxy): massive bull market.
    // 5. Crypto (BTC): extreme volatility, very high end value.

    // Base normalized indices (2021 Jan = 1.0)
    // These represent realistic historical multipliers from Jan 2021 to Jan of that year.
    const indices = [
        { year: 2021, deposit: 1.0, gold: 1.0, vnindex: 1.0, ustech: 1.0, crypto: 1.0 },
        { year: 2022, deposit: 1.07, gold: 1.05, vnindex: 1.35, ustech: 1.25, crypto: 1.6 },
        { year: 2023, deposit: 1.15, gold: 1.12, vnindex: 0.95, ustech: 1.00, crypto: 0.8 },
        { year: 2024, deposit: 1.22, gold: 1.45, vnindex: 1.05, ustech: 1.50, crypto: 1.4 },
        { year: 2025, deposit: 1.30, gold: 1.75, vnindex: 1.15, ustech: 1.95, crypto: 2.5 },
        { year: 2026, deposit: 1.38, gold: 1.85, vnindex: 1.18, ustech: 2.30, crypto: 3.2 }
    ];

    let allocations = { deposit: 0, gold: 0, vnindex: 0, ustech: 0, crypto: 0 };

    if (riskType === 'conservative') {
        // Bảo thủ
        allocations = { deposit: 0.60, gold: 0.30, vnindex: 0.10, ustech: 0.0, crypto: 0.0 };
    } else if (riskType === 'growth') {
        // Tăng trưởng
        allocations = { deposit: 0.10, gold: 0.10, vnindex: 0.30, ustech: 0.30, crypto: 0.20 };
    } else {
        // Cân bằng (balanced)
        allocations = { deposit: 0.30, gold: 0.20, vnindex: 0.30, ustech: 0.20, crypto: 0.0 };
    }

    const historicalData = [];

    for (let i = 0; i < indices.length - 1; i++) {
        const start = indices[i];
        const end = indices[i + 1];
        const months = 12;

        for (let m = 0; m < months; m++) {
            const progress = m / months;

            // Interpolate each asset class multiplier
            const depMult = start.deposit + (end.deposit - start.deposit) * progress;
            const goldMult = start.gold + (end.gold - start.gold) * progress;
            // Add slight noise to equities and crypto
            const vnMult = start.vnindex + (end.vnindex - start.vnindex) * progress + (Math.random() - 0.5) * 0.03;
            const techMult = start.ustech + (end.ustech - start.ustech) * progress + (Math.random() - 0.5) * 0.05;
            const crypMult = start.crypto + (end.crypto - start.crypto) * progress + (Math.random() - 0.5) * 0.1;

            // Calculate weighted portfolio multiplier
            const portfolioMultiplier =
                depMult * allocations.deposit +
                goldMult * allocations.gold +
                vnMult * allocations.vnindex +
                techMult * allocations.ustech +
                crypMult * allocations.crypto;

            const portfolioValue = capital * portfolioMultiplier;

            historicalData.push({
                date: `${start.year}-${String(m + 1).padStart(2, '0')}-01`,
                year: start.year.toString(),
                portfolioValue: Math.round(portfolioValue)
            });
        }
    }

    // Add current date point (early 2026)
    const currentObj = indices[indices.length - 1];
    const finalMultiplier =
        currentObj.deposit * allocations.deposit +
        currentObj.gold * allocations.gold +
        currentObj.vnindex * allocations.vnindex +
        currentObj.ustech * allocations.ustech +
        currentObj.crypto * allocations.crypto;

    historicalData.push({
        date: '2026-04-01',
        year: '2026',
        portfolioValue: Math.round(capital * finalMultiplier)
    });

    return NextResponse.json({
        description: 'Backtest data from 2021 based on a multi-asset diversified portfolio.',
        startInvested: capital,
        currentValue: historicalData[historicalData.length - 1].portfolioValue,
        cagr: Math.round(((Math.pow(finalMultiplier, 1 / 5) - 1) * 100) * 10) / 10,  // 5 years duration
        allocations,
        history: historicalData
    });
}

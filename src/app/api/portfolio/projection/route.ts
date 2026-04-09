import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const capital = parseFloat(searchParams.get('capital') || '100000000');
    const riskType = searchParams.get('riskType') || 'balanced';

    const currentYear = 2026;
    const yearsToProject = 10;

    // Base rates depending on riskType
    const baseRates: Record<string, { bull: number; base: number; bear: number }> = {
        conservative: { bull: 0.08, base: 0.06, bear: 0.03 },
        balanced: { bull: 0.14, base: 0.09, bear: 0.04 },
        growth: { bull: 0.22, base: 0.13, bear: 0.02 },
    };

    const rates = baseRates[riskType] || baseRates.balanced;

    const scenarios = {
        bull: { cagr: rates.bull, label: `Bull Market (${rates.bull * 100}% CAGR)` },
        base: { cagr: rates.base, label: `Base Case (${rates.base * 100}% CAGR)` },
        bear: { cagr: rates.bear, label: `Bear Market (${rates.bear * 100}% CAGR)` },
    };

    const projectionData = [];

    for (let year = 0; year <= yearsToProject; year++) {
        const projectedYear = currentYear + year;
        const dataPoint: any = { year: projectedYear.toString() };

        if (year === 0) {
            dataPoint.optimistic = capital;
            dataPoint.base = capital;
            dataPoint.pessimistic = capital;
        } else {
            dataPoint.optimistic = Math.round(capital * Math.pow(1 + scenarios.bull.cagr, year));
            dataPoint.base = Math.round(capital * Math.pow(1 + scenarios.base.cagr, year));
            dataPoint.pessimistic = Math.round(capital * Math.pow(1 + scenarios.bear.cagr, year));
        }

        projectionData.push(dataPoint);
    }

    return NextResponse.json({
        description: '10-year projection based on 3 standard market scenarios.',
        scenarios: Object.values(scenarios).map(s => s.label),
        currentValue: capital,
        data: projectionData
    });
}

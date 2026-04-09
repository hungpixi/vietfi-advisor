import { NextRequest, NextResponse } from 'next/server';
import { verifyPremium } from "@/lib/premium-auth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const capital = parseFloat(searchParams.get('capital') || '100000000');
  const riskType = searchParams.get('riskType') || 'balanced';
  const requestedYears = parseInt(searchParams.get('years') || '10', 10);

  // > 5yr projection requires PREMIUM; ≤5yr is free (LEGEND and below)
  if (requestedYears > 5) {
    const auth = await verifyPremium(req);
    if (!auth.active) {
      return NextResponse.json(
        { error: "PREMIUM_REQUIRED", message: "Projection > 5yr requires Vẹt Vàng VIP", premiumRequired: true },
        { status: 403 }
      );
    }
  }

  const currentYear = 2026;

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

  const projectionData: { year: string; optimistic: number; base: number; pessimistic: number }[] = [];

  for (let year = 0; year <= requestedYears; year++) {
    const projectedYear = currentYear + year;
    const dataPoint: { year: string; optimistic: number; base: number; pessimistic: number } = {
      year: projectedYear.toString(),
      optimistic: year === 0 ? capital : Math.round(capital * Math.pow(1 + scenarios.bull.cagr, year)),
      base: year === 0 ? capital : Math.round(capital * Math.pow(1 + scenarios.base.cagr, year)),
      pessimistic: year === 0 ? capital : Math.round(capital * Math.pow(1 + scenarios.bear.cagr, year)),
    };
    projectionData.push(dataPoint);
  }

  return NextResponse.json({
    description: `${requestedYears}-year projection based on 3 standard market scenarios.`,
    scenarios: Object.values(scenarios).map(s => s.label),
    currentValue: capital,
    data: projectionData,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { checkFixedWindowRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/api-security';

type RiskType = 'conservative' | 'balanced' | 'growth';
type ProjectionPoint = {
    year: string;
    optimistic: number;
    base: number;
    pessimistic: number;
};

const DEFAULT_CAPITAL = 100_000_000;
const MIN_CAPITAL = 1;
const MAX_CAPITAL = 1_000_000_000_000;
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function normalizeCapital(value: string | null): number {
    const parsed = Number(value ?? DEFAULT_CAPITAL);
    if (!Number.isFinite(parsed)) return DEFAULT_CAPITAL;
    return Math.round(Math.min(MAX_CAPITAL, Math.max(MIN_CAPITAL, parsed)));
}

function normalizeRiskType(value: string | null): RiskType {
    if (value === 'conservative' || value === 'growth') return value;
    return 'balanced';
}

export async function GET(req: NextRequest) {
    const clientId = getClientIdentifier(req);
    const rateLimit = checkFixedWindowRateLimit(
        rateLimitMap,
        `portfolio:projection:${clientId}`,
        RATE_LIMIT,
        WINDOW_MS,
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

    const searchParams = req.nextUrl.searchParams;
    const capital = normalizeCapital(searchParams.get('capital'));
    const riskType = normalizeRiskType(searchParams.get('riskType'));

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

    const projectionData: ProjectionPoint[] = [];

    for (let year = 0; year <= yearsToProject; year++) {
        const projectedYear = currentYear + year;
        const dataPoint: ProjectionPoint = {
            year: projectedYear.toString(),
            optimistic: capital,
            base: capital,
            pessimistic: capital,
        };

        if (year !== 0) {
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
    }, {
        headers: { 'Cache-Control': 'no-store' },
    });
}

/* ═══════════════════════════════════════════════════════════
 * Loan & Insurance Affiliate Product Catalog
 * Mock data — replace affiliateUrl with real partner links.
 * No hardcoded real phone/bank numbers or API keys.
 * ═══════════════════════════════════════════════════════════ */

/* ─── Loan Products ───────────────────────────────────── */
export interface LoanProduct {
  id: string;
  name: string;           // "Vay Tín Chấp Techcombank"
  bank: string;
  minAmount: number;      // VND
  maxAmount: number;      // VND
  rateMin: number;        // %/năm
  rateMax: number;        // %/năm
  maxTenorMonths: number;
  affiliateUrl: string;
  commissionRate: number; // decimal, e.g. 0.015 = 1.5%
  tags: string[];         // e.g. ["refinance", "fast_approval"]
  badge?: string;         // e.g. "Ưu đãi 0% lãi 6 tháng đầu"
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "tcb-refi",
    name: "Vay Tái tài chính",
    bank: "Techcombank",
    minAmount: 30_000_000,
    maxAmount: 300_000_000,
    rateMin: 7.9,
    rateMax: 11.9,
    maxTenorMonths: 60,
    affiliateUrl: "https://partner.vietfi.io/tcb-refi?src=vietfi",
    commissionRate: 0.015,
    tags: ["refinance", "low_rate"],
    badge: "Trả nợ thẻ tín dụng",
  },
  {
    id: "vpbank-cash",
    name: "Vay Tiền Mặt",
    bank: "VPBank",
    minAmount: 10_000_000,
    maxAmount: 100_000_000,
    rateMin: 12.0,
    rateMax: 17.0,
    maxTenorMonths: 36,
    affiliateUrl: "https://partner.vietfi.io/vp-cash?src=vietfi",
    commissionRate: 0.02,
    tags: ["fast_approval", "no_collateral"],
    badge: "Giải ngân 30 phút",
  },
  {
    id: "bidv-home",
    name: "Vay Mua Nhà",
    bank: "BIDV",
    minAmount: 500_000_000,
    maxAmount: 10_000_000_000,
    rateMin: 5.8,
    rateMax: 8.5,
    maxTenorMonths: 240,
    affiliateUrl: "https://partner.vietfi.io/bidv-home?src=vietfi",
    commissionRate: 0.008,
    tags: ["mortgage", "long_tenor"],
  },
  {
    id: "hdsaison-personal",
    name: "Vay Cá Nhân HD SAISON",
    bank: "HD SAISON",
    minAmount: 5_000_000,
    maxAmount: 50_000_000,
    rateMin: 16.0,
    rateMax: 22.0,
    maxTenorMonths: 24,
    affiliateUrl: "https://partner.vietfi.io/hdsaison?src=vietfi",
    commissionRate: 0.03,
    tags: ["fast_approval", "poor_credit"],
    badge: "Không cần chứng minh thu nhập",
  },
  {
    id: "fe-credit-refi",
    name: "Vay Trả Nợ Fe Credit",
    bank: "Fe Credit",
    minAmount: 10_000_000,
    maxAmount: 75_000_000,
    rateMin: 14.0,
    rateMax: 18.0,
    maxTenorMonths: 48,
    affiliateUrl: "https://partner.vietfi.io/fecredit-refi?src=vietfi",
    commissionRate: 0.025,
    tags: ["refinance", "debt_consolidation"],
    badge: "Có thể vay dù nợ xấu nhóm 2",
  },
];

/* ─── Insurance Products ────────────────────────────────── */
export interface InsuranceProduct {
  id: string;
  provider: string;
  name: string;                 // "Bảo hiểm Tai nạn 24/7"
  type: "life" | "health" | "accident" | "property";
  premiumMinMonthly: number;     // VND
  premiumMaxMonthly: number;     // VND
  coverageMin: number;          // VND
  coverageMax: number;          // VND
  affiliateUrl: string;
  commissionRate: number;       // decimal
}

export const INSURANCE_PRODUCTS: InsuranceProduct[] = [
  {
    id: "manulife-accident",
    provider: "Manulife",
    name: "Bảo Hiểm Tai Nạn 24/7",
    type: "accident",
    premiumMinMonthly: 150_000,
    premiumMaxMonthly: 500_000,
    coverageMin: 100_000_000,
    coverageMax: 500_000_000,
    affiliateUrl: "https://partner.vietfi.io/manulife-acc?src=vietfi",
    commissionRate: 0.12,
  },
  {
    id: "baoviet-health",
    provider: "Bảo Việt",
    name: "Bảo Hiểm Sức Khỏe Toàn Cầu",
    type: "health",
    premiumMinMonthly: 300_000,
    premiumMaxMonthly: 1_200_000,
    coverageMin: 200_000_000,
    coverageMax: 1_000_000_000,
    affiliateUrl: "https://partner.vietfi.io/baoviet-health?src=vietfi",
    commissionRate: 0.10,
  },
  {
    id: "aia-life",
    provider: "AIA",
    name: "Bảo Hiểm Nhân Thọ Tích Lũy",
    type: "life",
    premiumMinMonthly: 500_000,
    premiumMaxMonthly: 5_000_000,
    coverageMin: 500_000_000,
    coverageMax: 5_000_000_000,
    affiliateUrl: "https://partner.vietfi.io/aia-life?src=vietfi",
    commissionRate: 0.08,
  },
];

/* ─── Helpers ───────────────────────────────────────────── */
export function filterLoansByAmount(maxAmount: number): LoanProduct[] {
  return LOAN_PRODUCTS.filter((p) => p.minAmount <= maxAmount);
}

export function formatRateRange(min: number, max: number): string {
  return min === max ? `${min}%` : `${min}–${max}%`;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Estimate monthly payment for a loan at the midpoint rate.
 * Uses standard amortization formula.
 */
export function estimateMonthlyPayment(
  amount: number,
  annualRateMin: number,
  annualRateMax: number,
  tenorMonths: number
): number {
  const rate = ((annualRateMin + annualRateMax) / 2) / 100 / 12;
  if (rate === 0) return Math.round(amount / tenorMonths);
  const factor = (rate * Math.pow(1 + rate, tenorMonths)) / (Math.pow(1 + rate, tenorMonths) - 1);
  return Math.round(amount * factor);
}

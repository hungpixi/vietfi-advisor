/* ═══════════════════════════════════════════════════════════
 * Gold + Unit Trust Partner Catalog
 * Affiliate links with UTM parameters, commission rates,
 * and staleness helpers for NAV data freshness.
 * ═══════════════════════════════════════════════════════════ */

/* ─── Gold Vendors ─────────────────────────────────────── */
export interface GoldVendor {
  id: string;
  name: string;
  type: "sjc" | "brand";
  affiliateUrl: string;
  commissionRate: number;
  note: string;
  utm: string;
}

export const GOLD_VENDORS: GoldVendor[] = [
  {
    id: "sjc-official",
    name: "SJC Gold (Điểm bán chính hãng)",
    type: "sjc",
    affiliateUrl: "https://sjc.com.vn/mua-vang",
    commissionRate: 0.005,
    note: "Cam kết thu mua lại — phù hợp mua vàng tích trữ dài hạn",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=sjc",
  },
  {
    id: "doji-gold",
    name: "DOJI Gold & Jewellery",
    type: "brand",
    affiliateUrl: "https://doji.vn/mua-vang",
    commissionRate: 0.008,
    note: "Thanh khoản nhanh, nhiều chi nhánh HCM & HN",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=doji",
  },
  {
    id: "pnj-gold",
    name: "PNJ — Vàng 24K",
    type: "brand",
    affiliateUrl: "https://pnj.com.vn/vang-24k",
    commissionRate: 0.006,
    note: "Thương hiệu niêm yết — minh bạch giá",
    utm: "utm_source=vietfi&utm_medium=gold_affiliate&utm_campaign=pnj",
  },
];

/* ─── Unit Trust Products ───────────────────────────────── */
export interface UnitTrustProduct {
  id: string;
  fundName: string;
  fundCode: string;
  fundHouse: string;
  category: "equity" | "bond" | "balanced" | "money_market";
  nav: number;          // NAV per unit in VND
  ytdReturn: number;    // % YTD return
  return1yr: number;    // % 1-year return
  return3yr: number;    // % 3-year return
  aumFee: number;       // decimal, e.g. 0.015 = 1.5%/yr
  minBuyAmount: number;  // VND minimum purchase
  affiliateUrl: string;
  commissionRate: number;
  updatedAt: string;    // ISO 8601 — CRITICAL-4 fix
}

/**
 * Returns true if the fund NAV data is older than `hrs` hours.
 * Renders a "Dữ liệu có thể cũ" warning badge when stale.
 */
export function isStale(product: UnitTrustProduct, hrs = 24): boolean {
  const ageMs = Date.now() - new Date(product.updatedAt).getTime();
  return ageMs > hrs * 60 * 60 * 1000;
}

export const UNIT_TRUST_PRODUCTS: UnitTrustProduct[] = [
  {
    id: "vndf-equity",
    fundName: "Quỹ Đầu Tư Cổ Phiếu Việt Nam (VNDF)",
    fundCode: "VNDF-Equity",
    fundHouse: "Dragon Capital",
    category: "equity",
    nav: 38_500,
    ytdReturn: 8.2,
    return1yr: 18.5,
    return3yr: 32.1,
    aumFee: 0.015,
    minBuyAmount: 10_000_000,
    affiliateUrl: "https://partner.vietfi.io/vndf?src=vietfi",
    commissionRate: 0.01,
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
  {
    id: "vcbf-growth",
    fundName: "VCBF Equity Fund",
    fundCode: "VCBF-GROWTH",
    fundHouse: "VCB Capital",
    category: "equity",
    nav: 124_000,
    ytdReturn: 6.1,
    return1yr: 14.2,
    return3yr: 28.7,
    aumFee: 0.018,
    minBuyAmount: 5_000_000,
    affiliateUrl: "https://partner.vietfi.io/vcbf?src=vietfi",
    commissionRate: 0.012,
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
  {
    id: "ssg-bond",
    fundName: "Quỹ Trái Phiếu SSG",
    fundCode: "SSG-Bond",
    fundHouse: "SSG Capital",
    category: "bond",
    nav: 12_800,
    ytdReturn: 3.1,
    return1yr: 6.8,
    return3yr: 18.4,
    aumFee: 0.008,
    minBuyAmount: 5_000_000,
    affiliateUrl: "https://partner.vietfi.io/ssg-bond?src=vietfi",
    commissionRate: 0.008,
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
];

/* ─── URL builder ───────────────────────────────────────── */
export function buildGoldAffiliateUrl(vendor: GoldVendor): string {
  const separator = vendor.affiliateUrl.includes("?") ? "&" : "?";
  return `${vendor.affiliateUrl}${separator}${vendor.utm}`;
}

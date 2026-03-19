/* ═══════════════════════════════════════════════════════════
 * Personal CPI Calculator — 7 Categories
 * ═══════════════════════════════════════════════════════════ */

export interface CPICategory {
  id: string;
  name: string;
  emoji: string;
  officialWeight: number;  // Trọng số CPI chính thức (GSO 2025)
  officialRate: number;    // CPI chính thức per category (%)
  description: string;
}

export interface PersonalCPIResult {
  personalRate: number;     // Lạm phát cá nhân (%)
  officialRate: number;     // CPI chính thức TQ (%)
  ratio: number;            // personalRate / officialRate
  isHigher: boolean;
  categories: {
    name: string;
    emoji: string;
    userWeight: number;
    officialWeight: number;
    contribution: number;   // userWeight * officialRate
  }[];
}

/* ─── 7 categories theo GSO (Tổng cục Thống kê) ─── */
export const CPI_CATEGORIES: CPICategory[] = [
  {
    id: "food",
    name: "Ăn uống",
    emoji: "🍜",
    officialWeight: 33.56,
    officialRate: 4.2,
    description: "Lương thực, thực phẩm, ăn ngoài",
  },
  {
    id: "housing",
    name: "Nhà ở & Điện nước",
    emoji: "🏠",
    officialWeight: 18.82,
    officialRate: 5.8,
    description: "Tiền thuê nhà, điện, nước, gas",
  },
  {
    id: "transport",
    name: "Đi lại",
    emoji: "🚗",
    officialWeight: 9.37,
    officialRate: 3.1,
    description: "Xăng, grab, xe buýt, bảo hiểm xe",
  },
  {
    id: "education",
    name: "Giáo dục",
    emoji: "📚",
    officialWeight: 6.17,
    officialRate: 2.5,
    description: "Học phí, sách vở, khóa học online",
  },
  {
    id: "healthcare",
    name: "Y tế & Sức khỏe",
    emoji: "🏥",
    officialWeight: 5.04,
    officialRate: 3.8,
    description: "Khám bệnh, thuốc, bảo hiểm y tế, gym",
  },
  {
    id: "entertainment",
    name: "Giải trí & Du lịch",
    emoji: "🎮",
    officialWeight: 4.29,
    officialRate: 2.0,
    description: "Phim, game, du lịch, subscription",
  },
  {
    id: "other",
    name: "Hàng hóa & Dịch vụ khác",
    emoji: "🛍️",
    officialWeight: 22.75,
    officialRate: 3.5,
    description: "Quần áo, mỹ phẩm, đồ gia dụng, Shopee",
  },
];

/* ─── CPI chính thức tổng quát (GSO 2025) ─── */
const OFFICIAL_CPI = 3.31; // %

/* ═══════════════════ MAIN ═══════════════════ */
export function calculatePersonalCPI(
  userWeights: Record<string, number> // id → % (tổng = 100)
): PersonalCPIResult {
  // Normalize weights
  const total = Object.values(userWeights).reduce((sum, w) => sum + w, 0);

  const categories = CPI_CATEGORIES.map((cat) => {
    const rawWeight = userWeights[cat.id] || 0;
    const userWeight = total > 0 ? (rawWeight / total) * 100 : cat.officialWeight;
    const contribution = (userWeight / 100) * cat.officialRate;

    return {
      name: cat.name,
      emoji: cat.emoji,
      userWeight: Math.round(userWeight * 10) / 10,
      officialWeight: cat.officialWeight,
      contribution: Math.round(contribution * 100) / 100,
    };
  });

  const personalRate = Math.round(
    categories.reduce((sum, c) => sum + c.contribution, 0) * 100
  ) / 100;

  return {
    personalRate,
    officialRate: OFFICIAL_CPI,
    ratio: Math.round((personalRate / OFFICIAL_CPI) * 100) / 100,
    isHigher: personalRate > OFFICIAL_CPI,
    categories,
  };
}

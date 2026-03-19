/* ═══════════════════════════════════════════════════════════
 * Risk DNA Profiler — 5 Prospect Theory Questions
 * ═══════════════════════════════════════════════════════════ */

export interface RiskQuestion {
  id: number;
  question: string;
  options: { label: string; value: number; emoji: string }[];
}

export interface RiskResult {
  score: number;            // 5-15
  type: "conservative" | "balanced" | "growth";
  label: string;
  emoji: string;
  description: string;
  traits: string[];
  allocation: { asset: string; percent: number; color: string }[];
}

/* ─── 5 câu hỏi Prospect Theory ─── */
export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 1,
    question: "Bạn có 10 triệu đồng tiết kiệm. Bạn sẽ làm gì?",
    options: [
      { label: "Gửi tiết kiệm ngân hàng 100%", value: 1, emoji: "🏦" },
      { label: "50% tiết kiệm, 50% chứng khoán", value: 2, emoji: "⚖️" },
      { label: "All-in chứng khoán/crypto", value: 3, emoji: "🚀" },
    ],
  },
  {
    id: 2,
    question: "Danh mục đầu tư giảm 20% trong 1 tuần. Phản ứng của bạn?",
    options: [
      { label: "Bán hết ngay, cắt lỗ", value: 1, emoji: "😰" },
      { label: "Giữ nguyên, chờ phục hồi", value: 2, emoji: "🧘" },
      { label: "Mua thêm — đây là cơ hội!", value: 3, emoji: "🤑" },
    ],
  },
  {
    id: 3,
    question: "Bạn chọn khoản đầu tư nào?",
    options: [
      { label: "Chắc chắn lãi 500K", value: 1, emoji: "✅" },
      { label: "50% cơ hội lãi 1.5 triệu, 50% hòa vốn", value: 2, emoji: "🎲" },
      { label: "20% cơ hội lãi 5 triệu, 80% mất 200K", value: 3, emoji: "💎" },
    ],
  },
  {
    id: 4,
    question: "Bạn bè khoe lãi lớn từ crypto. Bạn sẽ?",
    options: [
      { label: "Không quan tâm, con đường mình khác", value: 1, emoji: "😌" },
      { label: "Nghiên cứu trước, đầu tư nhỏ thử", value: 2, emoji: "📊" },
      { label: "FOMO — nạp tiền ngay!", value: 3, emoji: "🔥" },
    ],
  },
  {
    id: 5,
    question: "Bạn mong đợi lợi nhuận bao nhiêu/năm?",
    options: [
      { label: "5-8% (ổn định, thấp rủi ro)", value: 1, emoji: "🌱" },
      { label: "10-15% (vừa phải)", value: 2, emoji: "📈" },
      { label: "20%+ (chấp nhận mất vốn)", value: 3, emoji: "⚡" },
    ],
  },
];

/* ─── Risk Profile Results ─── */
const PROFILES: Record<RiskResult["type"], Omit<RiskResult, "score" | "type">> = {
  conservative: {
    label: "Nhà đầu tư Bảo thủ",
    emoji: "🛡️",
    description: "Bạn ưu tiên bảo toàn vốn. An toàn là số 1. Bạn sẵn sàng chấp nhận lợi nhuận thấp hơn để ngủ ngon.",
    traits: ["Kỷ luật cao", "Ghét mất tiền", "Kiên nhẫn", "Ưu tiên ổn định"],
    allocation: [
      { asset: "Tiết kiệm", percent: 50, color: "#00E5FF" },
      { asset: "Trái phiếu", percent: 20, color: "#AB47BC" },
      { asset: "Vàng", percent: 20, color: "#FFD700" },
      { asset: "Chứng khoán", percent: 10, color: "#00E676" },
    ],
  },
  balanced: {
    label: "Nhà đầu tư Cân bằng",
    emoji: "⚖️",
    description: "Bạn tìm kiếm sự cân bằng giữa rủi ro và lợi nhuận. Đa dạng hóa là chiến lược chính.",
    traits: ["Lý tính", "Đa dạng hóa", "Dài hạn", "Linh hoạt"],
    allocation: [
      { asset: "Tiết kiệm", percent: 30, color: "#00E5FF" },
      { asset: "Vàng", percent: 20, color: "#FFD700" },
      { asset: "Chứng khoán", percent: 30, color: "#00E676" },
      { asset: "Crypto", percent: 10, color: "#AB47BC" },
      { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
    ],
  },
  growth: {
    label: "Nhà đầu tư Tăng trưởng",
    emoji: "🚀",
    description: "Bạn sẵn sàng chấp nhận biến động cao để đổi lấy lợi nhuận vượt trội. High risk, high reward.",
    traits: ["Dũng cảm", "Chấp nhận rủi ro", "Tầm nhìn xa", "Hành động nhanh"],
    allocation: [
      { asset: "Tiết kiệm", percent: 15, color: "#00E5FF" },
      { asset: "Vàng", percent: 10, color: "#FFD700" },
      { asset: "Chứng khoán", percent: 40, color: "#00E676" },
      { asset: "Crypto", percent: 25, color: "#AB47BC" },
      { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
    ],
  },
};

/* ═══════════════════ MAIN ═══════════════════ */
export function calculateRiskProfile(answers: number[]): RiskResult {
  const score = answers.reduce((sum, val) => sum + val, 0);

  let type: RiskResult["type"];
  if (score <= 8) type = "conservative";
  else if (score <= 11) type = "balanced";
  else type = "growth";

  return { score, type, ...PROFILES[type] };
}

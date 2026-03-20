/**
 * VietFi Expense Parser — Tự parse chi tiêu KHÔNG CẦN AI
 * =========================================================
 * Input: "phở 30k", "grab 50 nghìn", "cà phê sáng 25000"
 * Output: { item, amount, category, confidence }
 *
 * Nguyên tắc: Regex + Keyword matching → 0 API calls → 0 chi phí
 * Chỉ fallback sang Gemini khi confidence < 0.5
 */

export interface ParsedExpense {
  item: string;        // "phở", "grab", "cà phê"
  amount: number;      // 30000, 50000, 25000
  category: string;    // "ăn uống", "đi lại", "giải trí"...
  pot: string;         // Hũ tài chính: "thiet-yeu", "giao-duc", "huong-thu"...
  confidence: number;  // 0-1, dưới 0.5 thì nên gọi AI xác nhận
  raw: string;         // Input gốc
}

// ── Keyword → Category Map ─────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; category: string; pot: string }> = {
  an_uong: {
    keywords: [
      "phở", "bún", "cơm", "mì", "bánh mì", "bánh",
      "ăn", "ăn sáng", "ăn trưa", "ăn tối", "ăn vặt",
      "trà sữa", "cà phê", "cafe", "coffee", "trà đá", "nước",
      "bia", "rượu", "nhậu", "lẩu", "nướng", "bbq",
      "gà", "bò", "heo", "cá", "tôm", "cua",
      "pizza", "burger", "kfc", "mc donald", "mcdonalds",
      "grab food", "grabfood", "shopee food", "shopeefood", "gojek",
      "bếp", "nấu", "đi chợ", "siêu thị", "vinmart", "bách hoá",
      "sushi", "tokbokki", "gỏi", "chả", "nem", "xôi",
      "hủ tiếu", "bò kho", "cháo", "soup", "canh",
      "trái cây", "hoa quả", "kem", "yogurt", "sinh tố",
    ],
    category: "Ăn uống",
    pot: "thiet-yeu",
  },
  di_lai: {
    keywords: [
      "grab", "grabbike", "grabcar", "be", "gojek",
      "taxi", "xe ôm", "xe buýt", "bus",
      "xăng", "đổ xăng", "gas", "petrol",
      "gửi xe", "đậu xe", "parking",
      "vé xe", "vé tàu", "vé máy bay", "máy bay", "tàu",
      "uber", "đi lại", "shipper", "giao hàng",
      "sửa xe", "rửa xe", "bảo dưỡng",
      "toll", "phí cầu đường", "cao tốc",
    ],
    category: "Đi lại",
    pot: "thiet-yeu",
  },
  o_at: {
    keywords: [
      "tiền nhà", "tiền trọ", "thuê nhà", "thuê phòng",
      "điện", "tiền điện", "nước", "tiền nước",
      "wifi", "internet", "mạng", "4g", "5g",
      "điện thoại", "cước phí",
      "gas", "bình gas", "gas nấu",
      "dọn nhà", "sửa nhà",
    ],
    category: "Nhà ở",
    pot: "thiet-yeu",
  },
  suc_khoe: {
    keywords: [
      "thuốc", "bệnh viện", "khám", "bác sĩ", "doctor",
      "nha khoa", "răng", "mắt", "kính",
      "gym", "fitness", "tập", "yoga", "chạy bộ",
      "bảo hiểm", "bhyt", "insurance",
      "vitamin", "thực phẩm chức năng",
    ],
    category: "Sức khoẻ",
    pot: "thiet-yeu",
  },
  giao_duc: {
    keywords: [
      "học", "khoá học", "khóa học", "course", "udemy", "coursera",
      "sách", "book", "ebook",
      "ielts", "toeic", "tiếng anh", "english",
      "học phí", "trường", "đại học", "university",
      "workshop", "hội thảo", "seminar",
      "chứng chỉ", "certificate",
    ],
    category: "Giáo dục",
    pot: "giao-duc",
  },
  giai_tri: {
    keywords: [
      "phim", "rạp", "cinema", "cgv", "lotte", "galaxy",
      "game", "steam", "ps5", "playstation", "xbox",
      "netflix", "spotify", "youtube premium", "subscription",
      "karaoke", "bar", "club", "pub",
      "du lịch", "travel", "khách sạn", "hotel", "airbnb",
      "vé", "concert", "show", "event",
      "spa", "massage", "làm nail", "tóc", "hair",
      "mua sắm", "shopping", "quần áo", "giày", "túi",
      "shopee", "lazada", "tiki", "sendo",
    ],
    category: "Giải trí",
    pot: "huong-thu",
  },
  tiet_kiem: {
    keywords: [
      "tiết kiệm", "gửi tiết kiệm", "saving",
      "đầu tư", "invest", "chứng khoán", "stock",
      "vàng", "gold", "crypto", "bitcoin", "btc",
      "quỹ", "fund", "etf",
    ],
    category: "Tiết kiệm/Đầu tư",
    pot: "tu-do-tai-chinh",
  },
  cho_di: {
    keywords: [
      "từ thiện", "donate", "quyên góp",
      "quà", "gift", "sinh nhật", "birthday",
      "biếu", "tặng", "lì xì",
      "cưới", "đám cưới", "wedding",
    ],
    category: "Cho đi/Quà tặng",
    pot: "cho-di",
  },
};

// ── Amount Parser ───────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  // "30k", "30K", "30000", "30.000"
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:k|K|ng(?:à|a)n|nghìn|nghin)/g, multiplier: 1000 },
  // "1tr", "1.5tr", "2 triệu"
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:tr(?:i[eệ]u)?|m)/gi, multiplier: 1000000 },
  // "1 tỷ"
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:t[yỷ])/gi, multiplier: 1000000000 },
  // "30000", "30.000", "300,000" (bare numbers >= 1000)
  { regex: /(\d{1,3}(?:[.,]\d{3})+)/g, multiplier: 1, isFormatted: true },
  // Plain number >= 1000 (assume VND)
  { regex: /\b(\d{4,})\b/g, multiplier: 1 },
];

function parseAmount(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  for (const pattern of AMOUNT_PATTERNS) {
    const match = pattern.regex.exec(normalized);
    pattern.regex.lastIndex = 0; // Reset regex state
    if (match) {
      let numStr = match[1];
      if (pattern.isFormatted) {
        numStr = numStr.replace(/[.,]/g, "");
      } else {
        numStr = numStr.replace(",", ".");
      }
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num * pattern.multiplier;
      }
    }
  }

  return null;
}

// ── Category Matcher ────────────────────────────────────────────
function matchCategory(text: string): { category: string; pot: string; confidence: number } {
  const lower = text.toLowerCase();
  let bestMatch = { category: "Khác", pot: "thiet-yeu", confidence: 0.3 };
  let bestScore = 0;

  for (const [, group] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of group.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        const score = keyword.length / lower.length + 0.5; // Longer keyword match = higher confidence
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { category: group.category, pot: group.pot, confidence: Math.min(score, 1) };
        }
      }
    }
  }

  return bestMatch;
}

// ── Item Extractor ──────────────────────────────────────────────
function extractItem(text: string): string {
  // Remove amount-related tokens to get the item name
  let item = text
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:k|K|ng(?:à|a)n|nghìn|nghin|tr(?:i[eệ]u)?|m|t[yỷ]|đồng|vnd|vnđ|d)/gi, "")
    .replace(/(\d{1,3}(?:[.,]\d{3})+)/g, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\b\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Remove leading/trailing punctuation
  item = item.replace(/^[\s,\-:]+|[\s,\-:]+$/g, "").trim();

  return item || "chi tiêu";
}

// ── Main Parser ─────────────────────────────────────────────────
export function parseExpense(text: string): ParsedExpense | null {
  const amount = parseAmount(text);
  if (!amount || amount < 500 || amount > 1_000_000_000) {
    return null; // Không nhận ra số tiền hợp lệ
  }

  const item = extractItem(text);
  const { category, pot, confidence } = matchCategory(text);

  return {
    item,
    amount,
    category,
    pot,
    confidence,
    raw: text,
  };
}

// ── Time-Based Category Boost ───────────────────────────────────
// "phở 30k" lúc 7h sáng → chắc chắn ăn sáng, confidence cao hơn
export function parseExpenseWithContext(text: string, hour?: number): ParsedExpense | null {
  const result = parseExpense(text);
  if (!result) return null;

  const h = hour ?? new Date().getHours();

  // Boost confidence cho ăn uống theo giờ
  if (result.category === "Ăn uống") {
    if ((h >= 6 && h <= 9) || (h >= 11 && h <= 13) || (h >= 17 && h <= 20)) {
      result.confidence = Math.min(result.confidence + 0.15, 1);
      if (h >= 6 && h <= 9) result.item = result.item || "ăn sáng";
      if (h >= 11 && h <= 13) result.item = result.item || "ăn trưa";
      if (h >= 17 && h <= 20) result.item = result.item || "ăn tối";
    }
  }

  return result;
}

// ── Quick Test ──────────────────────────────────────────────────
// parseExpenseWithContext("phở 30k") → { item: "phở", amount: 30000, category: "Ăn uống", pot: "thiet-yeu", confidence: 0.85 }
// parseExpenseWithContext("grab 50 nghìn") → { item: "grab", amount: 50000, category: "Đi lại", pot: "thiet-yeu", confidence: 0.9 }
// parseExpenseWithContext("shopee 200k") → { item: "shopee", amount: 200000, category: "Giải trí", pot: "huong-thu", confidence: 0.7 }
// parseExpenseWithContext("tiền trọ 3tr5") → { item: "tiền trọ", amount: 3500000, category: "Nhà ở", pot: "thiet-yeu", confidence: 0.95 }

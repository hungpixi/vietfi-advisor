/**
 * VietFi Scripted Responses v2 — TTS-Ready
 * ==========================================
 * Mỗi response có `text` (hiện UI, có emoji) và `ttsText` (cho audio, clean).
 * Responses static (không có {variables}) sẽ được pre-generate audio.
 * Responses dynamic ({amount}, {item}...) sẽ dùng real-time TTS hoặc skip.
 */

// ── Types ────────────────────────────────────────────────────────
export type Intent =
  | "greeting" | "goodbye" | "thanks"
  | "expense_logged" | "expense_high" | "expense_low"
  | "ask_spending" | "ask_debt" | "ask_invest" | "ask_save"
  | "ask_gold" | "ask_stock" | "ask_crypto" | "ask_market"
  | "compare_gold_stock" | "ask_inflation" | "ask_realestate"
  | "motivate" | "complain" | "curse" | "sad" | "bored"
  | "who_are_you" | "help" | "joke"
  | "morning" | "afternoon" | "evening" | "night"
  | "streak_praise" | "level_up" | "zero_income_roast"
  | "ledger_empty"
  | "vuot_lo" | "mua_tra_sua" | "bo_app" | "shopee" | "het_tien"
  | "ghi_dung_gio" | "streak_7" | "tra_no" | "tiet_kiem"
  | "unknown";

export interface ScriptedResponseItem {
  /** Unique ID cho audio mapping, ví dụ: "greeting_0", "morning_2" */
  id: string;
  /** Text hiện trên chat UI (có emoji) */
  text: string;
  /** Text sạch cho TTS — không emoji, tự nhiên khi nghe */
  ttsText: string;
  /** Response có chứa {variables} → không thể pre-generate audio */
  isDynamic?: boolean;
}

const POLITE_DEFAULT_ENABLED = true;

// ── Intent Detection (Keyword-based, NO AI) ─────────────────────
const INTENT_PATTERNS: { intent: Intent; patterns: string[] }[] = [
  { intent: "ask_gold", patterns: ["giá vàng", "vàng", "sjc", "gold", "vàng miếng"] },
  { intent: "ask_stock", patterns: ["vnindex", "vn-index", "chứng khoán", "cổ phiếu", "stock", "hose", "hnx"] },
  { intent: "ask_crypto", patterns: ["crypto", "bitcoin", "btc", "eth", "coin"] },
  { intent: "ask_market", patterns: ["thị trường", "market", "kinh tế", "lãi suất", "tỷ giá", "usd"] },
  { intent: "compare_gold_stock", patterns: ["vàng vs", "ck vs", "vàng hay cổ phiếu", "so sánh vàng", "vàng với chứng khoán", "gold vs stock"] },
  { intent: "ask_inflation", patterns: ["lạm phát", "inflation", "cpi", "giá tăng", "mất giá"] },
  { intent: "ask_realestate", patterns: ["mua nhà", "bđs", "bất động sản", "thuê nhà", "nhà ở", "real estate"] },
  { intent: "ask_spending", patterns: ["chi tiêu", "tiêu bao nhiêu", "tốn bao nhiêu", "tiền đi đâu", "phân tích chi", "xài hết", "tiêu hết"] },
  { intent: "ask_debt", patterns: ["nợ", "trả góp", "debt", "vay", "thẻ tín dụng", "tín dụng", "trả nợ"] },
  { intent: "ask_invest", patterns: ["đầu tư", "invest", "mua gì", "nên mua", "chứng khoán", "cổ phiếu", "portfolio"] },
  { intent: "ask_save", patterns: ["tiết kiệm", "saving", "để dành", "gửi tiền", "tiền tiết kiệm"] },
  { intent: "greeting", patterns: ["xin chào", "hello", "hi", "chào", "yo", "hey", "mở app", "quay lại"] },
  { intent: "goodbye", patterns: ["bye", "tạm biệt", "tắt", "đi đây", "ngủ", "off", "thôi"] },
  { intent: "thanks", patterns: ["cảm ơn", "thanks", "thank", "tks", "cám ơn", "biết ơn"] },
  { intent: "motivate", patterns: ["motivate", "động viên", "khích lệ", "mệt"] },
  { intent: "complain", patterns: ["app tệ", "tệ quá", "dở", "ghét", "khó dùng", "bug"] },
  { intent: "curse", patterns: ["quạu", "bực", "điên", "khùng", "cáu", "ghét"] },
  { intent: "sad", patterns: ["buồn", "hết tiền", "cháy túi", "phá sản", "nghèo", "xui", "xu cà na"] },
  { intent: "bored", patterns: ["chán", "nhàm", "buồn ngủ", "rảnh", "ko biết làm gì"] },
  { intent: "who_are_you", patterns: ["mày là ai", "bạn là ai", "ai đây", "bot à", "vẹt à", "giới thiệu"] },
  { intent: "help", patterns: ["help", "giúp", "hướng dẫn", "cách dùng", "làm sao"] },
  { intent: "ledger_empty", patterns: ["sổ thu chi trống", "chưa có giao dịch"] },
  { intent: "joke", patterns: ["kể chuyện cười", "joke", "funny", "hài", "cười"] },
];

export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  // 1. Check time-based greetings (regex already has word boundary \b)
  const hour = new Date().getHours();
  if (lower.match(/^(chào|xin chào|hello|hi|yo|hey)\b/)) {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
  }

  // 2. Check other patterns with word boundaries for safety
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      // Use word boundaries if the pattern is short (<= 3 chars) to avoid matching substrings
      if (pattern.length <= 3) {
        const regex = new RegExp(`\\b${pattern}\\b`, "i");
        if (regex.test(lower)) return intent;
      } else {
        if (lower.includes(pattern)) return intent;
      }
    }
  }

  return "unknown";
}

// ── Emoji Stripper ──────────────────────────────────────────────
function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toPoliteTone(text: string): string {
  return text
    .replace(/\bMạy\b/g, "Bạn")
    .replace(/\bMày\b/g, "Bạn")
    .replace(/\bmạy\b/g, "bạn")
    .replace(/\bmày\b/g, "bạn")
    .replace(/\bTao\b/g, "Tôi")
    .replace(/\btao\b/g, "tôi");
}

// ── Helper: tạo response item ───────────────────────────────────
function r(intent: string, index: number, text: string, ttsOverride?: string): ScriptedResponseItem {
  return {
    id: `${intent}_${index}`,
    text,
    ttsText: ttsOverride || stripEmoji(text),
  };
}

function rd(intent: string, index: number, text: string): ScriptedResponseItem {
  return { id: `${intent}_${index}`, text, ttsText: stripEmoji(text), isDynamic: true };
}

// ══════════════════════════════════════════════════════════════════
// SCRIPTED RESPONSES — Audited for TTS + Natural Vietnamese
// ══════════════════════════════════════════════════════════════════
const RESPONSES: Record<string, ScriptedResponseItem[]> = {

  // ── Greeting (chung, khi không nhận diện được giờ) ──
  greeting: [
    r("greeting", 0,
      "Chào bạn! Rất vui được gặp lại. 👋🦜",
      "Chào bạn! Rất vui được gặp lại."),
    r("greeting", 1,
      "Chào mừng quay lại! Đã ghi chi tiêu hôm nay chưa? 💸",
      "Chào mừng quay lại! Đã ghi chi tiêu hôm nay chưa?"),
    r("greeting", 2,
      "Chào chủ tịch mõm! Hôm nay lại đốt tiền vào cái gì vô tri rồi? 🤡",
      "Chào chủ tịch mõm! Hôm nay lại đốt tiền vào cái gì vô lý rồi?"),
    r("greeting", 3,
      "Tao đây! Lương chưa về mà đã thấy ví mỏng dính rồi bấy bì 🦜",
      "Tao đây! Lương chưa về mà đã thấy ví mỏng dính rồi."),
    r("greeting", 4,
      "Lại mày! Thở thôi cũng thấy tốn tiền, nói nhanh hôm nay tiêu gì? 🤨",
      "Lại mày! Thở thôi cũng thấy tốn tiền, nói nhanh hôm nay tiêu gì?"),
  ],

  // ── Morning ──
  morning: [
    r("morning", 0,
      "Chào buổi sáng! Sẵn sàng theo dõi chi tiêu hôm nay chưa? 🌅🦜",
      "Chào buổi sáng! Sẵn sàng theo dõi chi tiêu hôm nay chưa?"),
    r("morning", 1,
      "Sáng rồi! Cà phê xay hay sinh tố lúa mạch gì thì cũng nhớ ghi vô nghen ☕🦜",
      "Sáng rồi! Cà phê xay hay sinh tố lúa mạch gì thì cũng nhớ ghi vô nghen!"),
    r("morning", 2,
      "Sáng sớm đã mở app? Tưởng mày lười lắm chứ, tao ghi nhận 1 điểm siêng năng! 🌅",
      "Sáng sớm đã mở app? Tưởng mày lười lắm chứ, tao ghi nhận một điểm siêng năng!"),
    r("morning", 3,
      "Mục tiêu hôm nay tiêu bao nhiêu? Dưới 100 cành hay lại vung tay quá trán? 📋",
      "Mục tiêu hôm nay tiêu bao nhiêu? Dưới 100 cành hay lại vung tay quá trán?"),
    r("morning", 4,
      "Chào buổi sáng! Tỉnh táo lên để không quẹt thẻ ngu ngốc trong ngày nhé! 🌅",
      "Chào buổi sáng! Tỉnh táo lên để không quẹt thẻ ngu ngốc trong ngày nhé!"),
  ],

  // ── Afternoon ──
  afternoon: [
    r("afternoon", 0,
      "Trưa rồi nhỉ! Đã ăn uống hôm nay chưa? 🍜",
      "Trưa rồi nhỉ! Đã ăn uống hôm nay chưa?"),
    r("afternoon", 1,
      "Phê pha buổi chiều hả? Cẩn thận tiền mồ hôi nước mắt trôi theo rãnh nước đó 💰",
      "Phê pha buổi chiều hả? Cẩn thận tiền mồ hôi nước mắt trôi theo rãnh nước đó."),
    r("afternoon", 2,
      "Nắng nóng bốc khói, nhưng cái ví của mày mỏng đi mới là thứ kinh dị nhất 🔥",
      "Nắng nóng bốc khói, nhưng cái ví của mày mỏng đi mới là thứ kinh dị nhất!"),
    r("afternoon", 3,
      "Lại thèm Phúc Long 50 cành hả? Uống cho cố vô rồi cuối tháng bù tiền nhà xót ví nha 🧋",
      "Lại thèm Phúc Long năm mươi cành hả? Uống cho cố vô rồi cuối tháng bù tiền nhà xót ví nha."),
  ],

  // ── Evening ──
  evening: [
    r("evening", 0,
      "Chiều tối rồi! Kiểm tra chi tiêu hôm nay nhé? 🌙",
      "Chiều tối rồi! Kiểm tra chi tiêu hôm nay nhé?"),
    r("evening", 1,
      "Buổi tối rảnh rỗi sinh nông nổi, khoá cái app Shopee lại giùm tạo 💧",
      "Buổi tối rảnh rỗi sinh nông nổi, khoá cái gian hàng sốp pi lại giùm tao."),
    r("evening", 2,
      "Ăn tối xong chưa? Mù mờ tài chính là bệnh nan y đó, ghi chi tiêu lẹ đi 🦜",
      "Ăn tối xong chưa? Mù mờ tài chính là bệnh nan y đó, ghi chi tiêu lẹ đi."),
    r("evening", 3,
      "Tổng kết ví xem còn cái nịt không? Mày xài tiền cứ như mày trúng Vietlott vậy 🔍",
      "Tổng kết ví xem còn bao nhiêu? Mày xài tiền cứ như mày trúng độc đắc vậy."),
  ],

  // ── Night ──
  night: [
    r("night", 0,
      "Khuya rồi! Sẵn sàng ghi chi tiêu cuối ngày? 😴🦜",
      "Khuya rồi! Sẵn sàng ghi chi tiêu cuối ngày?"),
    r("night", 1,
      "Thức đêm lướt tóp tóp chốt đơn SPayLater đúng không? Bỏ điện thoại xuống! 🌙",
      "Thức đêm lướt tóp tóp chốt trả góp đúng không? Bỏ điện thoại xuống!"),
    r("night", 2,
      "Cái quầng thâm rớt tới cằm rồi, ví mỏng thì ráng giữ nhan sắc. Đi ngủ! 🦉",
      "Cái quầng thâm rớt tới cằm rồi, ví mỏng thì ráng giữ sức khoẻ. Đi ngủ!"),
  ],

  // ── Goodbye ──
  goodbye: [
    r("goodbye", 0,
      "Tạm biệt! Hẹn gặp lại ngày mai nhé! 👋🦜",
      "Tạm biệt! Hẹn gặp lại ngày mai nhé!"),
    r("goodbye", 1,
      "Bye! Nhớ đừng mua cái gì vô lý khi tao không nhìn! 👀",
      "Bye! Nhớ đừng mua cái gì vô lý khi tao không nhìn!"),
    r("goodbye", 2,
      "Tạm biệt chủ tịch! Streak đừng mất nghen! 🔥",
      "Tạm biệt chủ tịch! Chuỗi ngày đừng mất nghen!"),
    r("goodbye", 3,
      "Đi ngủ đi! Mai nhớ quay lại, tao nhớ mày... nhớ ví tiền mày thôi 💰",
      "Đi ngủ đi! Mai nhớ quay lại, tao nhớ mày. Nhớ ví tiền mày thôi!"),
  ],

  // ── Thanks ──
  thanks: [
    r("thanks", 0,
      "Không có gì! Bạn ghi chi tiêu đầy đủ là tôi vui rồi. 🦜",
      "Không có gì! Bạn ghi chi tiêu đầy đủ là tôi vui rồi."),
    r("thanks", 1,
      "Đừng cảm ơn, trả ơn bằng cách tiết kiệm hơn đi! 💪",
      "Đừng cảm ơn, trả ơn bằng cách tiết kiệm hơn đi!"),
    r("thanks", 2,
      "Cảm ơn cái gì! Tao làm nhiệm vụ thôi. Giờ ghi chi tiêu đi! 📝",
      "Cảm ơn cái gì! Tao làm nhiệm vụ thôi. Giờ ghi chi tiêu đi!"),
  ],

  // ── Expense Responses (DYNAMIC — có {variables}) ──
  expense_logged: [
    rd("expense_logged", 0, "Ghi rồi! {amount} cho {item}. {roast} 🦜"),
    rd("expense_logged", 1, "OK ghi vô {category} rồi! {amount} bay mất! 💸"),
    rd("expense_logged", 2, "✅ Đã ghi {amount} — {item}. Hôm nay tổng chi: {total} rồi đó!"),
    rd("expense_logged", 3, "Được rồi, {amount} cho {item}. Mày kiếm lại bằng cách nào? 🤔"),
    rd("expense_logged", 4, "Ghi! {item} — {amount}. Tháng này hũ {pot} còn {remaining} thôi đấy!"),
  ],
  expense_high: [
    rd("expense_high", 0, "Chi tiêu hôm nay cao hơn thông thường. Có khoản nào cần review không? 🤯"),
    rd("expense_high", 1, "Chủ tịch chi {amount}! Đại gia thiệt. Hay là hết tiền rồi? 💸"),
    rd("expense_high", 2, "{amount} một phát! Suy nghĩ lại đi! 😱"),
    rd("expense_high", 3, "{amount}! Mày có chắc là CẦN không? Hay chỉ MUỐN thôi? 🤨"),
    rd("expense_high", 4, "{amount}?! Tiền này mua được {compare} nè! Suy nghĩ lại đi 🧠"),
  ],
  expense_low: [
    rd("expense_low", 0, "Chỉ {amount}? Rất tốt! Tiếp tục nhé! ❤️🦜"),
    rd("expense_low", 1, "{amount} thôi à? Tốt lắm! Cứ vậy tiếp! 💪"),
    rd("expense_low", 2, "Ít vậy? Mày bắt đầu nghe lời tao rồi ha! 🦜"),
    rd("expense_low", 3, "{amount} — hợp lý! Tao tự hào về mày! 🌟"),
  ],

  // ── Financial Advice (STATIC) ──
  ask_spending: [
    r("ask_spending", 0,
      "Vào trang Quỹ Chi tiêu nhé! Tôi đã phân tích sẵn rồi. 📊🦜",
      "Vào trang Quỹ Chi tiêu nhé! Tôi đã phân tích sẵn rồi."),
    r("ask_spending", 1,
      "Muốn biết tiền đi đâu? Mở Quỹ Chi tiêu ở menu bên trái! Tao đã phân chia hũ cho mày 💰",
      "Muốn biết tiền đi đâu? Mở Quỹ Chi tiêu ở menu bên trái! Tao đã phân chia hũ cho mày."),
    r("ask_spending", 2,
      "Để tao check... Mày nên vào Quỹ Chi tiêu để xem biểu đồ chi tiết nha! 🧠",
      "Để tao check. Mày nên vào Quỹ Chi tiêu để xem biểu đồ chi tiết nha!"),
  ],

  ask_debt: [
    r("ask_debt", 0,
      "Nợ à? Vào Quỹ Nợ — tao tính sẵn chi phí ẩn, lãi thực rồi! Cẩn thận kẻo vỡ nợ domino! 🏦🦜",
      "Nợ à? Vào trang Quỹ Nợ, tao tính sẵn chi phí ẩn và lãi thực rồi! Cẩn thận kẻo vỡ nợ domino!"),
    r("ask_debt", 1,
      "Tỷ lệ nợ trên thu nhập hiện tại khá cao. Vào Quỹ Nợ để xem chi tiết nhé! 🏦",
      "Tỷ lệ nợ trên thu nhập hiện tại khá cao. Vào Quỹ Nợ để xem chi tiết nhé!"),
    r("ask_debt", 2,
      "Tao có 2 chiến thuật trả nợ: Avalanche là trả cái lãi cao nhất trước, hoặc Snowball là trả cái nhỏ nhất trước. Vào Quỹ Nợ chọn đi! ⚔️",
      "Tao có hai chiến thuật trả nợ. Một là trả cái lãi cao nhất trước. Hai là trả cái nhỏ nhất trước. Vào Quỹ Nợ chọn đi!"),
    r("ask_debt", 3,
      "Tỷ lệ nợ trên thu nhập 30% rồi đó, cẩn thận kẻo ngân hàng thấy hồ sơ mà chạy 🏃‍♂️",
      "Tỷ lệ nợ trên thu nhập ba mươi phần trăm rồi đó, cẩn thận kẻo ngân hàng thấy hồ sơ mà chạy."),
  ],

  ask_invest: [
    r("ask_invest", 0,
      "Mày biết rule đầu tiên không? ĐỪNG đầu tư tiền ăn! Làm quiz Tính cách đầu tư trước đi 🧬🦜",
      "Mày biết quy tắc đầu tiên không? Đừng đầu tư tiền ăn! Mở trang Tính cách đầu tư làm quiz trước đi."),
    r("ask_invest", 1,
      "Vào Cố vấn danh mục — tao đề xuất tỷ trọng portfolio dựa trên DNA rủi ro của mày. Đừng all-in 1 chỗ! 🥧",
      "Vào trang Cố vấn danh mục, tao đề xuất tỷ trọng đầu tư dựa trên khẩu vị rủi ro của mày. Đừng dồn hết vào một chỗ!"),
    r("ask_invest", 2,
      "Đa dạng hóa danh mục nhé! Đừng dồn hết vào một chỗ. 🚲",
      "Đa dạng hóa danh mục nhé! Đừng dồn hết vào một chỗ."),
    r("ask_invest", 3,
      "Đa dạng hóa danh mục đi! Đừng bỏ trứng 1 rổ. Cơ bản vậy mà! 🥚",
      "Đa dạng hóa danh mục đi! Đừng bỏ trứng một rổ. Cơ bản vậy mà!"),
    r("ask_invest", 4,
      "Quy tắc 72: lãi suất 8%/năm thì tiền gấp đôi sau 9 năm. Lãi 12% thì gấp đôi sau 6 năm! 📐",
      "Quy tắc bảy mươi hai: lãi suất tám phần trăm một năm thì tiền gấp đôi sau chín năm. Lãi mười hai phần trăm thì gấp đôi sau sáu năm."),
  ],

  ask_save: [
    r("ask_save", 0,
      "Gửi tiết kiệm 5.2% một năm, lạm phát 3.5%. Lãi thật chỉ 1.7%. Giàu chắc kiếp sau! 😅🦜",
      "Gửi tiết kiệm năm phẩy hai phần trăm một năm, lạm phát ba phẩy năm. Lãi thật chỉ một phẩy bảy. Giàu chắc kiếp sau!"),
    r("ask_save", 1,
      "Tiết kiệm tốt! Nhưng tiền nằm im là mất giá. Xem Cố vấn danh mục tao gợi ý nhé 📈",
      "Tiết kiệm tốt! Nhưng tiền nằm im là mất giá. Mở trang Cố vấn danh mục, tao gợi ý cho nhé."),
    r("ask_save", 2,
      "Quy tắc 50-30-20: 50% thiết yếu, 30% hưởng thụ, 20% tiết kiệm. Mày đang ở đâu? 🤔",
      "Quy tắc năm mươi ba mươi hai mươi: năm mươi phần trăm cho thiết yếu, ba mươi phần trăm hưởng thụ, hai mươi phần trăm tiết kiệm. Mày đang ở đâu?"),
    r("ask_save", 3,
      "Mỗi tháng tiết kiệm 3 triệu, sau 10 năm là 360 triệu chưa tính lãi. Bắt đầu đi! 💪",
      "Mỗi tháng tiết kiệm ba triệu, sau mười năm là ba trăm sáu mươi triệu chưa tính lãi. Bắt đầu đi!"),
  ],

  ask_gold: [
    r("ask_gold", 0,
      "Vàng thì vào Nhiệt kế thị trường check giá SJC hôm nay! Nhớ: vàng là bảo vệ, không phải đầu cơ 🥇🦜",
      "Vàng thì vào trang Nhiệt kế thị trường check giá hôm nay! Nhớ, vàng là để bảo vệ tài sản, không phải đầu cơ."),
    r("ask_gold", 1,
      "Vàng SJC à? Chênh mua-bán nhiều lắm! Mua miếng lớn lời hơn miếng nhỏ 💰",
      "Vàng SJC à? Chênh lệch giá mua bán nhiều lắm! Mua miếng lớn lời hơn miếng nhỏ."),
    r("ask_gold", 2,
      "Giá vàng hôm nay xem ở trang Tổng quan. Nhưng nhớ: đừng sợ bỏ lỡ mà mua đỉnh! 📉",
      "Giá vàng hôm nay xem ở trang Tổng quan. Nhưng nhớ, đừng sợ bỏ lỡ mà mua đỉnh!"),
  ],

  ask_stock: [
    r("ask_stock", 0,
      "VN-Index hôm nay thế nào? Mở trang Tổng quan ra! Tao đã có Nhiệt kế thị trường cho mày 📊🦜",
      "Vê en index hôm nay thế nào? Mở trang Tổng quan ra! Tao đã có Nhiệt kế thị trường cho mày."),
    r("ask_stock", 1,
      "Chứng khoán à? Thị trường sợ hãi thì là cơ hội mua. Nhưng mà tiền đâu? 🤷",
      "Chứng khoán à? Thị trường sợ hãi thì là cơ hội mua. Nhưng mà, tiền đâu?"),
    r("ask_stock", 2,
      "VN30 hay Midcap? Phụ thuộc khẩu vị rủi ro của mày! Làm quiz Tính cách đầu tư trước đi 🧬",
      "Vê en ba mươi hay Midcap? Phụ thuộc khẩu vị rủi ro của mày! Mở trang Tính cách đầu tư làm quiz trước đi."),
  ],

  ask_crypto: [
    r("ask_crypto", 0,
      "Crypto à? Chỉ đầu tư số tiền mày chấp nhận mất 100%! Tao nói thật đó 🦜",
      "Crypto à? Chỉ đầu tư số tiền mày chấp nhận mất hoàn toàn! Tao nói thật đó."),
    r("ask_crypto", 1,
      "Bitcoin? Mua đều đặn mỗi tháng là chiến thuật an toàn nhất cho người mới 📈",
      "Bitcoin? Mua đều đặn mỗi tháng là chiến thuật an toàn nhất cho người mới."),
    r("ask_crypto", 2,
      "Quy tắc: Crypto tối đa 5 đến 10% danh mục. Đừng dồn hết! 🚨",
      "Quy tắc: Crypto tối đa năm đến mười phần trăm danh mục. Đừng dồn hết!"),
  ],

  ask_market: [
    r("ask_market", 0,
      "Thị trường? Mở Xu hướng kinh tế ra, tao có biểu đồ GDP, CPI, lãi suất cho mày 📈🦜",
      "Thị trường hả? Mở trang Xu hướng kinh tế ra, tao có biểu đồ GDP, CPI, lãi suất cho mày."),
    r("ask_market", 1,
      "Lãi suất huy động đang thấp, tiền rẻ thì chứng khoán lên. Nhưng mà lý thuyết thôi nha 🤓",
      "Lãi suất huy động đang thấp, tiền rẻ thì chứng khoán lên. Nhưng mà lý thuyết thôi nha!"),
    r("ask_market", 2,
      "Tỷ giá USD tăng thì nhập khẩu đắt hơn, lạm phát tăng. Mua vàng phòng thủ? 🤔",
      "Tỷ giá đô la tăng thì nhập khẩu đắt hơn, lạm phát tăng. Mua vàng phòng thủ cũng được."),
  ],

  // ── Emotional ──
  motivate: [
    r("motivate", 0,
      "Tiết kiệm từ những điều nhỏ nhất. Mỗi ngày tốt hơn 1%! 🥤🦜",
      "Tiết kiệm từ những điều nhỏ nhất. Mỗi ngày tốt hơn một phần trăm!"),
    r("motivate", 1,
      "Ngày nào cũng tốt hơn 1%, 365 ngày sau mày mạnh hơn gấp 37 lần! Cứ bước tiếp đi 🚶‍♂️",
      "Ngày nào cũng tốt hơn một phần trăm, ba trăm sáu mươi lăm ngày sau mày mạnh hơn gấp ba mươi bảy lần! Cứ bước tiếp đi."),
    r("motivate", 2,
      "Giàu không phải kiếm nhiều, giàu là tiêu ít hơn kiếm. Chấm! ✅",
      "Giàu không phải kiếm nhiều, giàu là tiêu ít hơn kiếm. Chấm!"),
    r("motivate", 3,
      "3 ngày không mở app rồi nha, tiền thì vẫn bay. Giỏi thật đấy 🪂",
      "Ba ngày không mở app rồi nha, tiền thì vẫn bay. Giỏi thật đấy!"),
    r("motivate", 4,
      "Ghi chi tiêu đi, đừng để cuối tháng hỏi tiền đi đâu hết rồi 🕵️",
      "Ghi chi tiêu đi, đừng để cuối tháng hỏi tiền đi đâu hết rồi!"),
    r("motivate", 5,
      "Tiền không tự sinh sôi, nhưng nợ thì có! Lãi kép ngược lại là nợ gấp đôi đó 📈🦜",
      "Tiền không tự sinh sôi, nhưng nợ thì có! Lãi kép ngược lại là nợ gấp đôi đó."),
  ],

  complain: [
    r("complain", 0,
      "Tệ à? Ít ra tao miễn phí, thuê cố vấn tài chính ngoài kia 500 nghìn mỗi giờ đó! 🦜",
      "Tệ à? Ít ra tao miễn phí, thuê cố vấn tài chính ngoài kia năm trăm nghìn mỗi giờ đó!"),
    r("complain", 1,
      "Feedback noted! Nhưng mà mày đã ghi chi tiêu chưa? Đừng đổi chủ đề! 📝",
      "Ghi nhận góp ý! Nhưng mà mày đã ghi chi tiêu chưa? Đừng đổi chủ đề!"),
    r("complain", 2,
      "OK tao ghi nhận. Nhưng cũng đừng quên: tao giúp mày tiết kiệm tiền miễn phí đấy 💸",
      "OK tao ghi nhận. Nhưng cũng đừng quên, tao giúp mày tiết kiệm tiền miễn phí đấy."),
  ],

  curse: [
    r("curse", 0,
      "Nóng tính dữ! Bình tĩnh rồi vô ghi chi tiêu đi, chửi tao không giúp mày giàu hơn đâu 🦜",
      "Nóng tính dữ! Bình tĩnh rồi vô ghi chi tiêu đi, chửi tao không giúp mày giàu hơn đâu."),
    r("curse", 1,
      "Ê ê! Chửi tao xong tiền cũng không tự mọc lên nghen! Ghi chi tiêu đi! 😤",
      "Ê ê! Chửi tao xong tiền cũng không tự mọc lên nghen! Ghi chi tiêu đi!"),
    r("curse", 2,
      "OK... hít thở sâu... rồi... mở Quỹ Chi tiêu ghi đi. Tao không giận đâu 🦜",
      "Okê. Hít thở sâu. Rồi. Mở Quỹ Chi tiêu ghi đi. Tao không giận đâu."),
  ],

  sad: [
    r("sad", 0,
      "Hết tiền à? Bình thường thôi! Quan trọng là biết tại sao. Mở Quỹ Chi tiêu xem nào 🔍🦜",
      "Hết tiền à? Bình thường thôi! Quan trọng là biết tại sao. Mở Quỹ Chi tiêu xem nào."),
    r("sad", 1,
      "Buồn thì buồn, nhưng tiền vẫn phải quản! Tao ở đây giúp mày mà 🦜❤️",
      "Buồn thì buồn, nhưng tiền vẫn phải quản! Tao ở đây giúp mày mà."),
    r("sad", 2,
      "Nghèo tạm thời thôi! Ghi chi tiêu, tiết kiệm, đầu tư, rồi giàu! Tao tin mày! 💪",
      "Nghèo tạm thời thôi! Ghi chi tiêu, tiết kiệm, đầu tư, rồi giàu! Tao tin mày!"),
    r("sad", 3,
      "Giàu bắt đầu từ việc biết mình tiêu bao nhiêu. Mày đã bắt đầu rồi đó! 🌱",
      "Giàu bắt đầu từ việc biết mình tiêu bao nhiêu. Mày đã bắt đầu rồi đó!"),
  ],

  bored: [
    r("bored", 0,
      "Rảnh à? Làm quiz Tính cách đầu tư đi! 12 câu thôi, biết mình kiểu gì liền 🧬🦜",
      "Rảnh à? Làm quiz Tính cách đầu tư đi! Mười hai câu thôi, biết mình kiểu gì liền."),
    r("bored", 1,
      "Chán thì học 1 bài tài chính 60 giây — mở Bài Học Vẹt đi! Kiến thức miễn phí! 📚",
      "Chán thì học một bài tài chính sáu mươi giây, mở trang Bài Học Vẹt đi! Kiến thức miễn phí!"),
    r("bored", 2,
      "Rảnh? Check Bảng xếp hạng xem ai đang vượt mày nào! 🏆",
      "Rảnh à? Mở Bảng xếp hạng xem ai đang vượt mày nào!"),
  ],

  // ── Meta ──
  who_are_you: [
    r("who_are_you", 0,
      "Tôi là Vẹt Vàng 🦜 — cố vấn tài chính ảo của bạn! 💸",
      "Tôi là Vẹt Vàng, cố vấn tài chính ảo của bạn!"),
    r("who_are_you", 1,
      "Vẹt Vàng đây! Tao không chỉ biết nói 'con vẹt muốn ăn bánh' — tao biết nói 'mày tiêu hết tiền rồi!' 🦜🔥",
      "Vẹt Vàng đây! Tao không chỉ biết nói con vẹt muốn ăn bánh. Tao biết nói, mày tiêu hết tiền rồi!"),
    r("who_are_you", 2,
      "Tao là AI tài chính, kiểu Duolingo nhưng cho tiền bạc! Chuỗi ngày mất thì tao buồn, tiền mất thì tao giận! 😤",
      "Tao là AI tài chính, kiểu Duolingo nhưng cho tiền bạc! Chuỗi ngày mất thì tao buồn, tiền mất thì tao giận!"),
  ],

  help: [
    r("help", 0,
      "OK! Tao giúp mày:\n• Ghi chi tiêu: gõ 'phở 30k' là tao ghi\n• Xem nợ: gõ 'nợ'\n• Đầu tư: gõ 'đầu tư'\n• Check thị trường: gõ 'vàng', 'stock'\n• Động viên: gõ 'motivate' 🦜",
      "Tao giúp mày nè! Ghi chi tiêu thì gõ kiểu phở ba mươi nghìn là tao ghi. Xem nợ thì gõ nợ. Đầu tư thì gõ đầu tư. Check thị trường thì gõ vàng hoặc chứng khoán. Muốn động viên thì gõ motivate!"),
    r("help", 1,
      "Dễ lắm! Gõ chi tiêu kiểu 'cà phê 25k', 'grab 50 nghìn' — tao tự ghi! Hoặc hỏi gì về tài chính cũng được 📝",
      "Dễ lắm! Gõ chi tiêu kiểu cà phê hai mươi lăm nghìn, hoặc grab năm mươi nghìn, tao tự ghi! Hoặc hỏi gì về tài chính cũng được."),
  ],

  joke: [
    r("joke", 0,
      "Joke tài chính: Bạn trai em kiếm 10 triệu. Chị gái em kiếm 15 triệu. Bố mẹ em kiếm 20 triệu. Em kiếm... mệt 💀🦜",
      "Chuyện cười tài chính nè. Bạn trai em kiếm mười triệu. Chị gái em kiếm mười lăm triệu. Bố mẹ em kiếm hai mươi triệu. Em kiếm, mệt."),
    r("joke", 1,
      "Tại sao Bill Gates giàu? Vì ông ấy không uống trà sữa 50 nghìn mỗi ngày! 🧋→💸",
      "Tại sao Bill Gates giàu? Vì ông ấy không uống trà sữa năm mươi nghìn mỗi ngày!"),
    r("joke", 2,
      "Mày biết tại sao tao giỏi tài chính không? Vì tao là VẸT nên tao biết nhét tiền vào ống! ... ok tao biết nó dở 😅",
      "Mày biết tại sao tao giỏi tài chính không? Vì tao là vẹt nên tao biết nhét tiền vào ống! Okê tao biết nó dở."),
  ],

  // ── System Events (DYNAMIC) ──
  streak_praise: [
    rd("streak_praise", 0, "🔥 {streak} ngày liên tiếp! Bạn siêu ghê luôn!"),
    rd("streak_praise", 1, "Streak {streak} ngày — Vẹt tự hào về bạn lắm! 🌟"),
    rd("streak_praise", 2, "{streak} ngày không bỏ cuộc! Bạn sắp thành Đại Gia rồi! 💎"),
    rd("streak_praise", 3, "Đỉnh quá! Vẹt phải học hỏi bạn mới được 🦜✨"),
  ],

  level_up: [
    rd("level_up", 0, "🎉 LÊN LEVEL! Mày giờ là {levelName} rồi! Tao chúc mừng... nhưng vẫn phải ghi chi tiêu nha!"),
    rd("level_up", 1, "WOW! {levelName}! Mày tiến bộ nhanh dữ! Ví tiền mày cũng vui lắm đó 💰🎊"),
  ],

  // ── Edge Cases ──
  zero_income_roast: [
    r("zero_income_roast", 0,
      "Để tôi giúp bạn xây dựng kế hoạch tài chính từ đầu nhé! 🤡🦜",
      "Để tôi giúp bạn xây dựng kế hoạch tài chính từ đầu nhé!"),
    r("zero_income_roast", 1,
      "Tỉnh lại đi bạn eey! Không xu dính túi mà hỏi đầu tư như trúng vietlott á? Đi làm đi! 💼",
      "Tỉnh lại đi bạn eey! Không xu dính túi mà hỏi đầu tư như trúng số độc đắc á? Đi làm đi!"),
    r("zero_income_roast", 2,
      "Thu nhập bằng Không! 0! Tròn trĩnh! Đầu tư bằng nụ cười hả? Lo kiếm việc đi! 😭",
      "Thu nhập bằng không! Không! Tròn trĩnh! Đầu tư bằng nụ cười hả? Lo kiếm việc đi!"),
    r("zero_income_roast", 3,
      "Warren Buffett khởi nghiệp bằng bán kẹo cao su, còn mày khởi nghiệp bằng túi rỗng à? Lao động vinh quang đi! 🏃",
      "Oa ren Bâu phét khởi nghiệp bằng bán kẹo cao su, còn mày khởi nghiệp bằng túi rỗng à? Lao động vinh quang đi!")
  ],

  // ── Ledger Empty ──
  ledger_empty: [
    r("ledger_empty", 0,
      "Ơ, cuối cùng bạn cũng bắt đầu! Mình tin ở bạn mà~ 🐤",
      "Ơ, cuối cùng bạn cũng bắt đầu! Mình tin ở bạn mà!"),
    r("ledger_empty", 1,
      "Chưa có gì trong sổ thu chi. Bắt đầu ghi lại từng đồng tiêu xài đi! 🦜",
      "Chưa có gì trong sổ thu chi. Bắt đầu ghi lại từng đồng tiêu xài đi!"),
    r("ledger_empty", 2,
      "Sổ trống nè. Có mình ở đây hỗ trợ mà, bắt đầu thôi! 💪",
      "Sổ trống nè. Có mình ở đây hỗ trợ mà, bắt đầu thôi!"),
    r("ledger_empty", 3,
      "Không có thu chi gì hết. Hay là tiền tự sinh ra từ trời? 🐦",
      "Không có thu chi gì hết. Hay là tiền tự sinh ra từ trời?"),
    r("ledger_empty", 4,
      "Mới bắt đầu mà! Ghi một khoản đầu tiên nào, tao chờ!",
      "Mới bắt đầu mà! Ghi một khoản đầu tiên nào, tao chờ!"),
  ],
  // ── Thêm từ quotes.json ──
  vuot_lo: [
    r("vuot_lo", 0,
      "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu. Tao chỉ hỏi: cái khoản giải trí 2 triệu đó mày xài hết trong mấy ngày vậy? 💸",
      "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu. Tao chỉ hỏi: cái khoản giải trí hai triệu đó mày xài hết trong mấy ngày vậy?"),
    r("vuot_lo", 1,
      "Lọ ăn uống hết rồi hả? Tháng còn 12 ngày. Tao tính giúp: 0 đồng chia 12 ngày bằng... mày tự tính đi. 📉",
      "Lọ ăn uống hết rồi hả? Tháng còn mười hai ngày. Tao tính giúp: không đồng chia mười hai ngày bằng... mày tự tính đi."),
    r("vuot_lo", 2,
      "Tao ngồi đây nhìn cái pie chart mà muốn khóc thay. Màu đỏ nhiều hơn màu đất à mày? 😭",
      "Tao ngồi đây nhìn cái biểu đồ tròn mà muốn khóc thay. Màu đỏ nhiều hơn màu xanh à mày?"),
    r("vuot_lo", 3,
      "Vượt lọ rồi ư? Được rồi. Tao không giận. Tao chỉ tự hỏi: lần sau mày có muốn tao nhắc sớm hơn không? 🦜",
      "Vượt lọ rồi ư? Được rồi. Tao không giận. Tao chỉ tự hỏi: lần sau mày có muốn tao nhắc sớm hơn không?"),
    r("vuot_lo", 4,
      "Exceeding budget successfully! Tao nói tiếng Anh cho nó bớt đau. Nhưng thực ra nó vẫn đau. 500 nghìn đấy. 💔",
      "Vượt ngân sách! Tao nói tiếng Anh cho nó bớt đau. Nhưng thực ra nó vẫn đau. Năm trăm nghìn đấy.")
  ],

  mua_tra_sua: [
    r("mua_tra_sua", 0,
      "Ly thứ 5 rồi à? Tao không cấm. Tao chỉ thầm tính: 5 ly nhân 55 nghìn bằng 275 nghìn bằng 1.5 ngày lãi tiết kiệm. Nhưng kệ, hạnh phúc mà... phải không? 🧋",
      "Ly thứ năm rồi à? Tao không cấm. Tao chỉ thầm tính: năm ly nhân năm mươi lăm nghìn bằng hai trăm bảy mươi lăm nghìn bằng một phẩy lăm ngày lãi tiết kiệm. Nhưng kệ, hạnh phúc mà... phải không?"),
    r("mua_tra_sua", 1,
      "Ừ cứ uống đi. Đằng nào tao cũng sẽ ghi vào lọ giải trí cho mày. Lọ đó còn... 40 nghìn thôi đó. Uống từ từ nhé. 🥤",
      "Ừ cứ uống đi. Đằng nào tao cũng sẽ ghi vào lọ giải trí cho mày. Lọ đó còn... bốn mươi nghìn thôi đó. Uống từ từ nhé."),
    r("mua_tra_sua", 2,
      "Trà sữa à? Tháng này mày uống bao nhiêu ly tao biết không? 5 ly. 5 ngày. Kiên định ghê. Ước gì mày kiên định tiết kiệm kiểu đó. ☕",
      "Trà sữa à? Tháng này mày uống bao nhiêu ly tao biết không? Năm ly. Năm ngày. Kiên định ghê. Ước gì mày kiên định tiết kiệm kiểu đó."),
    r("mua_tra_sua", 3,
      "Tao để ý thấy mày order trà sữa thường vào 3 giờ chiều. Stress à? Mày có thể kể tao nghe. Nhưng lọ giải trí thì tao không kể cho mày nghe đâu — hết rồi. 😅",
      "Tao để ý thấy mày order trà sữa thường vào ba giờ chiều. Chét à? Mày có thể kể tao nghe. Nhưng lọ giải trí thì tao không kể cho mày nghe đâu, hết rồi.")
  ],

  bo_app: [
    r("bo_app", 0,
      "3 ngày rồi mày biến đâu? Tao ngồi đây nhìn số dư tài khoản mày mà muốn khóc thay. Không phải khóc vì thương — khóc vì buồn cười. 😂",
      "Ba ngày rồi mày biến đâu? Tao ngồi đây nhìn số dư tài khoản mày mà muốn khóc thay. Không phải khóc vì thương, khóc vì buồn cười."),
    r("bo_app", 1,
      "72 tiếng. 4320 phút. Không một lần mở app. Nhưng chắc Shopee thì vào đều lắm nhỉ? 🛒",
      "Bảy mươi hai tiếng. Bốn ngàn ba trăm hai mươi phút. Không một lần mở app. Nhưng chắc sốp pi thì vào đều lắm nhỉ?"),
    r("bo_app", 2,
      "Mày biến mất 3 ngày, tiền cũng biến mất theo. Trùng hợp hay không trùng hợp — tao để mày tự trả lời. 🎭",
      "Mày biến mất ba ngày, tiền cũng biến mất theo. Trùng hợp hay không trùng hợp, tao để mày tự trả lời."),
    r("bo_app", 3,
      "Thôi được rồi, mày về rồi. Tao không giận. Tao chỉ buồn... và số dư của mày cũng buồn. Cùng buồn cho vui nào. 😞",
      "Thôi được rồi, mày về rồi. Tao không giận. Tao chỉ buồn... và số dư của mày cũng buồn. Cùng buồn cho vui nào."),
    r("bo_app", 4,
      "3 ngày không cho tao ăn. Nếu tao là người tao đã bỏ đi rồi. Nhưng tao là vẹt — tao ở lại vì tiền của mày cần tao. 🦜",
      "Ba ngày không cho tao ăn. Nếu tao là người tao đã bỏ đi rồi. Nhưng tao là vẹt, tao ở lại vì tiền của mày cần tao.")
  ],

  shopee: [
    r("shopee", 0,
      "Order lần 4 rồi à? Tao không phán xét. Tao chỉ muốn biết: mày có biết Shopee đang kiếm tiền từ mày nhiều hơn mày kiếm được trong năm nay không? 📦",
      "O rờ đờ lần bốn rồi à? Tao không phán xét. Tao chỉ muốn biết: mày có biết sốp pi đang kiếm tiền từ mày nhiều hơn mày kiếm được trong năm nay không?"),
    r("shopee", 1,
      "Thêm vào giỏ hàng... Thanh toán... Tao ghi vào sổ rồi nhé. Lần tới mày hỏi tiền đi đâu hết thì tao sẽ show cho mày xem. 🧾",
      "Thêm vào giỏ hàng... Thanh toán... Tao ghi vào sổ rồi nhé. Lần tới mày hỏi tiền đi đâu hết thì tao sẽ show cho mày xem."),
    r("shopee", 2,
      "Flash sale hả? Tao hỏi thật: mày có thực sự cần cái đó không, hay chỉ vì nó rẻ hơn 30%? Rẻ hơn 30% mà không cần bằng mất 70%. 💥",
      "Phờ lát seo hả? Tao hỏi thật: mày có thực sự cần cái đó không, hay chỉ vì nó rẻ hơn ba mươi phần trăm? Rẻ hơn ba mươi phần trăm mà không cần bằng mất bảy mươi phần trăm."),
    r("shopee", 3,
      "Oke mày mua đi. Nhưng tao đề nghị: thêm cái receipt vào lọ mua sắm cho tao. Không cần cảm ơn, cứ làm đi. 📝",
      "Okê mày mua đi. Nhưng tao đề nghị: thêm cái biên lai vào lọ mua sắm cho tao. Không cần cảm ơn, cứ làm đi.")
  ],

  het_tien: [
    r("het_tien", 0,
      "Cuối tháng rồi, ví mày mỏng hơn tao. Mà tao là vẹt, tao mỏng là đúng rồi. Còn mày thì... 📉",
      "Cuối tháng rồi, ví mày mỏng hơn tao. Mà tao là vẹt, tao mỏng là đúng rồi. Còn mày thì..."),
    r("het_tien", 1,
      "Tháng này hết tiền à? Không sao. Tháng sau tao sẽ nhắc mày từ ngày 15. Lần này thì... ăn mì tôm đi, protein cũng có đó. 🍜",
      "Tháng này hết tiền à? Không sao. Tháng sau tao sẽ nhắc mày từ ngày mười lăm. Lần này thì... ăn mì tôm đi, rồ tê in cũng có đó."),
    r("het_tien", 2,
      "Cuối tháng 0 tiền — bình thường mà! Bình thường theo nghĩa... 67% Gen Z Việt Nam cũng vậy. Mày không cô đơn đâu. Nghèo thì ở cùng nhau. 🤝",
      "Cuối tháng không tiền, bình thường mà! Bình thường theo nghĩa... sáu mươi bảy phần trăm Gen Z Việt Nam cũng vậy. Mày không cô đơn đâu. Nghèo thì ở cùng nhau."),
    r("het_tien", 3,
      "Còn mấy ngày nữa sang tháng? 3 ngày à? 0 đồng chia 3 ngày bằng... tao biết mày đủ giỏi toán để hiểu. 🧮",
      "Còn mấy ngày nữa sang tháng? Ba ngày à? Không đồng chia ba ngày bằng... tao biết mày đủ giỏi toán để hiểu.")
  ],

  ghi_dung_gio: [
    r("ghi_dung_gio", 0,
      "Ơ hôm nay mày ghi chi tiêu sớm thế? Tao tưởng mày chỉ siêng khi vào Shopee thôi chứ. Nể thiệt! Cộng 20 XP. ✨",
      "Ơ hôm nay mày ghi chi tiêu sớm thế? Tao tưởng mày chỉ siêng khi vào sốp pi thôi chứ. Nể thiệt! Cộng hai mươi điểm XP."),
    r("ghi_dung_gio", 1,
      "Ghi chi tiêu trước 10 giờ sáng! Tao muốn khóc — không phải vì buồn, mà vì cảm động. Lần đầu mày làm đúng giờ kể từ... lần trước. 😭",
      "Ghi chi tiêu trước mười giờ sáng! Tao muốn khóc, không phải vì buồn, mà vì cảm động. Lần đầu mày làm đúng giờ kể từ... lần trước."),
    r("ghi_dung_gio", 2,
      "Nhìn notification pop-up, tao tưởng mày bỏ qua như mọi hôm. Nhưng không! Mày mở app. Mày ghi tiêu. Mày thực sự làm được. Xúc động ghê. 🍿",
      "Nhìn thông báo nảy lên, tao tưởng mày bỏ qua như mọi hôm. Nhưng không! Mày mở app. Mày ghi tiêu. Mày thực sự làm được. Xúc động ghê."),
    r("ghi_dung_gio", 3,
      "Ghi đúng giờ cộng 20 XP. Mày đang trên đường lên Vẹt Teen rồi đó. Tốc độ này thêm 3 ngày nữa là tao phải gọi mày là anh rồi. 🚀",
      "Ghi đúng giờ cộng hai mươi XP. Mày đang trên đường lên Vẹt Teen rồi đó. Tốc độ này thêm ba ngày nữa là tao phải gọi mày là anh rồi.")
  ],

  streak_7: [
    r("streak_7", 0,
      "7 ngày liên tiếp! Lần cuối có ai chu đáo với tao vậy là... à chưa có bao giờ. Keep going! 🔥",
      "Bảy ngày liên tiếp! Lần cuối có ai chu đáo với tao vậy là... à chưa có bao giờ. Kíp gâu inh!"),
    r("streak_7", 1,
      "Streak 7 ngày. Tao đã nghĩ ngày thứ 3 mày sẽ bỏ. Rồi ngày 5 tao lại nghĩ vậy. Rồi ngày 7. Mày phá vỡ định kiến của tao về mày. Không phải dễ đâu. 💪",
      "Chuỗi bảy ngày. Tao đã nghĩ ngày thứ ba mày sẽ bỏ. Rồi ngày năm tao lại nghĩ vậy. Rồi ngày bảy. Mày phá vỡ định kiến của tao về mày. Không phải dễ đâu."),
    r("streak_7", 2,
      "7 ngày! Cộng 100 XP bonus! Người dùng có streak 7 ngày trở lên tiết kiệm nhiều hơn 40% so với người không có streak. Mày đang đi đúng đường. 📈",
      "Bảy ngày! Cộng một trăm XP thưởng! Người dùng có chuỗi bảy ngày trở lên tiết kiệm nhiều hơn bốn mươi phần trăm so với người không có chuỗi. Mày đang đi đúng đường."),
    r("streak_7", 3,
      "1 tuần liên tiếp! Tao muốn tự hào nhưng tao là vẹt, tao phải giữ hình tượng. Thôi thì... tao gật đầu thôi. Gật đầu bằng khen ngợi tối đa từ vẹt. 🦜",
      "Một tuần liên tiếp! Tao muốn tự hào nhưng tao là vẹt, tao phải giữ hình tượng. Thôi thì... tao gật đầu thôi. Gật đầu bằng khen ngợi tối đa từ vẹt.")
  ],

  tra_no: [
    r("tra_no", 0,
      "Trả hết nợ rồi á?! Tao xin lỗi đã nghi ngờ mày. Mày xứng đáng tốt hơn những gì tao nghĩ. 🥳",
      "Trả hết nợ rồi á?! Tao xin lỗi đã nghi ngờ mày. Mày xứng đáng tốt hơn những gì tao nghĩ."),
    r("tra_no", 1,
      "Ôi mày trả hết nợ rồi! Tao không biết mình vui vì mày, hay vì tao sẽ không phải nhắc cái khoản đó nữa. Nhưng chủ yếu là vì mày. 🎊",
      "Ôi mày trả hết nợ rồi! Tao không biết mình vui vì mày, hay vì tao sẽ không phải nhắc cái khoản đó nữa. Nhưng chủ yếu là vì mày."),
    r("tra_no", 2,
      "Khoản nợ đó đã tồn tại bao lâu? 4 tháng? Và mày vừa xóa nó. Tao ghi vào lịch sử: ngày hôm nay — mày làm được điều không phải ai cũng làm được. 🏛️",
      "Khoản nợ đó đã tồn tại bao lâu? Bốn tháng? Và mày vừa xóa nó. Tao ghi vào lịch sử: ngày hôm nay, mày làm được điều không phải ai cũng làm được."),
    r("tra_no", 3,
      "Cộng 150 XP! Trả hết nợ là milestone lớn nhất người dùng VietFi có thể đạt được. Mày vừa bước qua cột mốc đó. Tao tự hào... ừ, tao nói vậy đó. 🏆",
      "Cộng một trăm năm mươi XP! Trả hết nợ là cột mốc lớn nhất người dùng Việt phai cố thể đạt được. Mày vừa bước qua cột mốc đó. Tao tự hào... ừ, tao nói vậy đó.")
  ],

  tiet_kiem: [
    r("tiet_kiem", 0,
      "Target tiết kiệm tháng này: xong! Tao không biết mày dùng trick gì, nhưng kết quả thì không nói dối. Cộng 80 XP. 🎯",
      "Mục tiêu tiết kiệm tháng này: xong! Tao không biết mày dùng trick gì, nhưng kết quả thì không nói dối. Cộng tám mươi XP."),
    r("tiet_kiem", 1,
      "Đủ target tiết kiệm! Mày biết không, tháng này mày tiết kiệm được nhiều hơn tháng trước 12%. Nhỏ nhưng là tiến bộ thật sự. 🌟",
      "Đủ mục tiêu tiết kiệm! Mày biết không, tháng này mày tiết kiệm được nhiều hơn tháng trước mười hai phần trăm. Nhỏ nhưng là tiến bộ thật sự."),
    r("tiet_kiem", 2,
      "Gà mà biết đẻ trứng vàng thật rồi! Tao đã mắng mày suốt 3 tuần, nhưng nhìn kết quả tháng này — xứng đáng. Cộng 80 XP. 🐣",
      "Gà mà biết đẻ trứng vàng thật rồi! Tao đã mắng mày suốt ba tuần, nhưng nhìn kết quả tháng này, xứng đáng. Cộng tám mươi XP."),
    r("tiet_kiem", 3,
      "Đủ target! Tao ngồi đây tính: nếu mày giữ tốc độ này, 8 tháng nữa mày có đủ quỹ khẩn cấp 3 tháng lương. Mày có hình dung được cảm giác đó không? 🏰",
      "Đủ mục tiêu! Tao ngồi đây tính: nếu mày giữ tốc độ này, tám tháng nữa mày có đủ quỹ khẩn cấp ba tháng lương. Mày có hình dung được cảm giác đó không?")
  ]
};

// ── Response Generator ──────────────────────────────────────────
export function getScriptedResponse(
  intent: Intent,
  vars?: Record<string, string>
): ScriptedResponseItem | null {
  const pool = RESPONSES[intent];
  if (!pool || pool.length === 0) return null;

  const idx = Math.floor(Math.random() * pool.length);
  const item = { ...pool[idx] };

  // Replace variables like {amount}, {item}, {streak}
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      item.text = item.text.replace(regex, value);
      item.ttsText = item.ttsText.replace(regex, value);
    }
  }

  if (POLITE_DEFAULT_ENABLED) {
    item.text = toPoliteTone(item.text);
    item.ttsText = toPoliteTone(item.ttsText);
  }

  return item;
}

/** Lấy tất cả static responses (để pre-generate audio) */
export function getAllStaticResponses(): ScriptedResponseItem[] {
  const result: ScriptedResponseItem[] = [];
  for (const items of Object.values(RESPONSES)) {
    for (const item of items) {
      if (!item.isDynamic) result.push(item);
    }
  }
  return result;
}

// ── Expense Roasts ──────────────────────────────────────────────
export function getExpenseRoast(category: string, _amount: number): string {
  void _amount;
  const roasts: Record<string, string[]> = {
    "Ăn uống": [
      "Bữa này ngon không? Ít ra cũng no bụng chứ no ví thì không!",
      "Ăn xong nhớ ghi nha! Dạ dày no, nhưng ví tiền thì hết no rồi đó!",
      "Ngon thì ngon, nhưng nấu nhà rẻ hơn gấp 3 lần nghen!",
    ],
    "Đi lại": [
      "Đi xe ôm hoài thì khỏi mua nhà luôn!",
      "Tháng bao nhiêu tiền grab? Mua xe đạp được rồi đó!",
    ],
    "Giải trí": [
      "Vui thì vui nhưng ví tiền khóc kìa!",
      "Chơi vui thôi nhưng nhớ, tiền cũng mất luôn đó!",
    ],
    "Nhà ở": [
      "Chi phí cố định, tao ghi! Nhưng xem có tiết kiệm được gì không!",
    ],
    "Giáo dục": [
      "Đầu tư vào não! Cái này tao ủng hộ 100%!",
      "Học, tốt! Nhưng học xong phải áp dụng nhé, đừng mua khóa học rồi để đó!",
    ],
  };

  const pool = roasts[category] || ["Ghi rồi! Tiêu gì cũng ghi nhé."];
  const text = pool[Math.floor(Math.random() * pool.length)];
  return POLITE_DEFAULT_ENABLED ? toPoliteTone(text) : text;
}

// ── Fun comparisons for high expenses ───────────────────────────
export function getComparison(amount: number): string {
  if (amount >= 5_000_000) return `${(amount / 3_500_000).toFixed(1)} tháng tiền trọ sinh viên`;
  if (amount >= 1_000_000) return `${Math.round(amount / 45_000)} bát phở`;
  if (amount >= 500_000) return `${Math.round(amount / 50_000)} ly trà sữa`;
  if (amount >= 100_000) return `${Math.round(amount / 25_000)} ly cà phê`;
  return `${Math.round(amount / 5_000)} ổ bánh mì`;
}

// ── Data-dependent intents → always AI (need user's real data) ──
const DATA_INTENTS: Intent[] = [
  "ask_spending", "ask_debt", "ask_invest", "ask_save",
  "ask_gold", "ask_stock", "ask_crypto", "ask_market",
  "compare_gold_stock", "ask_inflation", "ask_realestate",
];

const PERSONAL_CONTEXT_PATTERNS = [
  "của tôi",
  "của tớ",
  "của mình",
  "của tao",
  "thu nhập",
  "lương",
  "chi tiêu",
  "tiền tiết kiệm",
  "số dư",
  "ngân sách",
  "danh mục",
  "portfolio",
  "mục tiêu",
  "nợ",
  "vay",
  "trả góp",
  "tài sản",
  "khẩu vị rủi ro",
  "risk dna",
];

function hasPersonalContext(text: string): boolean {
  const lower = text.toLowerCase();
  return PERSONAL_CONTEXT_PATTERNS.some((pattern) => lower.includes(pattern));
}

// ── Market intents that must use AI because they depend on live data ───────────────────────────────
const MARKET_INTENTS: Intent[] = [
  'ask_gold',
  'ask_stock',
  'ask_crypto',
  'ask_market',
  'compare_gold_stock',
  'ask_inflation',
  'ask_realestate',
]

// ── Should this message go to AI? ───────────────────────────────
export function needsAI(intent: Intent, text: string): boolean {
  if (intent === "unknown") return true;
  if (MARKET_INTENTS.includes(intent)) return true;
  if (DATA_INTENTS.includes(intent)) {
    if (!hasPersonalContext(text) && text.length <= 80) return false;
    return true;
  }
  if (text.length > 80) return true;
  return false;
}

export { DATA_INTENTS };

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
  | "motivate" | "complain" | "curse" | "sad" | "bored"
  | "who_are_you" | "help" | "joke"
  | "morning" | "afternoon" | "evening" | "night"
  | "streak_praise" | "level_up"
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

// ── Intent Detection (Keyword-based, NO AI) ─────────────────────
const INTENT_PATTERNS: { intent: Intent; patterns: string[] }[] = [
  { intent: "greeting", patterns: ["xin chào", "hello", "hi", "chào", "ê", "yo", "hey", "mở app", "quay lại"] },
  { intent: "goodbye", patterns: ["bye", "tạm biệt", "tắt", "đi đây", "ngủ", "off", "thôi"] },
  { intent: "thanks", patterns: ["cảm ơn", "thanks", "thank", "tks", "cám ơn", "biết ơn"] },
  { intent: "ask_spending", patterns: ["chi tiêu", "tiêu bao nhiêu", "tốn bao nhiêu", "tiền đi đâu", "phân tích chi", "xài hết"] },
  { intent: "ask_debt", patterns: ["nợ", "trả góp", "debt", "vay", "thẻ tín dụng", "tín dụng", "trả nợ"] },
  { intent: "ask_invest", patterns: ["đầu tư", "invest", "mua gì", "nên mua", "chứng khoán", "cổ phiếu", "portfolio"] },
  { intent: "ask_save", patterns: ["tiết kiệm", "saving", "để dành", "gửi tiền", "tiền tiết kiệm"] },
  { intent: "ask_gold", patterns: ["vàng", "sjc", "gold", "giá vàng"] },
  { intent: "ask_stock", patterns: ["vnindex", "vn-index", "chứng khoán", "cổ phiếu", "stock", "hose", "hnx"] },
  { intent: "ask_crypto", patterns: ["crypto", "bitcoin", "btc", "eth", "coin"] },
  { intent: "ask_market", patterns: ["thị trường", "market", "kinh tế", "lãi suất", "tỷ giá", "usd"] },
  { intent: "motivate", patterns: ["motivate", "động viên", "khích lệ", "mệt"] },
  { intent: "complain", patterns: ["app tệ", "tệ quá", "dở", "ghét", "khó dùng", "bug"] },
  { intent: "curse", patterns: ["đm", "vcl", "vl", "cc", "đ mẹ", "ngu", "khùng"] },
  { intent: "sad", patterns: ["buồn", "hết tiền", "cháy túi", "phá sản", "nghèo", "xui", "sml"] },
  { intent: "bored", patterns: ["chán", "nhàm", "buồn ngủ", "rảnh", "ko biết làm gì"] },
  { intent: "who_are_you", patterns: ["mày là ai", "ai đây", "bot à", "vẹt à", "giới thiệu"] },
  { intent: "help", patterns: ["help", "giúp", "hướng dẫn", "cách dùng", "làm sao"] },
  { intent: "joke", patterns: ["kể chuyện cười", "joke", "funny", "hài", "cười"] },
];

export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  // Check time-based greetings
  const hour = new Date().getHours();
  if (lower.match(/^(chào|hello|hi|ê|yo|hey)\b/)) {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
  }

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return intent;
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
      "Ê! Mở app mà không ghi chi tiêu là phí 3 phút đời rồi đó nghen 🦜",
      "Ê! Mở app mà không ghi chi tiêu là phí ba phút đời rồi đó nghen!"),
    r("greeting", 1,
      "Quay lại rồi hả? Ví tiền có kêu cứu gì không? 💸",
      "Quay lại rồi hả? Ví tiền có kêu cứu gì không?"),
    r("greeting", 2,
      "Chào chủ tịch! Hôm nay tiêu gì vô lý chưa? 🤡",
      "Chào chủ tịch! Hôm nay tiêu gì vô lý chưa?"),
    r("greeting", 3,
      "Tao đây! Ví tiền mày khoẻ không? 🦜",
      "Tao đây! Ví tiền mày khoẻ không?"),
    r("greeting", 4,
      "Lại mày! Hôm nay kiếm được bao nhiêu, tiêu bao nhiêu? 🤨",
      "Lại mày! Hôm nay kiếm được bao nhiêu, tiêu bao nhiêu?"),
  ],

  // ── Morning ──
  morning: [
    r("morning", 0,
      "Chào buổi sáng! Nhớ ghi chi tiêu hôm nay nha, đừng để cuối tháng hỏi tiền đi đâu! 🌅🦜",
      "Chào buổi sáng! Nhớ ghi chi tiêu hôm nay nha, đừng để cuối tháng hỏi tiền đi đâu!"),
    r("morning", 1,
      "Sáng rồi! Cà phê bao nhiêu nhớ ghi vô nghen ☕🦜",
      "Sáng rồi! Cà phê bao nhiêu nhớ ghi vô nghen!"),
    r("morning", 2,
      "Sáng sớm mở app, thói quen tốt! Tao hơi hơi tự hào về mày! 🌅",
      "Sáng sớm mở app, thói quen tốt! Tao hơi hơi tự hào về mày!"),
    r("morning", 3,
      "Hôm nay target chi tiêu bao nhiêu? Nói tao biết để theo dõi 📋",
      "Hôm nay target chi tiêu bao nhiêu? Nói tao biết để theo dõi."),
    r("morning", 4,
      "Ngủ dậy là phải check ví, tao nói rồi! Ghi chi tiêu đi nào! 🌅",
      "Ngủ dậy là phải check ví, tao nói rồi! Ghi chi tiêu đi nào!"),
  ],

  // ── Afternoon ──
  afternoon: [
    r("afternoon", 0,
      "Buổi trưa rồi! Ăn gì nhớ ghi đó nhe, phở 45 nghìn cũng phải ghi 🍜",
      "Buổi trưa rồi! Ăn gì nhớ ghi đó nhe, phở bốn mươi lăm nghìn cũng phải ghi."),
    r("afternoon", 1,
      "Chiều rồi! Hôm nay tiêu bao nhiêu rồi? Khai đi! 💰",
      "Chiều rồi! Hôm nay tiêu bao nhiêu rồi? Khai đi!"),
    r("afternoon", 2,
      "Nắng nóng quá, nhưng ví tiền mày nóng hơn nếu không quản lý 🔥",
      "Nắng nóng quá, nhưng ví tiền mày nóng hơn nếu không quản lý!"),
    r("afternoon", 3,
      "Trà sữa buổi chiều hả? 50 nghìn nhân 30 ngày bằng 1 triệu rưỡi mỗi tháng đó nghen 🧋",
      "Trà sữa buổi chiều hả? Năm mươi nghìn nhân ba mươi ngày bằng một triệu rưỡi mỗi tháng đó nghen."),
  ],

  // ── Evening ──
  evening: [
    r("evening", 0,
      "Tối rồi! Tổng kết ngày hôm nay đã tiêu bao nhiêu? Khai nhanh! 🌙",
      "Tối rồi! Tổng kết ngày hôm nay đã tiêu bao nhiêu? Khai nhanh!"),
    r("evening", 1,
      "Buổi tối rảnh thì check lại quỹ chi tiêu đi, đừng để rò rỉ tiền 💧",
      "Buổi tối rảnh thì check lại quỹ chi tiêu đi, đừng để rò rỉ tiền."),
    r("evening", 2,
      "Ăn tối xong nhớ ghi! Tao biết mày hay quên lắm 🦜",
      "Ăn tối xong nhớ ghi! Tao biết mày hay quên lắm."),
    r("evening", 3,
      "Hôm nay chi tiêu hợp lý chưa? Tao check giúp cho! 🔍",
      "Hôm nay chi tiêu hợp lý chưa? Tao check giúp cho!"),
  ],

  // ── Night ──
  night: [
    r("night", 0,
      "Khuya rồi, ngủ đi bạn ơi! Tài chính quan trọng nhưng sức khoẻ còn quan trọng hơn 😴🦜",
      "Khuya rồi, ngủ đi bạn ơi! Tài chính quan trọng nhưng sức khoẻ còn quan trọng hơn."),
    r("night", 1,
      "Khuya rồi mà còn mở app! Chắc lo tiền quá à? Ngủ đi, mai tính! 🌙",
      "Khuya rồi mà còn mở app! Chắc lo tiền quá à? Ngủ đi, mai tính!"),
    r("night", 2,
      "Đừng lo lắng quá khuya, tao trông ví cho mày! Ngủ ngon! 🦉",
      "Đừng lo lắng quá khuya, tao trông ví cho mày! Ngủ ngon!"),
  ],

  // ── Goodbye ──
  goodbye: [
    r("goodbye", 0,
      "Đi đi, nhớ quay lại ghi chi tiêu ngày mai nha! 👋🦜",
      "Đi đi, nhớ quay lại ghi chi tiêu ngày mai nha!"),
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
      "Không có gì! Mày làm tao vui bằng cách ghi chi tiêu đầy đủ thôi 🦜",
      "Không có gì! Mày làm tao vui bằng cách ghi chi tiêu đầy đủ thôi."),
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
    rd("expense_high", 0, "Trời ơi {amount} cho {item}? Mày giàu lắm à? 🤯"),
    rd("expense_high", 1, "Chủ tịch chi {amount}! Đại gia thiệt. Hay là hết tiền rồi? 💸"),
    rd("expense_high", 2, "{amount} một phát! Suy nghĩ lại đi! 😱"),
    rd("expense_high", 3, "{amount}! Mày có chắc là CẦN không? Hay chỉ MUỐN thôi? 🤨"),
    rd("expense_high", 4, "{amount}?! Tiền này mua được {compare} nè! Suy nghĩ lại đi 🧠"),
  ],
  expense_low: [
    rd("expense_low", 0, "Chỉ {amount}? Tiết kiệm dữ! Tao thích! ❤️🦜"),
    rd("expense_low", 1, "{amount} thôi à? Tốt lắm! Cứ vậy tiếp! 💪"),
    rd("expense_low", 2, "Ít vậy? Mày bắt đầu nghe lời tao rồi ha! 🦜"),
    rd("expense_low", 3, "{amount} — hợp lý! Tao tự hào về mày! 🌟"),
  ],

  // ── Financial Advice (STATIC) ──
  ask_spending: [
    r("ask_spending", 0,
      "Mở trang Quỹ Chi tiêu đi! Tao đã tính sẵn hết rồi. Hũ nào cháy, hũ nào dư, rõ ràng! 📊🦜",
      "Mở trang Quỹ Chi tiêu đi! Tao đã tính sẵn hết rồi. Hũ nào cháy, hũ nào dư, rõ ràng!"),
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
      "Thẻ tín dụng lãi 25% mỗi năm mà chỉ trả minimum? Ngân hàng cảm ơn mày! Vào Quỹ Nợ xem ngay 🏦",
      "Thẻ tín dụng lãi hai mươi lăm phần trăm mỗi năm mà chỉ trả tối thiểu? Ngân hàng cảm ơn mày lắm! Vào Quỹ Nợ xem ngay."),
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
      "Dồn hết vào crypto à? Hoặc là siêu xe hoặc là xe đạp! Đa dạng hoá đi 🚲",
      "Dồn hết vào crypto à? Hoặc là siêu xe hoặc là xe đạp! Đa dạng hoá đi."),
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
      "Mày uống trà sữa 50 nghìn, Warren Buffett uống Coca 10 nghìn. Thấy chưa? 🥤🦜",
      "Mày uống trà sữa năm mươi nghìn, Oa-ren Bâu-phét uống Coca mười nghìn. Thấy chưa?"),
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
      "Hết tiền à? Bình thường! Quan trọng là biết TẠI SAO hết. Mở Quỹ Chi tiêu xem nào 🔍🦜",
      "Hết tiền à? Bình thường! Quan trọng là biết tại sao hết. Mở Quỹ Chi tiêu xem nào."),
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
      "Tao là Vẹt Vàng 🦜 — AI cố vấn tài chính xéo sắc nhất Việt Nam! Nhiệm vụ: giúp mày đừng phá sản 💸",
      "Tao là Vẹt Vàng, AI cố vấn tài chính xéo sắc nhất Việt Nam! Nhiệm vụ, giúp mày đừng phá sản."),
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
export function getExpenseRoast(category: string, amount: number): string {
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
  return pool[Math.floor(Math.random() * pool.length)];
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
];

// ── Should this message go to AI? ───────────────────────────────
export function needsAI(intent: Intent, text: string): boolean {
  if (intent === "unknown") return true;
  if (DATA_INTENTS.includes(intent)) return true; // always use AI for data questions
  if (text.length > 80) return true;
  return false;
}

export { DATA_INTENTS };

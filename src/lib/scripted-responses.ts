/**
 * VietFi Scripted Responses — 100+ kịch bản trả lời KHÔNG CẦN AI
 * ================================================================
 * Chatbot xéo sắc với câu trả lời pre-built theo intent.
 * Chỉ gọi Gemini khi intent = "unknown" hoặc cần phân tích phức tạp.
 *
 * Flow: User input → detectIntent() → getResponse() → nếu null → gọi AI
 */

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
  { intent: "motivate", patterns: ["motivate", "động viên", "khích lệ", "chán", "chán quá", "mệt"] },
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

  // Check intent patterns
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return intent;
    }
  }

  return "unknown";
}

// ── Scripted Responses (100+ câu xéo sắc) ──────────────────────
const RESPONSES: Record<string, string[]> = {
  greeting: [
    "Ê! Mở app mà không ghi chi tiêu là phí 3 phút đời rồi đó nghen 🦜",
    "Quay lại rồi hả? Ví tiền có kêu cứu gì không? 💸",
    "Chào chủ tịch! Hôm nay tiêu gì vô lý chưa? 🤡",
    "Tao đây! Ví tiền mày khoẻ không? 🦜",
    "Lại mày! Hôm nay kiếm được bao nhiêu? Tiêu bao nhiêu? 🤨",
  ],
  morning: [
    "Chào buổi sáng! Nhớ ghi chi tiêu hôm nay nha, đừng để cuối tháng hỏi tiền đi đâu! 🌅🦜",
    "Sáng rồi! Cà phê bao nhiêu nhớ ghi vô nghen 🦜☕",
    "Good morning! Ngủ dậy là phải check ví — tao nói rồi! 🌅",
    "Hôm nay target chi tiêu bao nhiêu? Nói tao biết để theo dõi 📋",
    "Sáng sớm mở app = thói quen tốt! Proud of you... hơi hơi thôi nha 🦜",
  ],
  afternoon: [
    "Buổi trưa rồi! Ăn gì nhớ ghi đó nhe, phở 45k cũng phải ghi 🍜",
    "Chiều rồi! Hôm nay tiêu bao nhiêu rồi? Khai đi! 💰",
    "Nắng nóng quá, nhưng ví tiền mày nóng hơn nếu không quản lý 🔥",
    "Trà sữa buổi chiều hả? 50k × 30 ngày = 1.5 triệu/tháng đó nghen 🧋",
  ],
  evening: [
    "Tối rồi! Tổng kết ngày hôm nay: đã tiêu bao nhiêu? Khai nhanh! 🌙",
    "Buổi tối rảnh thì check lại quỹ chi tiêu đi, đừng để rò rỉ tiền 💧",
    "Ăn tối xong nhớ ghi! Tao biết mày hay quên lắm 🦜",
    "Hôm nay chi tiêu hợp lý chưa? Tao check giúp cho! 🔍",
  ],
  night: [
    "Khuya rồi, ngủ đi bạn ơi! Tài chính quan trọng nhưng sức khoẻ còn quan trọng hơn 😴🦜",
    "Khuya rồi mà còn mở app! Chắc lo tiền quá à? Ngủ đi, mai tính! 🌙",
    "Đừng lo lắng quá khuya, tao trông ví cho mày! 🦉",
  ],
  goodbye: [
    "Đi đi, nhớ quay lại ghi chi tiêu ngày mai nha! 🦜👋",
    "Bye! Nhớ đừng mua cái gì vô lý khi tao không nhìn! 👀",
    "Tạm biệt chủ tịch! Streak đừng mất nghen! 🔥",
    "Đi ngủ đi! Mai nhớ quay lại, tao nhớ mày 🥺... nhớ ví tiền mày thôi 💰",
  ],
  thanks: [
    "Không có gì! Mày làm tao vui bằng cách... ghi chi tiêu đầy đủ thôi 🦜",
    "Đừng cảm ơn, trả ơn bằng cách tiết kiệm hơn đi! 💪",
    "Cảm ơn cái gì! Tao làm nhiệm vụ thôi. Giờ ghi chi tiêu đi! 📝",
  ],

  // ── Expense Responses ──
  expense_logged: [
    "Ghi rồi! {amount} cho {item}. {roast} 🦜",
    "OK ghi vô {category} rồi! {amount} bay mất! 💸",
    "✅ Đã ghi {amount} — {item}. Hôm nay tổng chi: {total} rồi đó! 📊",
    "Được rồi, {amount} cho {item}. Mày kiếm lại bằng cách nào? 🤔",
    "Ghi! {item} — {amount}. Tháng này hũ {pot} còn {remaining} thôi đấy! ⚠️",
  ],
  expense_high: [
    "Trời ơi {amount} cho {item}? Mày giàu lắm à? 🤯",
    "Chủ tịch chi {amount}! Đại gia thứ thiệt! ... hay là hết tiền rồi? 💸",
    "{amount} một phát! Warren Buffett nhìn mà khóc 😱",
    "Wow {amount}! Mày có chắc là CẦN không? Hay chỉ MUỐN? 🤨",
    "BROOO {amount}?! Tiền này mua được {compare} nè! Suy nghĩ lại đi 🧠",
  ],
  expense_low: [
    "Chỉ {amount}? Tiết kiệm dữ! Tao appreciate 🦜❤️",
    "{amount} thôi à? Good job! Cứ vậy tiếp! 💪",
    "Ít vậy? Mày bắt đầu nghe lời tao rồi ha! 🦜",
    "{amount} — hợp lý! Proud of you! 🌟",
  ],

  // ── Financial Advice ──
  ask_spending: [
    "Mở trang Quỹ Chi tiêu đi! Tao đã tính sẵn hết rồi. Hũ nào cháy, hũ nào dư — rõ ràng! 📊🦜",
    "Muốn biết tiền đi đâu? Click vào 'Quỹ Chi tiêu' ở sidebar! Tao đã phân chia hũ cho mày 💰",
    "OK! Để tao check... Mày nên vào Quỹ Chi tiêu để xem biểu đồ chi tiết. Tao phân tích giỏi hơn mày đâu! 🧠",
  ],
  ask_debt: [
    "Nợ à? Vào 'Quỹ Nợ' — tao tính sẵn chi phí ẩn, lãi thực rồi! Cẩn thận kẻo Domino vỡ nợ! 🏦🦜",
    "Thẻ tín dụng lãi 25%/năm mà chỉ trả minimum? Ngân hàng cảm ơn mày! Vào Quỹ Nợ xem đi 🏦",
    "OK, mở Quỹ Nợ ra. Tao có 2 chiến thuật: Avalanche (trả cái lãi cao nhất trước) hoặc Snowball (trả cái nhỏ nhất trước). Chọn đi! ⚔️",
    "DTI 30% rồi đó, cẩn thận kẻo ngân hàng thấy hồ sơ mà chạy 🏃‍♂️",
  ],
  ask_invest: [
    "Mày biết rule đầu tiên không? ĐỪNG đầu tư tiền ăn! Làm quiz Tính cách đầu tư trước đi 🧬🦜",
    "Vào 'Cố vấn danh mục' — tao đề xuất tỷ trọng portfolio dựa trên Risk DNA của mày. Đừng all-in 1 chỗ! 🥧",
    "All-in crypto à? Bold move! Hoặc là lambo hoặc là xe đạp 🚲",
    "Đa dạng hóa danh mục đi! Đừng bỏ trứng 1 rổ. Cơ bản vậy mà! 🥚",
    "Rule 72: lãi suất 8%/năm → tiền gấp đôi sau 9 năm. Lãi 12% → gấp đôi sau 6 năm. Toán cơ bản! 📐",
  ],
  ask_save: [
    "Gửi tiết kiệm 5.2%/năm, lạm phát 3.5%. Lãi thật = 1.7%. Giàu chắc kiếp sau 😅🦜",
    "Tiết kiệm tốt! Nhưng tiền nằm im = mất giá. Xem Cố vấn danh mục tao gợi ý nhé 📈",
    "Rule 50/30/20: 50% thiết yếu, 30% hưởng thụ, 20% tiết kiệm. Mày đang ở đâu? 🤔",
    "Mỗi tháng tiết kiệm 3 triệu, sau 10 năm = 360 triệu (chưa tính lãi). Bắt đầu đi! 💪",
  ],
  ask_gold: [
    "Vàng thì vào 'Nhiệt kế thị trường' check giá SJC hôm nay! Nhớ: vàng là bảo vệ, không phải đầu cơ 🥇🦜",
    "Vàng SJC à? Chênh mua-bán nhiều lắm! Mua miếng lớn lời hơn miếng nhỏ 💰",
    "Giá vàng hôm nay xem ở Dashboard. Nhưng nhớ: đừng FOMO mua đỉnh! 📉",
  ],
  ask_stock: [
    "VN-Index hôm nay thế nào? Mở Dashboard ra! Tao đã có 'Nhiệt kế thị trường' cho mày 📊🦜",
    "Chứng khoán à? Thị trường sợ hãi = cơ hội mua. Nhưng mà... tiền đâu? 🤷",
    "VN30 hay Midcap? Phụ thuộc Risk DNA mày! Làm quiz 'Tính cách đầu tư' trước 🧬",
  ],
  ask_crypto: [
    "Crypto à? Chỉ đầu tư số tiền mày chấp nhận mất 100%! Tao nói thật đó 🦜",
    "Bitcoin? DCA (mua đều mỗi tháng) là chiến thuật an toàn nhất cho newbie 📈",
    "Rule: Crypto max 5-10% portfolio. Đừng ALL IN! 🚨",
  ],
  ask_market: [
    "Thị trường? Mở 'Xu hướng kinh tế' ra, tao có chart GDP, CPI, lãi suất cho mày 📈🦜",
    "Lãi suất huy động đang thấp → tiền rẻ → chứng khoán lên. Nhưng mà theory thôi nha! 🤓",
    "Tỷ giá USD tăng = nhập khẩu đắt hơn = lạm phát tăng. Mua vàng phòng thủ? 🤔",
  ],

  // ── Emotional ──
  motivate: [
    "Mày uống trà sữa 50K, Warren Buffett uống Coca 10K. Thấy chưa? 🥤🦜",
    "Ngày nào cũng 1% tốt hơn. 365 ngày = gấp 37 lần! Cứ bước tiếp đi 🚶‍♂️",
    "Giàu không phải kiếm nhiều, giàu là tiêu ít hơn kiếm. Chấm! ✅",
    "Bill Gates từng nói: 'Tiết kiệm từ lúc chưa giàu, chứ đợi giàu mới tiết kiệm thì hết giàu'. Tao thêm: chưa giàu mà tiêu hoang thì đời đời nghèo 🦜",
    "3 ngày không mở app rồi nha, tiền thì vẫn bay — giỏi thật đấy 🪂",
    "Ghi chi tiêu đi, đừng để cuối tháng hỏi 'tiền đi đâu hết rồi?' 🕵️",
    "Tiền không tự sinh sôi, nhưng nợ thì có! Tao explain: lãi kép NGƯỢC lại = nợ gấp đôi 📈🦜",
  ],
  complain: [
    "Tệ à? Ít ra tao miễn phí, chứ thuê cố vấn tài chính ngoài kia 500k/giờ đó! 🦜",
    "Feedback noted! Nhưng mà... mày đã ghi chi tiêu chưa? Đừng đổi chủ đề! 📝",
    "OK tao ghi nhận. Nhưng cũng đừng quên: tao giúp mày tiết kiệm tiền miễn phí đấy 💸",
  ],
  curse: [
    "Nóng tính dữ! Bình tĩnh rồi vô ghi chi tiêu đi, chửi tao không giúp mày giàu hơn đâu 🦜",
    "Ê ê! Chửi tao xong tiền cũng không tự mọc lên nghen! Ghi chi tiêu đi! 😤",
    "OK... hít thở sâu... rồi... mở Quỹ Chi tiêu ghi đi. Tao không giận đâu 🦜",
  ],
  sad: [
    "Hết tiền à? Bình thường! Quan trọng là biết TẠI SAO hết. Mở Quỹ Chi tiêu xem nào 🔍🦜",
    "Buồn thì buồn, nhưng tiền vẫn phải quản! Tao ở đây giúp mày mà 🦜❤️",
    "Nghèo tạm thời thôi! Ghi chi tiêu → tiết kiệm → đầu tư → giàu! Tao tin mày! 💪",
    "'Giàu' bắt đầu từ việc biết mình tiêu bao nhiêu. Mày đã bắt đầu rồi đó! 🌱",
  ],
  bored: [
    "Rảnh à? Làm quiz 'Tính cách đầu tư' đi! 12 câu thôi, biết mình kiểu gì liền 🧬🦜",
    "Chán thì học 1 bài tài chính 60 giây — tab 'Bài học' đó! Kiến thức miễn phí! 📚",
    "Rảnh? Check Leaderboard xem ai đang vượt mày nào! 🏆",
  ],

  // ── Meta ──
  who_are_you: [
    "Tao là Vẹt Vàng 🦜 — AI cố vấn tài chính xéo sắc nhất Việt Nam! Xưng tao-mày cho thân thiện. Nhiệm vụ: giúp mày đừng... phá sản 💸",
    "Vẹt Vàng đây! Tao không chỉ biết nói 'Polly wants a cracker' — tao biết nói 'Mày tiêu hết tiền rồi!' 🦜🔥",
    "Tao là AI tài chính, dạng Duolingo nhưng cho tiền bạc! Streak mất = tao buồn. Tiền mất = tao giận! 😤",
  ],
  help: [
    "OK! Tao giúp mày:\n• Ghi chi tiêu: gõ 'phở 30k' là tao ghi\n• Xem nợ: gõ 'nợ'\n• Đầu tư: gõ 'đầu tư'\n• Check thị trường: gõ 'vàng', 'stock'\n• Motivate: gõ 'motivate' 🦜",
    "Dễ lắm! Gõ chi tiêu kiểu 'cà phê 25k', 'grab 50 nghìn' — tao tự ghi! Hoặc hỏi gì về tài chính cũng được 📝",
  ],
  joke: [
    "Mày biết tại sao tao giỏi tài chính không? Vì tao là VẸT... nên tao biết... nhÉt tiền vào ống! 🐦💰 ... ok tao biết nó dở 😅",
    "Joke tài chính: Bạn trai em kiếm 10 triệu/tháng. Chị gái em kiếm 15 triệu/tháng. Bố mẹ em kiếm 20 triệu/tháng. Em kiếm... mệt 💀🦜",
    "Tại sao Bill Gates giàu? Vì ông ấy không uống trà sữa 50k/ngày! 🧋→💸",
  ],

  // ── System Events ──
  streak_praise: [
    "🔥 {streak} ngày liên tiếp! Bạn siêu ghê luôn!",
    "Streak {streak} ngày — Vẹt tự hào về bạn lắm! 🌟",
    "{streak} ngày không bỏ cuộc! Bạn sắp thành Đại Gia rồi! 💎",
    "Đỉnh quá! Vẹt phải học hỏi bạn mới được 🦜✨",
  ],
  level_up: [
    "🎉 LÊN LEVEL! Mày giờ là {levelName} rồi! Tao chúc mừng... nhưng vẫn phải ghi chi tiêu nha! 🦜",
    "WOW! {levelName}! Mày tiến bộ nhanh dữ! Ví tiền mày cũng vui lắm đó 💰🎊",
  ],
};

// ── Response Generator ──────────────────────────────────────────
export function getScriptedResponse(intent: Intent, vars?: Record<string, string>): string | null {
  const pool = RESPONSES[intent];
  if (!pool || pool.length === 0) return null;

  let response = pool[Math.floor(Math.random() * pool.length)];

  // Replace variables like {amount}, {item}, {streak}
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      response = response.replace(new RegExp(`{${key}}`, "g"), value);
    }
  }

  return response;
}

// ── Expense Roasts (thêm vào khi ghi chi tiêu) ─────────────────
export function getExpenseRoast(category: string, amount: number): string {
  const roasts: Record<string, string[]> = {
    "Ăn uống": [
      "Bữa này ngon không? Ít ra cũng no bụng chứ no ví thì không! 🍲",
      "Ăn xong nhớ ghi nha! Dạ dày no, nhưng ví tiền thì hết no rồi đó! 🦜",
      "Ngon thì ngon, nhưng nấu nhà rẻ hơn gấp 3 lần nghen! 🏠",
    ],
    "Đi lại": [
      "Đi xe ôm hoài thì khỏi mua nhà luôn! 🏠🦜",
      "Tháng bao nhiêu tiền grab? Mua xe đạp được rồi đó! 🚲",
    ],
    "Giải trí": [
      "Vui thì vui nhưng ví tiền khóc kìa! 🎭",
      "YOLO à? OK nhưng nhớ: You Only Live Once, tiền cũng mất Once thôi! 💸",
    ],
    "Nhà ở": [
      "Chi phí cố định — OK, tao ghi! Nhưng xem có tiết kiệm được gì không! 🏠",
    ],
    "Giáo dục": [
      "Đầu tư vào não! Cái này tao ủng hộ 100%! 📚🦜",
      "Học! Tốt! Nhưng học xong phải áp dụng nhé, đừng mua course rồi để đó 🤓",
    ],
  };

  const pool = roasts[category] || ["Ghi rồi! Tiêu gì cũng ghi nhé 🦜"];
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

// ── Should this message go to AI? ───────────────────────────────
export function needsAI(intent: Intent, text: string): boolean {
  // Câu hỏi phức tạp hoặc intent không rõ → gọi AI
  if (intent === "unknown") return true;

  // Câu dài > 50 chars thường là câu hỏi cụ thể cần AI
  if (text.length > 80) return true;

  // Có dấu hỏi + intent chung → có thể cần AI
  if (text.includes("?") && ["ask_invest", "ask_market", "ask_debt"].includes(intent)) {
    // 50% chance fallback AI cho câu hỏi cụ thể
    return text.length > 40;
  }

  return false;
}

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Volume2 } from "lucide-react";

/* ─── Vẹt Vàng Personality System ─── */
const ROAST_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Ê! Mở app mà không ghi chi tiêu là phí 3 phút đời rồi đó nghen 🦜",
    "Quay lại rồi hả? Ví tiền có kêu cứu gì không? 💸",
    "Chào chủ tịch! Hôm nay tiêu gì vô lý chưa? 🤡",
  ],
  spending: [
    "Trà sữa 50K/ngày = 1.5 triệu/tháng = 18 triệu/năm. Đủ mua iPhone đó chủ tịch 📱",
    "Chi tiêu kiểu này thì cuối tháng ăn mì gói là đúng rồi 🍜",
    "Tiêu nhiều hơn kiếm à? Genius move! 🧠",
  ],
  saving: [
    "Gửi tiết kiệm 5.2%/năm, lạm phát 3.5%. Lãi thật = 1.7%. Giàu chắc kiếp sau 🐌",
    "Tiết kiệm tốt lắm! Nhưng mà ít quá... thêm tí nữa nha 💰",
    "Ô hay, biết tiết kiệm rồi à? Proud of you! Nhưng đừng có rút ra nghen 😤",
  ],
  debt: [
    "Nợ thẻ tín dụng lãi 25%/năm mà chỉ trả minimum? Ngân hàng cảm ơn bạn 🏦❤️",
    "Tín dụng đen 60%/năm? Thôi... im lặng 3 giây tưởng niệm ví tiền 🕯️",
    "DTI 30% rồi đó, cẩn thận kẻo ngân hàng thấy hồ sơ mà chạy 🏃‍♂️",
  ],
  investment: [
    "All-in crypto à? Bold move! Hoặc là lambo hoặc là xe đạp 🚲",
    "VN-Index đang sợ hãi = cơ hội mua. Nhưng mà tiền đâu? 🤷",
    "Đa dạng hóa danh mục đi, đừng bỏ trứng 1 rổ. Cơ bản vậy mà! 🥚",
  ],
  motivation: [
    "Mày uống trà sữa 50K, Warren Buffett uống Coca 10K. Thấy chưa? 🥤",
    "3 ngày không mở app rồi nha, tiền thì vẫn bay — giỏi thật đấy 🪂",
    "Ghi chi tiêu đi, đừng để cuối tháng hỏi 'tiền đi đâu hết rồi?' 🕵️",
  ],
};

const QUICK_ACTIONS = [
  { label: "💸 Phân tích chi tiêu", key: "spending" },
  { label: "🏦 Tư vấn nợ", key: "debt" },
  { label: "📈 Tư vấn đầu tư", key: "investment" },
  { label: "💪 Motivate tôi!", key: "motivation" },
];

interface Message {
  id: string;
  role: "user" | "vet";
  content: string;
  timestamp: Date;
}

function getRandomResponse(category: string): string {
  const responses = ROAST_RESPONSES[category] || ROAST_RESPONSES.greeting;
  return responses[Math.floor(Math.random() * responses.length)];
}

interface VetVangChatProps {
  isOpen: boolean;
  onClose: () => void;
  xp: number;
  level: number;
  levelName: string;
}

export default function VetVangChat({ isOpen, onClose, xp, level, levelName }: VetVangChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{
          id: Date.now().toString(),
          role: "vet",
          content: getRandomResponse("greeting"),
          timestamp: new Date(),
        }]);
        setIsTyping(false);
      }, 800);
    }
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const simulateVetResponse = (category: string) => {
    setIsTyping(true);
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "vet",
          content: getRandomResponse(category),
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, delay);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simple keyword matching for demo
    const lower = input.toLowerCase();
    let category = "greeting";
    if (lower.includes("chi tiêu") || lower.includes("tiêu") || lower.includes("mua") || lower.includes("trà sữa")) category = "spending";
    else if (lower.includes("nợ") || lower.includes("thẻ") || lower.includes("vay") || lower.includes("trả")) category = "debt";
    else if (lower.includes("đầu tư") || lower.includes("chứng khoán") || lower.includes("crypto") || lower.includes("vàng")) category = "investment";
    else if (lower.includes("tiết kiệm") || lower.includes("saving") || lower.includes("gửi")) category = "saving";
    else if (lower.includes("động viên") || lower.includes("motivat") || lower.includes("buồn") || lower.includes("chán")) category = "motivation";

    simulateVetResponse(category);
  };

  const handleQuickAction = (key: string) => {
    const labels: Record<string, string> = {
      spending: "Phân tích chi tiêu của tôi",
      debt: "Tình hình nợ của tôi thế nào?",
      investment: "Nên đầu tư gì bây giờ?",
      motivation: "Motivate tôi đi!",
    };
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: labels[key] || key,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    simulateVetResponse(key);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-6 w-[380px] h-[520px] z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(17,19,24,0.98) 0%, rgba(10,11,15,0.99) 100%)",
            border: "1px solid rgba(230,184,79,0.15)",
            boxShadow: "0 0 60px rgba(230,184,79,0.08), 0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
            style={{ background: "linear-gradient(90deg, rgba(230,184,79,0.08) 0%, transparent 100%)" }}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="text-2xl">🦜</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#22C55E] rounded-full border-2 border-[#111318]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1">
                  Vẹt Vàng <Sparkles className="w-3 h-3 text-[#E6B84F]" />
                </h3>
                <p className="text-[9px] text-white/25">Lv.{level} {levelName} • {xp} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* XP Bar */}
          <div className="px-4 py-1.5 border-b border-white/[0.04]">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-mono text-white/15">XP PROGRESS</span>
              <span className="text-[8px] font-mono text-[#E6B84F]/40">{xp}/1000</span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #E6B84F, #FFD700)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(xp / 1000) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "vet" && <span className="text-lg mr-1.5 mt-1 flex-shrink-0">🦜</span>}
                <div
                  className={`max-w-[280px] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#E6B84F]/15 text-white/80 rounded-br-sm"
                      : "bg-white/[0.04] text-white/70 rounded-bl-sm border border-white/[0.06]"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-lg">🦜</span>
                <div className="bg-white/[0.04] rounded-2xl rounded-bl-sm px-3 py-2 border border-white/[0.06]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#E6B84F]/40"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-[#E6B84F]/20 hover:text-[#E6B84F] hover:bg-[#E6B84F]/5 transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Hỏi Vẹt Vàng..."
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-[#E6B84F] to-[#D4A43F] text-black disabled:opacity-30 hover:shadow-[0_0_16px_rgba(230,184,79,0.3)] transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

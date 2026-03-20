"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Volume2, VolumeX, Mic } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { parseExpenseWithContext } from "@/lib/expense-parser";
import {
  detectIntent, getScriptedResponse, getExpenseRoast,
  getComparison, needsAI,
} from "@/lib/scripted-responses";

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

// Using Message from ai sdk

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
  const [input, setInput] = useState("");
  const { messages, setMessages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: "greet-1",
        role: "assistant",
        parts: [{ type: "text", text: getRandomResponse("greeting") }],
      } as any
    ]
  });
  
  const isLoading = status === 'submitted' || status === 'streaming';
  
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIdRef = useRef<string>("");

  // ── TTS: Web Speech API ──
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Tìm giọng tiếng Việt — nếu không có thì KHÔNG đọc (tránh đọc bằng giọng EN)
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.startsWith("vi"));
    if (!viVoice) {
      // Retry 1 lần sau 500ms (voices có thể load chậm)
      setTimeout(() => {
        const retryVoices = window.speechSynthesis.getVoices();
        const retryVi = retryVoices.find(v => v.lang.startsWith("vi"));
        if (retryVi) {
          doSpeak(text, retryVi);
        }
        // Nếu vẫn không có → skip, chỉ hiển thị text
      }, 500);
      return;
    }

    doSpeak(text, viVoice);
  }, [voiceEnabled]);

  const doSpeak = (text: string, voice: SpeechSynthesisVoice) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1.1;
    utterance.pitch = 1.3;
    utterance.voice = voice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak new assistant messages
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1] as any;
    if (lastMsg?.role === "assistant" && lastMsg.id !== lastSpokenIdRef.current) {
      const text = lastMsg.parts?.[0]?.text || lastMsg.content || "";
      if (text && status !== "streaming") {
        lastSpokenIdRef.current = lastMsg.id;
        speak(text);
      }
    }
  }, [messages, status, voiceEnabled, speak]);

  // Stop speaking when chat closes
  useEffect(() => {
    if (!isOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Voice Input (Web Speech API)
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói!");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + " " + transcript);
    };
    recognition.onerror = (e: any) => {
      console.error("Speech error", e);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  // ── Client-side local-first handler ──
  const tryLocalResponse = (text: string): string | null => {
    // Step 1: Try expense parsing
    const expense = parseExpenseWithContext(text);
    if (expense && expense.confidence >= 0.5) {
      const amt = expense.amount.toLocaleString('vi-VN');
      const roast = getExpenseRoast(expense.category, expense.amount);
      if (expense.amount >= 500_000) {
        const compare = getComparison(expense.amount);
        return getScriptedResponse('expense_high', { amount: `${amt}đ`, item: expense.item, compare }) || `${amt}đ cho ${expense.item}?! ${roast} 🦜`;
      }
      if (expense.amount <= 20_000) {
        return getScriptedResponse('expense_low', { amount: `${amt}đ`, item: expense.item }) || `${amt}đ — tiết kiệm ghê! 🦜`;
      }
      return getScriptedResponse('expense_logged', { amount: `${amt}đ`, item: expense.item, category: expense.category, pot: expense.pot, roast, total: '...', remaining: '...' }) || `✅ Ghi ${amt}đ — ${expense.item}. ${roast} 🦜`;
    }

    // Step 2: Try scripted response
    const intent = detectIntent(text);
    if (intent !== 'unknown' && !needsAI(intent, text)) {
      return getScriptedResponse(intent) || null;
    }

    return null; // → fallback to AI
  };

  const addLocalMessage = (userText: string, botText: string) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: userText }],
    };
    const botMsg = {
      id: `bot-${Date.now() + 1}`,
      role: "assistant" as const,
      parts: [{ type: "text" as const, text: botText }],
    };
    setMessages((prev: any) => [...prev, userMsg, botMsg]);
  };

  const submitForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");

    // Try local-first (0 API calls)
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply);
      return;
    }

    // Fallback to AI
    sendMessage({ text });
  };

  const handleQuickAction = (key: string) => {
    const labels: Record<string, string> = {
      spending: "Phân tích chi tiêu của tôi",
      debt: "Tình hình nợ của tôi thế nào?",
      investment: "Nên đầu tư gì bây giờ?",
      motivation: "Motivate tôi đi!",
    };
    if (isLoading) return;
    const text = labels[key] || key;

    // Try local-first
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply);
      return;
    }

    sendMessage({ text });
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
              <button
                onClick={() => {
                  setVoiceEnabled(v => !v);
                  if (voiceEnabled) window.speechSynthesis?.cancel();
                }}
                className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'bg-[#E6B84F]/10 text-[#E6B84F] hover:bg-[#E6B84F]/20' : 'hover:bg-white/[0.05] text-white/30 hover:text-white/60'}`}
                title={voiceEnabled ? "Tắt giọng nói" : "Bật giọng nói"}
              >
                {voiceEnabled ? (
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
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
            {messages.map((msg: any) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && <span className="text-lg mr-1.5 mt-1 flex-shrink-0">🦜</span>}
                <div
                  className={`max-w-[280px] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#E6B84F]/15 text-white/80 rounded-br-sm"
                      : "bg-white/[0.04] text-white/70 rounded-bl-sm border border-white/[0.06]"
                  }`}
                >
                  {msg.parts?.[0]?.text || msg.content}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
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

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-lg">🦜</span>
                <div className="bg-red-500/10 text-red-400 rounded-2xl rounded-bl-sm px-3 py-2 border border-red-500/20 text-[13px]">
                  Bực mình ghê, đường mạng kẹt quá tao nói không được. Thử lại sau nha 🤬
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
            <form onSubmit={submitForm} className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={startListening}
                className={`p-2 rounded-xl border transition-all ${isListening ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.06]'}`}
              >
                {isListening ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <Mic className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitForm(e)}
                placeholder="Hỏi Vẹt Vàng..."
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30 transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-gradient-to-r from-[#E6B84F] to-[#D4A43F] text-black disabled:opacity-30 hover:shadow-[0_0_16px_rgba(230,184,79,0.3)] transition-all flex items-center justify-center min-w-[36px]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

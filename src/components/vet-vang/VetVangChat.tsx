"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Volume2, VolumeX, Mic } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import { playPop, playDing, getSoundMuted, setSoundMuted } from "@/lib/sounds";
import { parseExpenseWithContext } from "@/lib/expense-parser";
import { getBudgetPots, getExpenses, getDebts, getIncome, getRiskResult } from "@/lib/storage";
import {
  detectIntent, getScriptedResponse, getExpenseRoast,
  getComparison, needsAI, DATA_INTENTS,
  type ScriptedResponseItem, type Intent,
} from "@/lib/scripted-responses";
import { type PersonaMode, PERSONAS, getVetvangPersona } from "@/lib/vetvang-persona";
import VetVangConfig from "./VetVangConfig";
import { analyzeDTI } from "@/lib/calculations/debt-optimizer";

// ── Build user financial context from localStorage ──
function getUserDataContext(personaMode: PersonaMode): string {
  if (typeof window === "undefined") return "";
  const parts: string[] = [];
  const persona = PERSONAS[personaMode];

  parts.push(`[HƯỚNG DẪN TÍNH CÁCH CỦA VẸT VÀNG MÀ BẠN PHẢI NHẬP VAI]`);
  parts.push(`Tên: Vẹt Vàng (Mascot tư vấn tài chính của ứng dụng Vietfi Advisor).`);
  parts.push(`Tính cách hiện tại: ${persona.name} - ${persona.desc}`);
  parts.push(`Luôn trả lời theo tính cách này. Không bao giờ tự xưng là AI hay ngôn ngữ máy móc.\n`);

  try {
    const income = getIncome();
    const debts = getDebts();
    const expenses = getExpenses();
    const pots = getBudgetPots();

    // Income
    if (income > 0) {
      parts.push(`Thu nhập: ${income.toLocaleString("vi-VN")}đ/tháng`);
    }

    // Cashflow 50-30-20 Analysis & Free Cashflow
    let essentialExpense = 0;
    if (pots.length > 0) {
      const spentByPot: Record<string, number> = {};
      let totalSpent = 0;
      expenses.forEach(e => {
        const potId = e.pot_id ?? e.potId ?? "";
        spentByPot[potId] = (spentByPot[potId] ?? 0) + e.amount;
        totalSpent += e.amount;
      });
      const potSummary = pots.map(p => {
        const spent = spentByPot[p.id] ?? 0;
        return `- ${p.name}: Tiêu ${spent.toLocaleString("vi-VN")}đ / Ngân sách ${p.allocated.toLocaleString("vi-VN")}đ`;
      }).join("\n");
      parts.push(`[BỨC TRANH CHI TIÊU - CASHFLOW]\nTổng chi tiêu: ${totalSpent.toLocaleString("vi-VN")}đ.\n${potSummary}`);
      
      parts.push(`(Ghi chú cho AI: Hãy đối chiếu xem user có làm đúng quy tắc 50-30-20 không. Đặc biệt khen nếu user tiêu ở Quỹ Tiết Kiệm/Đầu tư, và chê nếu xài lố Quỹ mong muốn/giải trí)`);

      essentialExpense = pots.filter(p => ['Ăn uống', 'Nhà cửa', 'Đi lại', 'Hoá đơn', 'Sức khoẻ'].some(k => p.name.includes(k))).reduce((sum, p) => sum + p.allocated, 0);
      if (essentialExpense === 0) essentialExpense = pots.reduce((sum, p) => sum + p.allocated, 0) * 0.5;
    }

    if (income > 0) {
      const debtMin = debts.reduce((sum, d) => sum + d.min_payment, 0);
      const freeCashflow = income - essentialExpense - debtMin;
      parts.push(`Dư địa đầu tư/tháng (Free Cashflow): ${freeCashflow.toLocaleString("vi-VN")}đ.`);
      if (freeCashflow < 0) {
         parts.push(`(Ghi chú CHẾT NGƯỜI: DÒNG TIỀN ÂM ${Math.abs(freeCashflow).toLocaleString("vi-VN")}đ! Khuyên cắt giảm chi tiêu ngay lập tức, tuyệt đối CẤM ĐẦU TƯ rủi ro!)`);
      } else if (freeCashflow > 0) {
         const riskLabel = getRiskResult()?.label || "Cân bằng";
         parts.push(`(Ghi chú: Dòng tiền đang dương ${freeCashflow.toLocaleString("vi-VN")}đ. Khuyên user bơm tiền này vào Quỹ Dự Phòng hoặc Đầu Tư (ETF, Vàng) tuỳ theo Risk DNA: ${riskLabel})`);
      }
    }

    // Debt & DTI Analysis
    if (debts.length > 0) {
      const mappedDebts = debts.map((d, index) => ({
        id: `debt-${index}`,
        name: d.name,
        type: (d.type as "personal" | "credit_card" | "mortgage" | "bnpl" | "loan_shark") || "personal",
        principal: d.principal,
        rate: d.rate,
        minPayment: d.min_payment,
      }));
      const dti = analyzeDTI(mappedDebts, income || 1); // fallback income=1 to avoid Infinity
      const debtList = debts.map(d => `${d.name}: lố ${d.principal.toLocaleString("vi-VN")}đ, lãi ${d.rate}%/năm`).join("; ");
      parts.push(`[PHÂN TÍCH NỢ & DTI]`);
      parts.push(`Tổng nợ: ${dti.totalDebt.toLocaleString("vi-VN")}đ.`);
      parts.push(`Chỉ số DTI (Debt-to-Income): ${dti.dtiRatio.toFixed(1)}% (Mức độ rủi ro: ${dti.dtiLevel.toUpperCase()})`);
      parts.push(`Chi tiết: ${debtList}`);
      if (dti.dtiRatio > 60) {
        parts.push(`(Ghi chú ĐẶC BIỆT cho AI: DTI của user đang VƯỢT MỨC MÀU ĐỎ (>60%). Tùy theo tính cách mà hãy thảng thốt cảnh báo tuyệt đối KHÔNG CHI TIÊU THÊM, tước thẻ tín dụng và lo kiếm tiền trả nợ ngay lập tức!)`);
      }
    } else {
      parts.push(`Tình trạng nợ: Không có khoản nợ nào (Tốt).`);
    }

  } catch { /* ignore parse errors */ }

  return `[DỮ LIỆU TÀI CHÍNH CỦA USER]\n${parts.join("\n")}`;
}

const QUICK_ACTIONS = [
  { label: "💸 Phân tích chi tiêu", key: "ask_spending" },
  { label: "🏦 Tư vấn nợ", key: "ask_debt" },
  { label: "📈 Tư vấn đầu tư", key: "ask_invest" },
  { label: "💪 Motivate tôi!", key: "motivate" },
  { label: "🥇 Vàng vs CK?", key: "compare_gold_stock" },
  { label: "💰 Lạm phát VN?", key: "ask_inflation" },
  { label: "🏠 Nên mua nhà?", key: "ask_realestate" },
];

interface VetVangChatProps {
  isOpen: boolean;
  onClose: () => void;
  xp: number;
  level: number;
  levelName: string;
}

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function VetVangChat({ isOpen, onClose, xp, level, levelName }: VetVangChatProps) {
  const [input, setInput] = useState("");
  const [persona, setPersona] = useState<PersonaMode>("chuyen_gia");
  const [showConfig, setShowConfig] = useState(false);
  const [ttsByMessageId, setTtsByMessageId] = useState<Record<string, string>>({});

  // Load saved persona on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersona(getVetvangPersona());
  }, []);

  const activePersonaConfig = PERSONAS[persona];

  const greetingItem = getScriptedResponse("greeting");
  const { messages, setMessages, sendMessage, status, error } = useChat<UIMessage>({
    messages: [
      {
        id: "greet-1",
        role: "assistant",
        parts: [{ type: "text", text: greetingItem?.text || "Chào bạn! Mình hỗ trợ ghi chi tiêu nhé! 🦜" }],
      }
    ]
  });
  const typedMessages = messages;
  const getMessageText = (msg: UIMessage): string => {
    const textPart = msg.parts.find((part) => part.type === "text");
    return textPart?.text ?? "";
  };
  
  const isLoading = status === 'submitted' || status === 'streaming';

  // ── Khi AI fail → hiện fallback response ──
  useEffect(() => {
    if (error) {
      const fallbackItem = getScriptedResponse("motivate");
      const fallbackText = fallbackItem?.text || "Mình đang bận một chút, bạn thử lại nhé! 🦜";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${crypto.randomUUID()}`,
          role: "assistant",
          parts: [{ type: "text", text: fallbackText }],
        } as UIMessage,
      ]);
    }
  }, [error, setMessages]);
  
  const [isListening, setIsListening] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Init sound muted state from localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundMutedState(getSoundMuted());
  }, []);

  // ── TTS: On-demand tap-to-speak ──
  const speakMessage = useCallback(async (msgId: string, text: string) => {
    // Cancel audio đang phát
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (speakingMsgId === msgId) {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
        return; // toggle off
      }
    }

    try {
      setIsSpeaking(true);
      setSpeakingMsgId(msgId);

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });

      if (!res.ok) { setIsSpeaking(false); setSpeakingMsgId(null); return; }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
  }, [speakingMsgId]);

  // Play ding when new assistant message arrives
  useEffect(() => {
    if (typedMessages.length < 2) return;
    const lastMsg = typedMessages[typedMessages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.id !== "greet-1" && status !== "streaming") {
      playDing();
    }
  }, [typedMessages, status]);

  // Stop speaking when chat closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const raw = event.results[0][0].transcript as string;
      // Strip HTML special chars from speech recognition output (user-controlled)
      const transcript = raw.replace(/[<>&"']/g, "").trim();
      setInput((prev) => (prev + " " + transcript).trim());
    };
    recognition.onerror = (e: unknown) => {
      console.error("Speech error", e);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  // ── Client-side local-first handler ──
  const tryLocalResponse = (text: string): ScriptedResponseItem | null => {
    // Step 1: Try expense parsing
    const expense = parseExpenseWithContext(text);
    if (expense && expense.confidence >= 0.5) {
      const amt = expense.amount.toLocaleString('vi-VN');
      const roast = getExpenseRoast(expense.category, expense.amount);
      if (expense.amount >= 500_000) {
        const compare = getComparison(expense.amount);
        return getScriptedResponse('expense_high', { amount: `${amt}đ`, item: expense.item, compare })
          || { id: 'fallback', text: `${amt}đ cho ${expense.item}?! ${roast} 🦜`, ttsText: `${amt} đồng cho ${expense.item}? ${roast}` };
      }
      if (expense.amount <= 20_000) {
        return getScriptedResponse('expense_low', { amount: `${amt}đ`, item: expense.item })
          || { id: 'fallback', text: `${amt}đ — tiết kiệm ghê! 🦜`, ttsText: `${amt} đồng, tiết kiệm ghê!` };
      }
      return getScriptedResponse('expense_logged', { amount: `${amt}đ`, item: expense.item, category: expense.category, pot: expense.pot, roast, total: '...', remaining: '...' })
        || { id: 'fallback', text: `✅ Ghi ${amt}đ — ${expense.item}. ${roast} 🦜`, ttsText: `Ghi ${amt} đồng, ${expense.item}. ${roast}` };
    }

    // Step 2: Try scripted response
    const intent = detectIntent(text);
    if (intent !== 'unknown' && !needsAI(intent, text)) {
      return getScriptedResponse(intent) || null;
    }

    // Edge Case: Zero Income Mỏ Hỗn Roast
    const ZERO_INCOME_INTENTS = ['ask_invest', 'ask_realestate', 'ask_gold', 'ask_stock', 'ask_crypto', 'compare_gold_stock'];
    if (ZERO_INCOME_INTENTS.includes(intent)) {
      if (typeof window !== "undefined") {
        try {
          const income = getIncome();
          if (!income || income <= 0) {
            return getScriptedResponse('zero_income_roast') || null;
          }
        } catch { }
      }
    }

    return null; // → fallback to AI
  };

  const localMessageSeqRef = useRef(0);
  const nextLocalMessageId = (prefix: "user" | "bot") => {
    localMessageSeqRef.current += 1;
    return `${prefix}-${localMessageSeqRef.current}`;
  };

  const addLocalMessage = (userText: string, botText: string, botTtsText?: string) => {
    const userMsg: UIMessage = {
      id: nextLocalMessageId("user"),
      role: "user",
      parts: [{ type: "text", text: userText }],
    };
    const botId = nextLocalMessageId("bot");
    const botMsg: UIMessage = {
      id: botId,
      role: "assistant",
      parts: [{ type: "text", text: botText }],
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setTtsByMessageId((prev) => ({ ...prev, [botId]: cleanTextForTTS(botTtsText || botText) }));
  };

  // ── Market-related intents that need live data ──
  const MARKET_INTENTS = ["ask_gold", "ask_stock", "ask_crypto", "ask_market", "compare_gold_stock", "ask_inflation", "ask_realestate"];

  const fetchMarketContext = useCallback(async (): Promise<string> => {
    try {
      const resp = await fetch("/api/market-data", { cache: "no-store" });
      if (!resp.ok) return "";
      const data = await resp.json();
      const parts: string[] = ["[DỮ LIỆU THỊ TRƯỜNG REALTIME]"];
      if (data.vnIndex) parts.push(`VN-Index: ${data.vnIndex.price} (${data.vnIndex.changePct >= 0 ? "+" : ""}${data.vnIndex.changePct}%)`);
      if (data.goldSjc) parts.push(`Vàng SJC: ${data.goldSjc.goldVnd?.toLocaleString("vi-VN")}đ/lượng (${data.goldSjc.changePct >= 0 ? "+" : ""}${data.goldSjc.changePct}%)`);
      if (data.usdVnd) parts.push(`USD/VND: ${data.usdVnd.rate?.toLocaleString("vi-VN")}`);
      if (data.btc) parts.push(`BTC: $${data.btc.priceUsd?.toLocaleString("en-US")} (${data.btc.changePct24h >= 0 ? "+" : ""}${data.btc.changePct24h}%)`);
      if (data.macro) {
        const gdp = data.macro.gdpYoY?.[0];
        const cpi = data.macro.cpiYoY?.[0];
        if (gdp) parts.push(`GDP: ${gdp.value}% (${gdp.period})`);
        if (cpi) parts.push(`CPI: ${cpi.value}% (${cpi.period})`);
        if (data.macro.deposit12m) parts.push(`Lãi suất tiết kiệm 12T: ${data.macro.deposit12m.min}-${data.macro.deposit12m.max}%`);
      }
      return parts.join("\n");
    } catch {
      return "";
    }
  }, []);

  const submitForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    playPop();

    // Try local-first (0 API calls)
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply.text, localReply.ttsText);
      return;
    }

    // Inject user data context for data-dependent questions
    const intent = detectIntent(text);
    if (DATA_INTENTS.includes(intent as Intent)) {
      const ctx = getUserDataContext(persona);
      // Market intents → also fetch live data
      if (MARKET_INTENTS.includes(intent)) {
        fetchMarketContext().then(mkt => {
          sendMessage({ text: `${ctx}\n\n${mkt}\n\nCâu hỏi của User: ${text}\n\nHãy trả lời dựa trên DỮ LIỆU THỊ TRƯỜNG REALTIME ở trên và tình hình tài chính cá nhân của user. Nhập vai Tính cách Vẹt Vàng đã giao. Đưa ra lời khuyên CỤ THỂ, CÓ SỐ LIỆU.` });
        });
      } else {
        sendMessage({ text: `${ctx}\n\nCâu hỏi của User: ${text}\n\nHãy trả lời dựa trên dữ liệu tài chính thực tế của user ở trên. Nhập vai Tính cách Vẹt Vàng đã giao. Đưa ra lời khuyên CỤ THỂ, CÓ SỐ LIỆU.` });
      }
    } else {
      sendMessage({ text });
    }
  };

  const handleQuickAction = (key: string) => {
    // Labels chứa keyword khớp intent patterns
    const labels: Record<string, string> = {
      ask_spending: "phân tích chi tiêu của tôi",
      ask_debt: "tình hình nợ của tôi và cách trả nợ tối ưu",
      ask_invest: "tư vấn đầu tư dựa trên tình hình tài chính của tôi",
      motivate: "motivate tôi đi",
      compare_gold_stock: "so sánh vàng và chứng khoán, với giá hiện tại nên đầu tư cái nào",
      ask_inflation: "lạm phát VN hiện tại bao nhiêu, ảnh hưởng gì đến tiền tiết kiệm và chi tiêu của tôi",
      ask_realestate: "với thu nhập và chi tiêu hiện tại của tôi, có nên mua nhà không, mua hay thuê",
    };
    if (isLoading) return;
    const text = labels[key] || key;
    playPop();

    // Try local-first
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply.text, localReply.ttsText);
      return;
    }

    // Inject user data context + market data for data-dependent questions
    const intent = detectIntent(text);
    if (DATA_INTENTS.includes(intent as Intent)) {
      const ctx = getUserDataContext(persona);
      if (MARKET_INTENTS.includes(intent) || MARKET_INTENTS.includes(key)) {
        fetchMarketContext().then(mkt => {
          sendMessage({ text: `${ctx}\n\n${mkt}\n\nCâu hỏi của User: ${text}\n\nHãy trả lời dựa trên DỮ LIỆU THỊ TRƯỜNG REALTIME và tình hình tài chính cá nhân. Nhập vai Tính cách Vẹt Vàng đã giao. Đưa ra lời khuyên phân bổ vốn CỤ THỂ: nên bỏ bao nhiêu % vào mỗi kênh, kèm lý do dựa trên số liệu thực.` });
        });
      } else {
        sendMessage({ text: `${ctx}\n\nCâu hỏi của User: ${text}\n\nHãy trả lời dựa trên dữ liệu tài chính thực tế của user. Nhập vai Tính cách Vẹt Vàng đã giao. Đưa ra lời khuyên CỤ THỂ, CÓ SỐ LIỆU.` });
      }
    } else {
      sendMessage({ text });
    }
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
                <span className="text-2xl">{activePersonaConfig.emoji}</span>
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111318]" 
                  style={{ backgroundColor: activePersonaConfig.color }}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1">
                  Vẹt Vàng <Sparkles className="w-3 h-3" style={{ color: activePersonaConfig.color }} />
                </h3>
                <p className="text-[9px] text-white/40 flex items-center gap-1">
                  Lv.{level} {levelName} • <span style={{ color: activePersonaConfig.color }}>Mode: {activePersonaConfig.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 rounded-lg transition-colors text-[10px] font-bold border ${
                  showConfig ? "bg-white/10 text-white" : "border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                ⚙️
              </button>
              <button
                onClick={() => {
                  const newMuted = !soundMuted;
                  setSoundMutedState(newMuted);
                  setSoundMuted(newMuted);
                  if (newMuted && audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                    setIsSpeaking(false);
                    setSpeakingMsgId(null);
                  }
                }}
                className={`p-1.5 rounded-lg transition-colors ${!soundMuted ? 'bg-[#E6B84F]/10 text-[#E6B84F] hover:bg-[#E6B84F]/20' : 'hover:bg-white/[0.05] text-white/30 hover:text-white/60'}`}
                title={soundMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {!soundMuted ? (
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
                style={{ background: `linear-gradient(90deg, ${activePersonaConfig.color}, #FFFFFF)` }}
                initial={{ width: 0 }}
                animate={{ width: `${(xp / 1000) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Config Popover */}
          <AnimatePresence>
            {showConfig && (
              <VetVangConfig 
                currentPersona={persona} 
                onPersonaChange={(m) => { setPersona(m); setShowConfig(false); }} 
                onClose={() => setShowConfig(false)} 
              />
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {typedMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && <span className="text-lg mr-1.5 mt-1 flex-shrink-0">🦜</span>}
                <div className="relative group">
                  <div
                    className={`max-w-[280px] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "text-white/90 rounded-br-sm"
                        : "bg-white/[0.04] text-white/80 rounded-bl-sm border border-white/[0.06]"
                    }`}
                    style={msg.role === "user" ? { 
                      backgroundColor: `${activePersonaConfig.color}20`,
                      border: `1px solid ${activePersonaConfig.color}30`
                    } : {}}
                  >
                    {getMessageText(msg)}
                  </div>
                  {msg.role === "assistant" && msg.id !== "greet-1" && (
                    <button
                      onClick={() => speakMessage(msg.id, ttsByMessageId[msg.id] || cleanTextForTTS(getMessageText(msg)))}
                      className={`absolute -bottom-1 right-0 p-1 rounded-full transition-all ${
                        speakingMsgId === msg.id
                          ? "bg-[#E6B84F]/20 text-[#E6B84F] opacity-100"
                          : "bg-white/[0.06] text-white/25 opacity-0 group-hover:opacity-100 hover:text-[#E6B84F]"
                      }`}
                      title="Nghe tin nhắn này"
                    >
                      <Volume2 className={`w-3 h-3 ${speakingMsgId === msg.id && isSpeaking ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && typedMessages[typedMessages.length - 1]?.role === "user" && (
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
                  Đường mạng đang chậm nên mình phản hồi chưa được. Bạn thử lại sau nhé.
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {typedMessages.length <= 1 && (
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
                className="p-2 rounded-xl text-black disabled:opacity-30 transition-all flex items-center justify-center min-w-[36px]"
                style={{ 
                  background: `linear-gradient(to right, ${activePersonaConfig.color}, #FFFFFF)`,
                  boxShadow: `0 0 16px ${activePersonaConfig.color}30`
                }}
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

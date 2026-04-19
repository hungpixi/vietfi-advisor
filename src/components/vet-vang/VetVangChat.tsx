"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Mic } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { playPop, playDing } from "@/lib/sounds";
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
      const debtMin = debts.reduce((sum, d) => sum + (d.minPayment ?? 0), 0);
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
        minPayment: d.minPayment ?? 0,
      }));
      const dti = analyzeDTI(mappedDebts, income || 1);
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

export default function VetVangChat({ isOpen, onClose, xp, level, levelName }: VetVangChatProps) {
  const [input, setInput] = useState("");
  const [persona, setPersona] = useState<PersonaMode>("mo_hon");
  const [showConfig, setShowConfig] = useState(false);

  // Load saved persona on mount
  useEffect(() => {
    setPersona(getVetvangPersona());
  }, []);

  const activePersonaConfig = PERSONAS[persona];

  const [greetingItem] = useState(() => getScriptedResponse("greeting"));
  const greetingId = greetingItem ? `bot-scripted-${greetingItem.id}-1` : "greet-1";

  const { messages, setMessages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: greetingId,
        role: "assistant",
        parts: [{ type: "text", text: greetingItem?.text || "Chào mày! Ghi chi tiêu đi! 🦜" }],
      } as any
    ]
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // ── Khi AI fail → hiện fallback response ──
  useEffect(() => {
    if (error) {
      const fallbackItem = getScriptedResponse("motivate");
      const fallbackText = fallbackItem?.text || "Tao bận xíu, thử lại nha! 🦜";
      setMessages((prev: any) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: fallbackText }],
        },
      ]);
    }
  }, [error, setMessages]);

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "auto-submit">("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play ding when new assistant message arrives
  useEffect(() => {
    if (messages.length < 2) return;
    const lastMsg = messages[messages.length - 1] as any;
    if (lastMsg?.role === "assistant" && lastMsg.id !== greetingId && status !== "streaming") {
      playDing();
    }
  }, [messages, status, greetingId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const addLocalMessage = (userText: string, botText: string, scriptedId?: string) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: userText }],
    };
    const idPrefix = scriptedId ? `bot-scripted-${scriptedId}` : "bot-local";
    const newBotMsgId = `${idPrefix}-${Date.now() + 1}`;
    const botMsg = {
      id: newBotMsgId,
      role: "assistant" as const,
      parts: [{ type: "text" as const, text: botText }],
    };
    setMessages((prev: any) => [...prev, userMsg, botMsg]);
  };

  const doSubmit = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;
    playPop();

    // Try local-first (0 API calls)
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply.text, localReply.id);
      return;
    }

    // Inject user data context for data-dependent questions
    const intent = detectIntent(text);
    if (DATA_INTENTS.includes(intent as Intent)) {
      const ctx = getUserDataContext(persona);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, persona, fetchMarketContext, sendMessage]);

  const submitForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    doSubmit(text);
  };

  // ── Handle Voice Input (Web Speech API) ──
  // Khi nói xong, nếu nhận ra chi tiêu (confidence ≥ 0.7) → tự auto-submit
  // Nếu không nhận ra → điền vào input chờ user tự sửa/submit
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói!");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("listening");
    };

    recognition.onresult = (event: any) => {
      const raw = event.results[0][0].transcript as string;
      // Strip HTML special chars từ speech recognition output (user-controlled)
      const transcript = raw.replace(/[<>&"']/g, "").trim();

      // Kiểm tra xem có phải chi tiêu không
      const expense = parseExpenseWithContext(transcript);
      if (expense && expense.confidence >= 0.7) {
        // Nhận ra chi tiêu với confidence cao → auto-submit
        setVoiceStatus("auto-submit");
        setInput(""); // clear input
        setTimeout(() => {
          doSubmit(transcript);
          setVoiceStatus("idle");
        }, 300); // nhỏ delay để user thấy feedback
      } else {
        // Không nhận ra chi tiêu → điền vào input
        setInput((prev) => (prev + " " + transcript).trim());
        setVoiceStatus("idle");
        // Focus input để user có thể sửa/submit
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech error", e);
      setIsListening(false);
      setVoiceStatus("idle");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceStatus === "listening") setVoiceStatus("idle");
    };

    recognition.start();
  };

  const handleQuickAction = (key: string) => {
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
      addLocalMessage(text, localReply.text, localReply.id);
      return;
    }

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

  // Mic button style based on status
  const micBtnClass = () => {
    if (voiceStatus === "auto-submit") return "bg-green-500/20 border-green-500/50 text-green-400";
    if (isListening) return "bg-red-500/20 border-red-500/50 text-red-400";
    return "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.06]";
  };

  const micTooltip = () => {
    if (voiceStatus === "auto-submit") return "Đang ghi chi tiêu...";
    if (isListening) return "Đang nghe... nói chi tiêu của bạn";
    return "Nói để ghi chi tiêu nhanh";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 w-full h-full md:w-[380px] md:h-[520px] z-[100] flex flex-col md:rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(17,19,24,1) 0%, rgba(10,11,15,1) 100%)",
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
                className={`p-1.5 rounded-lg transition-colors text-[10px] font-bold border ${showConfig ? "bg-white/10 text-white" : "border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
              >
                ⚙️
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
              <span className="text-[8px] font-mono text-white/15">Tiến độ XP</span>
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
                  className={`max-w-[280px] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${msg.role === "user"
                    ? "text-white/90 rounded-br-sm"
                    : "bg-white/[0.04] text-white/80 rounded-bl-sm border border-white/[0.06]"
                    }`}
                  style={msg.role === "user" ? {
                    backgroundColor: `${activePersonaConfig.color}20`,
                    border: `1px solid ${activePersonaConfig.color}30`
                  } : {}}
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
            {/* Voice status feedback */}
            {voiceStatus === "auto-submit" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-green-400/70 text-center mb-1.5 flex items-center justify-center gap-1"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Đã nhận chi tiêu — đang ghi...
              </motion.div>
            )}
            {isListening && voiceStatus === "listening" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-red-400/70 text-center mb-1.5 flex items-center justify-center gap-1"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Đang nghe... nói tên & giá chi tiêu
              </motion.div>
            )}
            <form onSubmit={submitForm} className="flex items-center gap-2">
              <button
                type="button"
                onClick={startListening}
                disabled={isListening || voiceStatus === "auto-submit"}
                title={micTooltip()}
                className={`p-2 rounded-xl border transition-all ${micBtnClass()}`}
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
                placeholder="Ghi chi tiêu hoặc hỏi Vẹt Vàng..."
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

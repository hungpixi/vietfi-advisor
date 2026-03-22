"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Volume2, VolumeX, Mic } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { playPop, playDing, getSoundMuted, setSoundMuted } from "@/lib/sounds";
import { parseExpenseWithContext } from "@/lib/expense-parser";
import {
  detectIntent, getScriptedResponse, getExpenseRoast,
  getComparison, needsAI,
  type ScriptedResponseItem,
} from "@/lib/scripted-responses";

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
  const greetingItem = getScriptedResponse("greeting");
  const { messages, setMessages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: "greet-1",
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
  const [soundMuted, setSoundMutedState] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Init sound muted state from localStorage
  useEffect(() => { setSoundMutedState(getSoundMuted()); }, []);

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
    if (messages.length < 2) return;
    const lastMsg = messages[messages.length - 1] as any;
    if (lastMsg?.role === "assistant" && lastMsg.id !== "greet-1" && status !== "streaming") {
      playDing();
    }
  }, [messages, status]);

  // Stop speaking when chat closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
      const raw = event.results[0][0].transcript as string;
      // Strip HTML special chars from speech recognition output (user-controlled)
      const transcript = raw.replace(/[<>&"']/g, "").trim();
      setInput((prev) => (prev + " " + transcript).trim());
    };
    recognition.onerror = (e: any) => {
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
    playPop();

    // Try local-first (0 API calls)
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply.text);
      return;
    }

    // Fallback to AI
    sendMessage({ text });
  };

  const handleQuickAction = (key: string) => {
    // Labels chứa keyword khớp intent patterns
    const labels: Record<string, string> = {
      ask_spending: "phân tích chi tiêu của tôi",
      ask_debt: "tình hình nợ của tôi",
      ask_invest: "tư vấn đầu tư",
      motivate: "motivate tôi đi",
      compare_gold_stock: "so sánh vàng và chứng khoán nên đầu tư cái nào",
      ask_inflation: "lạm phát Việt Nam hiện tại bao nhiêu và ảnh hưởng gì",
      ask_realestate: "với thu nhập của tôi có nên mua nhà không",
    };
    if (isLoading) return;
    const text = labels[key] || key;
    playPop();

    // Try local-first
    const localReply = tryLocalResponse(text);
    if (localReply) {
      addLocalMessage(text, localReply.text);
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
                <div className="relative group">
                  <div
                    className={`max-w-[280px] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#E6B84F]/15 text-white/80 rounded-br-sm"
                        : "bg-white/[0.04] text-white/70 rounded-bl-sm border border-white/[0.06]"
                    }`}
                  >
                    {msg.parts?.[0]?.text || msg.content}
                  </div>
                  {msg.role === "assistant" && msg.id !== "greet-1" && (
                    <button
                      onClick={() => speakMessage(msg.id, msg.parts?.[0]?.text || msg.content || "")}
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

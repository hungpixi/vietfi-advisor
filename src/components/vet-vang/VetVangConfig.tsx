"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { type PersonaMode, PERSONAS, setVetvangPersona } from "@/lib/vetvang-persona";

interface VetVangConfigProps {
  currentPersona: PersonaMode;
  onPersonaChange: (mode: PersonaMode) => void;
  onClose: () => void;
}

export default function VetVangConfig({ currentPersona, onPersonaChange, onClose }: VetVangConfigProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute top-14 right-4 w-[300px] z-50 rounded-2xl border border-white/10 bg-[#111318]/95 overflow-hidden backdrop-blur-xl shadow-2xl"
      style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.8)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <h3 className="text-[13px] font-bold text-white/90">Tính Cách Vẹt Vàng</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/70">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 space-y-1">
        {(Object.keys(PERSONAS) as PersonaMode[]).map((mode) => {
          const persona = PERSONAS[mode];
          const isActive = currentPersona === mode;
          return (
            <button
              key={mode}
              onClick={() => {
                setVetvangPersona(mode);
                onPersonaChange(mode);
              }}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                isActive ? `bg-white/[0.05] ${persona.border}` : "border-transparent hover:bg-white/[0.02]"
              }`}
            >
              <div className="text-2xl pt-1">{persona.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold" style={{ color: isActive ? persona.color : "#FFFFFF" }}>
                    {persona.name}
                  </span>
                  {isActive && <Check className="w-4 h-4" style={{ color: persona.color }} />}
                </div>
                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                  {persona.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

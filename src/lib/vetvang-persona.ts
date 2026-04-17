"use client";

export type PersonaMode = "mo_hon" | "chua_lanh" | "chuyen_gia";

export const PERSONAS: Record<PersonaMode, { id: PersonaMode; name: string; emoji: string; color: string; border: string; bgHover: string; desc: string }> = {
  mo_hon: { 
    id: "mo_hon", 
    name: "Mỏ Hỗn", 
    emoji: "🔥", 
    color: "#FF6B35", 
    border: "border-[#FF6B35]/30",
    bgHover: "hover:bg-[#FF6B35]/10",
    desc: "Sát muối đau thương, xéo xắt để tỉnh ngộ." 
  },
  chua_lanh: { 
    id: "chua_lanh", 
    name: "Chữa Lành", 
    emoji: "🌸", 
    color: "#22C55E", 
    border: "border-[#22C55E]/30",
    bgHover: "hover:bg-[#22C55E]/10",
    desc: "Nhẹ nhàng, an ủi, ôm ấp tâm hồn tài chính thủng lỗ." 
  },
  chuyen_gia: { 
    id: "chuyen_gia", 
    name: "Chuyên Gia", 
    emoji: "👔", 
    color: "#3B82F6", 
    border: "border-[#3B82F6]/30",
    bgHover: "hover:bg-[#3B82F6]/10",
    desc: "Khách quan, logic tuyệt đối, số liệu Wall Street." 
  }
};

export function getVetvangPersona(): PersonaMode {
  if (typeof window === "undefined") return "chuyen_gia";
  const saved = localStorage.getItem("vetvang_persona");
  if (!saved || !PERSONAS[saved as PersonaMode]) return "chuyen_gia";
  // Default demo mode should remain polite even if an old browser session saved "Mỏ Hỗn".
  if (saved === "mo_hon") return "chuyen_gia";
  return saved as PersonaMode;
}

export function setVetvangPersona(mode: PersonaMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vetvang_persona", mode);
}

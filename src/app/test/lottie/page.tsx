"use client";
import { useState } from "react";
import AnimatedParrot from "@/components/vet-vang/AnimatedParrot";

const STATES = ["idle", "celebrate", "sleepy", "angry", "thinking", "peek", "welcome", "scared", "bounce", "fly-across"] as const;

export default function AnimTestPage() {
  const [state, setState] = useState<typeof STATES[number]>("idle");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#111318",
      gap: 32
    }}>
      <h1 style={{ color: "#E6B84F", fontFamily: "sans-serif", fontSize: 28 }}>
        🦜 Vẹt Vàng Animation Test
      </h1>

      <div style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 24,
        padding: 48,
        border: "1px solid rgba(230,184,79,0.15)",
        position: "relative",
        overflow: "hidden",
        minWidth: 300, minHeight: 320,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <AnimatedParrot state={state} size={220} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600 }}>
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              border: state === s ? "2px solid #E6B84F" : "1px solid rgba(255,255,255,0.1)",
              background: state === s ? "rgba(230,184,79,0.15)" : "rgba(255,255,255,0.03)",
              color: state === s ? "#E6B84F" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: state === s ? 700 : 400,
              transition: "all 0.2s"
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

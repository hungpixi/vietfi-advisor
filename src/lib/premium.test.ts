import { describe, it, expect, beforeEach } from "vitest";
import { getPremiumState, subscribePremium } from "./premium";

describe("premium.ts", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vietfi_premium_state");
    }
  });

  it("getPremiumState returns inactive by default", () => {
    const state = getPremiumState();
    expect(state.active).toBe(false);
    expect(state.tier).toBeNull();
  });

  it("subscribePremium activates state", () => {
    const state = subscribePremium();
    expect(state.active).toBe(true);
    expect(state.tier).toBe("Vẹt Vàng VIP");
    expect(state.subscribedAt).not.toBeNull();
    expect(state.expiresAt).toBeNull(); // lifetime for Phase 2
  });

  it("subscribePremium persists to localStorage", () => {
    subscribePremium();
    const restored = getPremiumState();
    expect(restored.active).toBe(true);
  });
});

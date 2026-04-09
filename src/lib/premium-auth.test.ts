import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyPremium } from "./premium-auth";

describe("verifyPremium", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns active:false when no auth present", async () => {
    const req = new Request("http://localhost");
    const result = await verifyPremium(req);
    expect(result.active).toBe(false);
  });

  it("accepts LEGEND XP header (XP 2500)", async () => {
    const req = new Request("http://localhost", {
      headers: { "X-User-XP": "2500" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(true);
    expect(result.source).toBe("xp");
    expect(result.tier).toBe("Vẹt Vàng VIP");
  });

  it("rejects non-LEGEND XP (XP 500)", async () => {
    const req = new Request("http://localhost", {
      headers: { "X-User-XP": "500" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(false);
  });

  it("accepts vietfi_premium=active cookie", async () => {
    const req = new Request("http://localhost", {
      headers: { cookie: "vietfi_premium=active" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(true);
    expect(result.source).toBe("local");
  });

  it("rejects inactive cookie", async () => {
    const req = new Request("http://localhost", {
      headers: { cookie: "vietfi_premium=inactive" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(false);
  });

  it("accepts mock header when MOCK_AUTH_ENABLED=true", async () => {
    vi.stubEnv("MOCK_AUTH_ENABLED", "true");
    const req = new Request("http://localhost", {
      headers: { "X-Premium-Key": "vip-mock-key" },
    });
    const result = await verifyPremium(req);
    expect(result.active).toBe(true);
    expect(result.source).toBe("local");
    vi.unstubAllEnvs();
  });
});

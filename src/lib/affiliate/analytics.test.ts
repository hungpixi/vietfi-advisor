import { describe, it, expect, beforeEach } from "vitest";
import { trackEvent, flushAnalyticsQueue, getDtiBucket } from "./analytics";

describe("affiliate/analytics", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vietfi_analytics_queue");
    }
  });

  describe("trackEvent", () => {
    it("queues event to localStorage", () => {
      trackEvent({ type: "AFFILIATE_MODAL_SHOWN", dtiBucket: "high" });
      const queue = flushAnalyticsQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe("AFFILIATE_MODAL_SHOWN");
    });

    it("accumulates multiple events", () => {
      trackEvent({ type: "AFFILIATE_MODAL_SHOWN", dtiBucket: "high" });
      trackEvent({ type: "AFFILIATE_CTA_CLICK", productId: "p1", productType: "loan" });
      const queue = flushAnalyticsQueue();
      expect(queue).toHaveLength(2);
    });

    it("flushAnalyticsQueue clears the queue", () => {
      trackEvent({ type: "GOLD_AFFILIATE_CLICK", vendorId: "sjc" });
      const first = flushAnalyticsQueue();
      expect(first).toHaveLength(1);
      const second = flushAnalyticsQueue();
      expect(second).toHaveLength(0);
    });
  });

  describe("getDtiBucket", () => {
    it("returns high for DTI >= 35", () => {
      expect(getDtiBucket(35)).toBe("high");
      expect(getDtiBucket(60)).toBe("high");
    });
    it("returns medium for DTI 20-34", () => {
      expect(getDtiBucket(20)).toBe("medium");
      expect(getDtiBucket(34)).toBe("medium");
    });
    it("returns low for DTI < 20", () => {
      expect(getDtiBucket(0)).toBe("low");
      expect(getDtiBucket(19)).toBe("low");
    });
  });
});

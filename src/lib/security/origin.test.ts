import { beforeEach, describe, expect, it } from "vitest";
import {
  getCanonicalAppOrigin,
  getOriginFromHeaders,
  resolvePreferredAppOrigin,
} from "./origin";

describe("origin helpers", () => {
  const originalEnv = {
    APP_ORIGIN: process.env.APP_ORIGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  beforeEach(() => {
    process.env.APP_ORIGIN = originalEnv.APP_ORIGIN;
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = originalEnv.VERCEL_URL;
  });

  it("prefers the stable production origin over VERCEL_URL deployment hosts", () => {
    delete process.env.APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "vietfi-advisor-c17ymsivn-hungpixis-projects.vercel.app";

    expect(getCanonicalAppOrigin()).toBe("https://vietfi-advisor.vercel.app");
  });

  it("rewrites preview deployment hosts from request headers to the stable production origin", () => {
    delete process.env.APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const headers = new Headers({
      "x-forwarded-host": "vietfi-advisor-c17ymsivn-hungpixis-projects.vercel.app",
      "x-forwarded-proto": "https",
    });

    expect(getOriginFromHeaders(headers)).toBe("https://vietfi-advisor.vercel.app");
  });

  it("keeps localhost origins intact for local development", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-proto": "http",
    });

    expect(getOriginFromHeaders(headers)).toBe("http://localhost:3000");
  });

  it("rewrites preview deployment origins to the stable production origin", () => {
    delete process.env.APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(
      resolvePreferredAppOrigin("https://vietfi-advisor-c17ymsivn-hungpixis-projects.vercel.app"),
    ).toBe("https://vietfi-advisor.vercel.app");
  });
});

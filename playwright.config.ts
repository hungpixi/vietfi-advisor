/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // ── Budget tests ─────────────────────────────────────────────────────────
    // addInitScript runs BEFORE page context creation → sets onboarding_done
    // before React mounts and reads localStorage. This is the key fix.
    {
      name: "chromium-budget",
      testMatch: /budget\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addInitScript: () => localStorage.setItem("vietfi_onboarding_done", "true"),
      } as any, // TS: addInitScript not in PlaywrightTestOptions type
    },
    // ── Onboarding tests ─────────────────────────────────────────────────────
    // addInitScript clears localStorage BEFORE context creation, ensuring
    // each test starts with a fresh state (no onboarding_done flag).
    {
      name: "chromium-onboarding",
      testMatch: /onboarding\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addInitScript: () => localStorage.clear(),
      } as any,
    },
    // ── Landing tests ─────────────────────────────────────────────────────────
    // No addInitScript — landing page doesn't need special localStorage state.
    {
      name: "chromium",
      testMatch: /landing\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
});

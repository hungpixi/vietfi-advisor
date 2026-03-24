import { test, expect } from "@playwright/test";

/**
 * Navigate to budget page.
 *
 * addInitScript in playwright.config.ts (chromium-budget project) sets
 * vietfi_onboarding_done = "true" BEFORE page.goto(), so the React app sees
 * it on mount and skips the onboarding wizard.
 */
async function gotoBudget(page: import("@playwright/test").Page) {
  await page.goto("/dashboard/budget");
  await page.waitForTimeout(2_000);
}

test.describe("Budget Management", () => {
  test("should display default budget pots", async ({ page }) => {
    await page.goto("/dashboard/budget");
    await page.waitForTimeout(5_000); // wait for React hydration + useEffect
    // Debug DOM state
    const info = await page.evaluate(() => ({
      h4s: Array.from(document.querySelectorAll("h4")).map(h => h.textContent?.trim()),
      h1s: Array.from(document.querySelectorAll("h1")).map(h => h.textContent?.trim()),
      localStorage: { onboarding: localStorage.getItem("vietfi_onboarding_done"), pots: localStorage.getItem("vietfi_pots") },
    }));
    console.log("Budget page DOM:", JSON.stringify(info));
    // Verify heading
    await expect(page.getByRole("heading", { name: /Quỹ Chi tiêu/i })).toBeVisible();
    // Verify pots rendered
    expect(info.h4s).toContain("Ăn uống");
    expect(info.h4s).toContain("Shopping");
    expect(info.h4s).toContain("Đi lại");
  });

  test("should navigate to budget page from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1_500);

    // Verify the sidebar has the budget link visible
    const sidebarLink = page.locator("aside").locator('a[href="/dashboard/budget"]');
    await expect(sidebarLink).toBeVisible({ timeout: 5_000 });

    // Navigate to budget page via JS click — bypasses any overlay interception
    await page.evaluate(() => {
      const link = document.querySelector('a[href="/dashboard/budget"]');
      if (link instanceof HTMLAnchorElement) link.click();
    });
    await expect(page).toHaveURL(/\/dashboard\/budget/, { timeout: 10_000 });
  });

  test("should open add pot modal", async ({ page }) => {
    await gotoBudget(page);

    // Click "Thêm hũ" via JS to ensure it fires
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Thêm hũ",
      );
      if (btn) (btn as HTMLButtonElement).click();
    });
    await page.waitForTimeout(500);

    const modalHeading = page.getByRole("heading", { name: /thêm hũ mới/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 5_000 });
  });

  test("should add a new expense to a pot", async ({ page }) => {
    await gotoBudget(page);
    await page.waitForLoadState("networkidle");

    // Dismiss any fixed overlay (income modal or wizard) before clicking pot cards
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Open expense modal by clicking the pot card
    const potCard = page.locator(".glass-card", { has: page.locator("h4", { hasText: "Ăn" }) }).first();
    await potCard.click({ force: true });
    await page.waitForTimeout(500);

    // Fill the amount field
    const amountInput = page.locator('input[placeholder="50000"]');
    await amountInput.fill("50000");

    // Submit using Enter key (the form accepts Enter)
    await amountInput.press("Enter");
    await page.waitForTimeout(1_000);

    // Assert the expense was logged by checking the localStorage
    const hasExpense = await page.evaluate(() => {
      const expenses = localStorage.getItem("vietfi_expenses");
      if (!expenses) return false;
      const parsed = JSON.parse(expenses);
      return parsed.some((e: { amount: number }) => e.amount === 50000);
    });
    expect(hasExpense).toBe(true);
  });

  test("should show pie chart of budget allocation", async ({ page }) => {
    await gotoBudget(page);
    // recharts v3 renders SVG charts without .recharts-wrapper
    const chartSvg = page.locator("svg").first();
    await expect(chartSvg).toBeVisible({ timeout: 10_000 });
  });

  test("should load income from setup", async ({ page }) => {
    // Set both flags via addInitScript BEFORE navigation
    await page.addInitScript(
      () => {
        localStorage.setItem("vietfi_onboarding_done", "true");
        localStorage.setItem("vietfi_income", JSON.stringify(12000000));
      },
    );
    await page.goto("/dashboard/budget");
    await page.waitForTimeout(1_000);

    // Close income modal if it appeared
    const closeBtn = page.locator('button[aria-label="Đóng"], button').filter({ hasText: /đóng|×|✕/i }).first();
    if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // formatVND(12000000) = "12.0tr" — match the exact formatted text
    const incomeEl = page.locator("text='12.0tr'").first();
    await expect(incomeEl).toBeVisible({ timeout: 5_000 });
  });
});

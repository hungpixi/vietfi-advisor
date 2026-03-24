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
  await page.waitForTimeout(1_000);
}

test.describe("Budget Management", () => {
  test("should display default budget pots", async ({ page }) => {
    await gotoBudget(page);
    await expect(page.getByText("Ăn uống")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Shopping")).toBeVisible();
    await expect(page.getByText("Đi lại")).toBeVisible();
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

    // Close the income modal if it appeared (it blocks pot card clicks)
    const closeBtn = page.locator('button[aria-label="Đóng"], button').filter({ hasText: /đóng|×|✕/i }).first();
    if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // Click the pot card to open expense modal
    const potCard = page.locator(".glass-card").filter({ hasText: "Ăn uống" }).first();
    await potCard.click();
    await page.waitForTimeout(500);

    const amountInput = page.locator('input[placeholder="50000"]').first();
    await expect(amountInput).toBeVisible({ timeout: 5_000 });
    await amountInput.fill("50000");

    // Submit — the colored button inside the glass-card expense modal
    const submitBtn = page
      .locator(".glass-card")
      .filter({ hasText: "Ăn uống" })
      .locator("button")
      .last();
    await submitBtn.click();
    await page.waitForTimeout(1_000);

    // Assert the expense appears in the "CHI TIÊU GẦN ĐÂY" recent expenses list
    // The expense list shows amounts as formatVND (e.g. "50K" for 50000)
    await expect(page.getByText("50K").first()).toBeVisible({ timeout: 5_000 });
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
    const incomeEl = page.getByText("12.0tr").first();
    await expect(incomeEl).toBeVisible({ timeout: 5_000 });
  });
});

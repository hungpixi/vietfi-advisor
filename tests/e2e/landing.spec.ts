import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    // Page title / heading visible
    await expect(page.getByText("Tự do tài chính").first()).toBeVisible({ timeout: 10_000 });

    // Navbar visible
    await expect(page.locator("nav")).toBeVisible();

    // CTA button visible
    await expect(page.getByRole("link", { name: /Bắt đầu miễn phí/i })).toBeVisible();

    // No console errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("net::ERR") && !e.includes("favicon"),
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join("\n")}`).toHaveLength(0);
  });

  test("should navigate to dashboard from CTA", async ({ page }) => {
    // Set onboarding_done before navigation (addInitScript already does this,
    // but be explicit for clarity since we verified it runs before goto).
    await page.goto("/");
    await page.getByRole("link", { name: /Bắt đầu miễn phí/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard should load without the onboarding wizard
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
  });

  test("should show navigation links in navbar", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.getByText("Tính năng")).toBeVisible();
    await expect(nav.getByText("3 Bước")).toBeVisible();
    await expect(nav.getByText("Vẹt Vàng")).toBeVisible();
    await expect(nav.getByText("FAQ")).toBeVisible();
  });

  test("should show footer with risk warning", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/lời khuyên đầu tư/i)).toBeVisible();
  });
});

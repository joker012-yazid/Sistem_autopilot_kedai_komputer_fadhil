import { test, expect } from "./fixtures";

test.describe("Mobile viewport (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Owner sees bottom navigation on mobile", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");
    // Bottom nav should be visible with key items
    await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kerja" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ambil Barang" }).first()).toBeVisible();
  });

  test("Technician sees bottom navigation on mobile", async ({ technicianPage: page }) => {
    await page.goto("/scan");
    await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  });

  test("No horizontal overflow on mobile dashboard", async ({ ownerPage: page }) => {
    await page.goto("/dashboard");
    const body = page.locator("body");
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

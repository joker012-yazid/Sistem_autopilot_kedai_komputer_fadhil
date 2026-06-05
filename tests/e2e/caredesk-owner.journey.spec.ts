import { test, expect } from "./fixtures";

test.describe("Owner journey", () => {
  test("Owner login redirects to dashboard with sidebar navigation", async ({ ownerPage: page, isMobile }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Active jobs")).toBeVisible();
    
    if (isMobile) {
      // Mobile uses bottom navigation
      await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
      await expect(page.getByRole("link", { name: "Kerja" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Ambil Barang" }).first()).toBeVisible();
    } else {
      // Desktop uses sidebar navigation
      await expect(page.getByRole("link", { name: "Kerja" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Semakan" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Pelanggan" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Laporan" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Tetapan" })).toBeVisible();
    }
  });

  test("Owner can navigate Jobs page and see job board", async ({ ownerPage: page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Kerja" })).toBeVisible();
    await expect(page.locator("button", { hasText: "NEW JOB" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "READY PICKUP" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "COMPLETE" }).first()).toBeVisible();
  });

  test("Owner can navigate to Settings and see locked rules", async ({ ownerPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings Center" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Flow Rules" })).toBeVisible();
    await expect(page.getByText("Locked Rules")).toBeVisible();
    await expect(page.getByText("NEW JOB").first()).toBeVisible();
    await expect(page.getByText("COMPLETE").first()).toBeVisible();
  });

  test("Owner can navigate to Reports and see export buttons", async ({ ownerPage: page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Laporan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy Report Summary" })).toBeVisible();
  });

  test("Owner can navigate to Customers page", async ({ ownerPage: page }) => {
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Pelanggan" })).toBeVisible();
  });
});
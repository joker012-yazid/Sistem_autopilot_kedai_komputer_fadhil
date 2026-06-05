import { test, expect } from "./fixtures";

test.describe("Technician journey", () => {
  test("Technician login redirects to scan page", async ({ technicianPage: page }) => {
    await page.goto("/scan");
    await expect(page.getByRole("heading", { name: /Scan|Imbas/ }).first()).toBeVisible();
  });

  test("Technician can navigate My Jobs page", async ({ technicianPage: page }) => {
    await page.goto("/my-jobs");
    await expect(page.getByRole("heading", { name: "Kerja Saya" })).toBeVisible();
  });

  test("Technician cannot access Customers page", async ({ technicianPage: page }) => {
    await page.goto("/customers");
    await expect(page.getByText(/Akses terhad|Access restricted/)).toBeVisible();
  });

  test("Technician cannot access Settings page", async ({ technicianPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Akses terhad|Access restricted/)).toBeVisible();
  });

  test("Technician cannot access Reports export buttons", async ({ technicianPage: page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Laporan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Export PDF" })).not.toBeVisible();
    // Debug: print all button text on the page
    const buttons = await page.locator("button").allInnerTexts();
    console.log("Buttons on reports page:", JSON.stringify(buttons));
    await expect(page.getByText("Copy Report Summary")).toBeVisible();
  });
});

import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  ownerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/e2e/.auth/owner.json"
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  technicianPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "tests/e2e/.auth/technician.json"
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  }
});

export { expect };

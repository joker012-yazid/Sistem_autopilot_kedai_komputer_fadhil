import { request } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";
const SETUP_TOKEN = process.env.CAREDESK_SETUP_TOKEN ?? "local-setup-token-minimum-16-characters";
const WEB_ORIGIN = process.env.CAREDESK_WEB_ORIGIN ?? process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000";
const AUTH_DIR = "tests/e2e/.auth";

export const testAccounts = {
  owner: { email: "fadhil@example.com", password: "OwnerPass123!" },
  technician: { email: `tech-${Date.now()}@fadhil.local`, password: "TechPass123!" }
};

async function setupOwner(apiContext) {
  const res = await apiContext.post(`${API_BASE_URL}/caredesk/auth/setup`, {
    headers: { origin: WEB_ORIGIN },
    data: {
      setupToken: SETUP_TOKEN,
      name: "Fadhil Owner",
      email: testAccounts.owner.email,
      password: testAccounts.owner.password
    }
  });
  if (!res.ok() && res.status() !== 409) {
    const text = await res.text();
    console.error("Owner setup failed:", text);
    throw new Error(`Owner setup failed: ${text}`);
  }
}

async function createTechnician(apiContext) {
  const loginRes = await apiContext.post(`${API_BASE_URL}/caredesk/auth/login`, {
    headers: { origin: WEB_ORIGIN },
    data: {
      email: testAccounts.owner.email,
      password: testAccounts.owner.password
    }
  });
  if (!loginRes.ok()) {
    const text = await loginRes.text();
    console.error("Owner login failed:", text);
    throw new Error(`Owner login failed: ${text}`);
  }

  const userRes = await apiContext.post(`${API_BASE_URL}/caredesk/users`, {
    headers: { origin: WEB_ORIGIN },
    data: {
      name: "Technician A",
      email: testAccounts.technician.email,
      role: "technician",
      password: testAccounts.technician.password
    }
  });
  if (!userRes.ok() && userRes.status() !== 409) {
    const text = await userRes.text();
    console.error("Technician creation failed:", text);
    throw new Error(`Technician creation failed: ${text}`);
  }
}

export default async function globalSetup() {
  const apiContext = await request.newContext({ baseURL: API_BASE_URL });
  mkdirSync(AUTH_DIR, { recursive: true });

  await setupOwner(apiContext);
  await createTechnician(apiContext);

  // Save owner session
  await apiContext.post(`${API_BASE_URL}/caredesk/auth/login`, {
    headers: { origin: WEB_ORIGIN },
    data: {
      email: testAccounts.owner.email,
      password: testAccounts.owner.password
    }
  });

  const ownerStorage = await apiContext.storageState();
  writeFileSync(`${AUTH_DIR}/owner.json`, JSON.stringify(ownerStorage, null, 2));

  // Save technician session
  await apiContext.post(`${API_BASE_URL}/caredesk/auth/login`, {
    headers: { origin: WEB_ORIGIN },
    data: {
      email: testAccounts.technician.email,
      password: testAccounts.technician.password
    }
  });

  const techStorage = await apiContext.storageState();
  writeFileSync(`${AUTH_DIR}/technician.json`, JSON.stringify(techStorage, null, 2));

  await apiContext.dispose();
}

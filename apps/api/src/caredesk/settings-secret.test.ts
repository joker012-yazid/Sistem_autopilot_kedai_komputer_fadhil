import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSettingsEncryptionSecret } from "./settings-secret";

const previousEnv = {
  key: process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY,
  keyFile: process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE
};

let tempDirs: string[] = [];

describe("settings encryption secret bootstrap", () => {
  afterEach(() => {
    restoreEnv("CAREDESK_SETTINGS_ENCRYPTION_KEY", previousEnv.key);
    restoreEnv("CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE", previousEnv.keyFile);
    for (const dir of tempDirs) {
      rmSync(dir, { force: true, recursive: true });
    }
    tempDirs = [];
  });

  it("reuses an existing valid environment secret without creating a local env file", () => {
    const cwd = makeTempDir();
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY = "existing-valid-settings-secret";
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE;

      expect(resolveSettingsEncryptionSecret()).toBe("existing-valid-settings-secret");
      expect(existsSync(join(cwd, ".env"))).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("generates and persists a local env secret when the environment value is missing", () => {
    const cwd = makeTempDir();
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY;
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE;

      const secret = resolveSettingsEncryptionSecret();

      expect(secret.length).toBeGreaterThanOrEqual(32);
      expect(process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY).toBe(secret);
      const envText = readFileSync(join(cwd, ".env"), "utf8");
      expect(envText).toContain(`CAREDESK_SETTINGS_ENCRYPTION_KEY=${secret}`);
      expect(envText).not.toContain("sk-owner-secret");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("reuses an existing valid local env secret when the process env is missing", () => {
    const cwd = makeTempDir();
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY;
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE;
      writeFileSync(join(cwd, ".env"), "CAREDESK_SETTINGS_ENCRYPTION_KEY='local-valid-settings-secret'\n");

      expect(resolveSettingsEncryptionSecret()).toBe("local-valid-settings-secret");
      expect(process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY).toBe("local-valid-settings-secret");
      expect(readFileSync(join(cwd, ".env"), "utf8")).toContain("'local-valid-settings-secret'");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("replaces placeholder local env values instead of using them for encryption", () => {
    const cwd = makeTempDir();
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY;
      delete process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE;
      writeFileSync(join(cwd, ".env"), "DATABASE_URL=postgresql://local\nCAREDESK_SETTINGS_ENCRYPTION_KEY=replace-with-a-random-long-settings-encryption-key\n");

      const secret = resolveSettingsEncryptionSecret();
      const envText = readFileSync(join(cwd, ".env"), "utf8");

      expect(secret).not.toBe("replace-with-a-random-long-settings-encryption-key");
      expect(envText).toContain("DATABASE_URL=postgresql://local");
      expect(envText).toContain(`CAREDESK_SETTINGS_ENCRYPTION_KEY=${secret}`);
      expect(envText).not.toContain("replace-with-a-random-long-settings-encryption-key");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("persists a generated secret to the configured key file when one is provided", () => {
    const cwd = makeTempDir();
    const keyFile = join(cwd, "persisted", "settings-encryption.key");
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY = "replace-with-a-random-long-settings-encryption-key";
      process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE = keyFile;

      const secret = resolveSettingsEncryptionSecret();

      expect(readFileSync(keyFile, "utf8").trim()).toBe(secret);
      expect(process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY).toBe(secret);
      expect(existsSync(join(cwd, ".env"))).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "caredesk-settings-secret-"));
  tempDirs.push(dir);
  return dir;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

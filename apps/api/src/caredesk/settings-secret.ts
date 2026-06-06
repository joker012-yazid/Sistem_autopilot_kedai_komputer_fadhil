import { BadRequestException } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";

const settingsEncryptionKeyEnv = "CAREDESK_SETTINGS_ENCRYPTION_KEY";
const settingsEncryptionKeyFileEnv = "CAREDESK_SETTINGS_ENCRYPTION_KEY_FILE";
const placeholderPattern = /replace-with|change-me|changeme|placeholder|example/i;

export function settingsEncryptionKey(): Buffer {
  return createHash("sha256").update(resolveSettingsEncryptionSecret()).digest();
}

export function resolveSettingsEncryptionSecret(): string {
  const envSecret = process.env[settingsEncryptionKeyEnv]?.trim();
  if (isUsableSettingsEncryptionSecret(envSecret)) {
    return envSecret;
  }

  const keyFile = process.env[settingsEncryptionKeyFileEnv]?.trim();
  if (keyFile) {
    const fileSecret = readSecretFile(keyFile);
    if (isUsableSettingsEncryptionSecret(fileSecret)) {
      process.env[settingsEncryptionKeyEnv] = fileSecret;
      return fileSecret;
    }
    return persistGeneratedSecretToFile(keyFile);
  }

  const localEnvSecret = readLocalEnvSecret();
  if (isUsableSettingsEncryptionSecret(localEnvSecret)) {
    process.env[settingsEncryptionKeyEnv] = localEnvSecret;
    return localEnvSecret;
  }

  return persistGeneratedSecretToLocalEnv();
}

export function isUsableSettingsEncryptionSecret(secret: string | undefined): secret is string {
  return Boolean(secret && secret.length >= 16 && !placeholderPattern.test(secret));
}

function persistGeneratedSecretToFile(filePath: string): string {
  const secret = generateSettingsEncryptionSecret();
  const resolvedPath = resolve(filePath);
  try {
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, `${secret}\n`, { encoding: "utf8", flag: "w", mode: 0o600 });
  } catch (error) {
    throw new BadRequestException(`Unable to persist ${settingsEncryptionKeyEnv} to ${resolvedPath}: ${errorMessage(error)}`);
  }
  process.env[settingsEncryptionKeyEnv] = secret;
  return secret;
}

function persistGeneratedSecretToLocalEnv(): string {
  const secret = generateSettingsEncryptionSecret();
  const envFile = localEnvFilePath();
  const nextText = upsertEnvLine(readFileIfExists(envFile), settingsEncryptionKeyEnv, secret);
  try {
    mkdirSync(dirname(envFile), { recursive: true });
    writeFileSync(envFile, nextText, "utf8");
  } catch (error) {
    throw new BadRequestException(`Unable to persist ${settingsEncryptionKeyEnv} to ${envFile}: ${errorMessage(error)}`);
  }
  process.env[settingsEncryptionKeyEnv] = secret;
  return secret;
}

function generateSettingsEncryptionSecret(): string {
  return randomBytes(32).toString("base64url");
}

function readSecretFile(filePath: string): string | undefined {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8").trim() : undefined;
  } catch {
    return undefined;
  }
}

function localEnvFilePath(): string {
  const candidates = candidateEnvFiles();
  const withKey = candidates.find((filePath) => envFileContainsKey(filePath, settingsEncryptionKeyEnv));
  if (withKey) {
    return withKey;
  }
  return candidates.find((filePath) => existsSync(filePath)) ?? join(resolve(process.cwd()), ".env");
}

function candidateEnvFiles(): string[] {
  const paths: string[] = [];
  let current = resolve(process.cwd());
  for (let depth = 0; depth < 5; depth += 1) {
    paths.push(join(current, ".env"));
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return paths;
}

function readLocalEnvSecret(): string | undefined {
  for (const filePath of candidateEnvFiles()) {
    const secret = readEnvValue(readFileIfExists(filePath), settingsEncryptionKeyEnv);
    if (secret !== undefined) {
      return secret;
    }
  }
  return undefined;
}

function envFileContainsKey(filePath: string, key: string): boolean {
  return readFileIfExists(filePath).split(/\r?\n/).some((line) => line.trimStart().startsWith(`${key}=`));
}

function readEnvValue(text: string, key: string): string | undefined {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0 || line.slice(0, separatorIndex).trim() !== key) {
      continue;
    }
    return parseEnvValue(line.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

function parseEnvValue(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function readFileIfExists(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function upsertEnvLine(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const lines = text ? text.split(/\r?\n/) : [];
  let replaced = false;
  const nextLines = lines.map((current) => {
    if (current.trimStart().startsWith(`${key}=`)) {
      replaced = true;
      return line;
    }
    return current;
  });

  if (!replaced) {
    if (nextLines.length > 0 && nextLines.at(-1) === "") {
      nextLines.splice(nextLines.length - 1, 0, line);
    } else {
      nextLines.push(line);
    }
  }

  return `${nextLines.join("\n").replace(/\n*$/, "")}\n`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

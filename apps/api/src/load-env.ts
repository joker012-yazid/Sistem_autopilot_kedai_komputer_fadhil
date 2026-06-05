import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const visited = new Set<string>();

for (const filePath of candidateEnvFiles()) {
  if (visited.has(filePath) || !existsSync(filePath)) {
    continue;
  }
  visited.add(filePath);
  loadEnvFile(filePath);
}

function candidateEnvFiles() {
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

function loadEnvFile(filePath: string) {
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = parseEnvValue(line.slice(separatorIndex + 1).trim());
  }
}

function parseEnvValue(value: string) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

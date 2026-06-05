import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caredeskOpenApiMetadata } from "../../apps/api/src/openapi";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiSourceRoot = path.join(repoRoot, "apps/api/src");

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return controllerFiles(fullPath);
    }
    return entry.name.endsWith(".controller.ts") ? [fullPath] : [];
  });
}

function routeSignature(method: string, controllerPath: string, routePath: string | undefined) {
  const combined = [controllerPath, routePath].filter(Boolean).join("/");
  const normalizedPath = `/${combined}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return `${method.toUpperCase()} ${normalizedPath || "/"}`;
}

function implementedRoutes() {
  return controllerFiles(apiSourceRoot)
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const controllerMatch = source.match(/@Controller\((?:"([^"]*)"|'([^']*)')?\)/);
      const controllerPath = controllerMatch?.[1] ?? controllerMatch?.[2] ?? "";
      const methods = [...source.matchAll(/@(Get|Post|Put|Patch|Delete)\((?:"([^"]*)"|'([^']*)')?\)/g)];
      return methods.map((match) => routeSignature(match[1], controllerPath, match[2] ?? match[3]));
    })
    .sort();
}

function normalizeRouteSignature(signature: string) {
  return signature.replace(/:[^/]+/g, "{param}");
}

describe("OpenAPI route coverage", () => {
  it("keeps implemented CareDesk controller routes represented in active API metadata", () => {
    const implemented = implementedRoutes().map(normalizeRouteSignature).sort();
    const metadata = caredeskOpenApiMetadata.endpoints.map(normalizeRouteSignature).sort();

    expect(implemented).toEqual(metadata);
  });

  it("does not expose legacy roles, quotation, payment, invoice, or approval-link routes", () => {
    const activeRoutes = caredeskOpenApiMetadata.endpoints.join(" ");
    const forbiddenLegacyRouteTerms = ["store" + "_" + "staff", "quotation", "payment", "invoice", "approval-links"];
    expect(activeRoutes).not.toMatch(new RegExp(forbiddenLegacyRouteTerms.join("|"), "i"));
  });

  it("keeps active source free of legacy roles and Prisma v1 role enum", () => {
    const activeRoots = [
      path.join(repoRoot, "apps/api/src"),
      path.join(repoRoot, "packages/database/prisma"),
      path.join(repoRoot, "packages/test-utils/src")
    ];
    const source = activeRoots.flatMap(sourceFiles).map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toContain("store" + "_" + "staff");
    expect(source).not.toContain("owner" + "_" + "manager");
    expect(source).not.toContain("enum" + " Role");
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(fullPath);
    }
    return /\.(ts|prisma)$/.test(entry.name) ? [fullPath] : [];
  });
}

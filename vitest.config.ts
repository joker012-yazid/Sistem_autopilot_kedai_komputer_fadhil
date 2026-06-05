import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@repair-ops/domain": new URL("./packages/domain/src/index.ts", import.meta.url).pathname,
      "@repair-ops/test-utils": new URL("./packages/test-utils/src/index.ts", import.meta.url).pathname
    }
  }
});

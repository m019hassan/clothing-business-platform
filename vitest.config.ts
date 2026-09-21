import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    alias: {
      // The services import "server-only", which throws outside a React Server
      // environment. Tests exercise them as plain server modules.
      "server-only": path.resolve(rootDir, "tests/stubs/server-only.ts"),
      "@": rootDir,
    },
  },
});

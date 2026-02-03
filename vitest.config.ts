import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.ts", "client/src/**/*.spec.ts", "client/src/**/*.test.tsx", "client/src/**/*.spec.tsx"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "server/**/*.ts",
        "client/src/**/*.ts",
        "client/src/**/*.tsx"
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/node_modules/**",
        "**/dist/**",
        "server/_core/**",
        "**/*.d.ts"
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
  },
});

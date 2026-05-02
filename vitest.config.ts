import { defineConfig } from "vitest/config";
import { cpus } from "os";
const CPU_CORES = cpus().length;
const IS_CI = Boolean(process.env.CI);
import react from "@vitejs/plugin-react";

const CPU_CORES = cpus().length;
const IS_CI = Boolean(process.env.CI);
const MAX_WORKERS = IS_CI ? Math.max(1, Math.min(2, CPU_CORES)) : Math.max(1, Math.min(4, CPU_CORES));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./vitest.setup.ts",
    exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**"],
    maxWorkers: MAX_WORKERS,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "vitest.setup.ts", "vite.config.ts", "**/e2e/**"],
    },
  },
});

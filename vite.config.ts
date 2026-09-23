import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { localAiProxy } from "./scripts/localAiProxy";

export default defineConfig(({ mode }) => ({
  // Relative assets work in both Capacitor's Android WebView and a repository-level
  // static host such as GitHub Pages. Hosting remains a delivery target, not a fork.
  base: "./",
  plugins: [react(), localAiProxy(loadEnv(mode, process.cwd(), "").OPENROUTER_API_KEY?.trim() ?? "")],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/zod")) return "schema-vendor";
          if (id.includes("node_modules/react")) return "react-vendor";
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
}));

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative assets work in both Capacitor's Android WebView and a repository-level
  // static host such as GitHub Pages. Hosting remains a delivery target, not a fork.
  base: "./",
  plugins: [react()],
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
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});

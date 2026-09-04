import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ug.tegeera.app",
  appName: "Tegeera",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;

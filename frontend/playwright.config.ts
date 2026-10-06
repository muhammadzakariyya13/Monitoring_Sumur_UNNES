import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: "http://localhost:4173", channel: "chrome", headless: true },
  webServer: {
    command: "node scripts/serve-static.mjs 4173",
    url: "http://localhost:4173/login/",
    reuseExistingServer: false,
  },
});

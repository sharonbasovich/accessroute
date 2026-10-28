import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const localChrome = process.platform === "win32" && existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined;
export default defineConfig({
  testDir: "./tests", testMatch: "*.spec.js", workers: 1, timeout: 60000,
  reporter: [["list"], ["json", { outputFile: "evidence/test-results.json" }]],
  use: { baseURL: process.env.ACCESSROUTE_TEST_URL || "http://127.0.0.1:5173", headless: true,
    launchOptions: localChrome ? { executablePath: localChrome } : {} },
  webServer: process.env.ACCESSROUTE_TEST_URL ? undefined : {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173", reuseExistingServer: false,
  },
});

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * E2E + accessibility runs against the local production server (`next start`).
 * `npm run e2e` builds first; `npm run e2e:quick` reuses an existing build. The server runs with AI_PROVIDER=offline
 * (real env vars override .env.local), so Ask the Flame is exercised in offline mode.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  workers: 4,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        // Run the copilot offline in tests: deterministic answers, no provider quota, and it proves the no-key path.
        env: { AI_PROVIDER: "offline" },
      },
});

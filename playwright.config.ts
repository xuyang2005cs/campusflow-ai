import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'cross-env CAMPUSFLOW_DB_PATH=data/e2e.db CAMPUSFLOW_SEED_DEMO=1 npm run start',
    url: 'http://127.0.0.1:4173/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'msedge', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
});

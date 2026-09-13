import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:8123', trace: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 8123', url: 'http://localhost:8123/index.html', reuseExistingServer: true, timeout: 10000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});

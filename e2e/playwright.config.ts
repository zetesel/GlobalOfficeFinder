import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run -s dev',
    port: 5173,
    reuseExistingServer: !process.env.CI
  },
})

import { defineConfig, devices } from '@playwright/test';
import { cpus } from 'os';
const CPU_CORES = cpus().length;
const CI = Boolean(process.env.CI);

/**
 * Playwright configuration for end-to-end testing of GlobalOfficeFinder
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  
  // Run tests in parallel with a CI-safe cap
  workers: CI ? 2 : Math.min(3, CPU_CORES),
  
  // Number of retries for failed tests
  retries: 1,
  
  // Timeout for each test
  timeout: 30 * 1000,
  
  // Timeout for expect() assertions
  expect: {
    timeout: 5000,
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['list'],
  ],

  // Global setup
  globalSetup: undefined,
  globalTeardown: undefined,

  // Use baseURL for relative navigation
  use: {
    baseURL: 'http://localhost:5173',
    trace: CI ? 'off' : 'on-first-retry',
    screenshot: CI ? 'off' : 'only-on-failure',
    video: CI ? 'off' : 'retain-on-failure',
  },

  // Configure web server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Configure projects for different browsers and viewports
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});

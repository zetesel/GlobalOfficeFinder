import { defineConfig, devices } from '@playwright/test';
const CI = Boolean(process.env.CI);
const SMOKE = Boolean(process.env.CI_SMOKE);

/**
 * Playwright configuration for end-to-end testing of GlobalOfficeFinder
 */
// Optionally run a smoke subset on CI when CI_SMOKE is set
export default defineConfig({
  testDir: SMOKE ? './e2e/smoke' : './e2e',
  testMatch: '**/*.spec.ts',
  
  // Run tests in 3 worker processes in parallel
  workers: 3,
  
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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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

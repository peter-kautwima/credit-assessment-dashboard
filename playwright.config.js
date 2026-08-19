import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: '**/*.pw.js',
	fullyParallel: false,
	workers: 1,
	reporter: 'line',
	use: {
		baseURL: 'http://localhost:5173',
		channel: 'chrome',
		headless: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
})

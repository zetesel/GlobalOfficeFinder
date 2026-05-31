import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is '/' for local dev; set to '/GlobalOfficeFinder/' for GitHub Pages
// via VITE_BASE_URL env variable in CI
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? '/',
})

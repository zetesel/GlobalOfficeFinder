import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Base path is '/' for local dev; set to '/GlobalOfficeFinder/' for GitHub Pages
// via VITE_BASE_URL env variable in CI
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? '/',
  server: {
    proxy: {
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        headers: {
          'User-Agent': 'GlobalOfficeFinder/1.0 (office review geocoding)',
        },
      },
    },
  },
})

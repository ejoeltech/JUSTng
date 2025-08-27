import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Removed proxy - API calls now go directly to Vercel Functions
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

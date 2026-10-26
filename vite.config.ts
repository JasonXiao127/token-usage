import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const base = process.env.BASE_PATH || '/token-usage/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
})

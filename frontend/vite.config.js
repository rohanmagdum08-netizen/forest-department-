import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const production = process.env.NODE_ENV === 'production'
export default defineConfig({
  base: production ? '/static/frontend/' : '/',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } } },
  build: { outDir: '../static/frontend', emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'assets/admin.js', chunkFileNames: 'assets/chunk-[hash].js', assetFileNames: 'assets/admin.[ext]' } } }
})

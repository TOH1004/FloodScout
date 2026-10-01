import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces so phone can connect over Wi-Fi
    port: 5173,
    proxy: {
      '/esp32-api': {
        target: 'http://10.185.112.106',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/esp32-api/, '/api'),
      },
    },
  },
})

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
      '/video_feed': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/camera': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/detection': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/incidents': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/captures': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

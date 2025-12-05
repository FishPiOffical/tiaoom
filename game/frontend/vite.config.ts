import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:27015',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:27015',
        ws: true,
        changeOrigin: true
      }
    },
    allowedHosts: true,
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: '../dist/public',
  }
})

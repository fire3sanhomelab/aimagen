import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI Imagen',
        short_name: 'AIMagen',
        description: 'AI Image & Video Generation',
        theme_color: '#EC4899',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    sourcemap: true
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3457',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3457',
        changeOrigin: true
      }
    }
  }
})

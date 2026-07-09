import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globDirectory: 'dist',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2,json}'
        ]},
      manifest: {
        name: 'Vereda — Estudo Espírita',
        short_name: 'Vereda',
        description: 'Leitura diária das obras básicas do Espiritismo',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#7B5EA7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false }, // SW só no build; dev continua limpo
    }),
  ],
  server: { host: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
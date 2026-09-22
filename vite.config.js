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
          '**/*.{js,css,html,ico,png,jpg,webp,svg,woff,woff2,json}'
        ],
        globIgnores: [
          '**/node_modules/**/*',
          'sw.js',
          'workbox-*.js'
        ]
      },
      manifest: {
        name: 'Vereda — Estudo Espírita',
        short_name: 'Vereda',
        description: 'App de estudo guiado da doutrina espírita',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F0E7',
        theme_color: '#F5F0E7',
        icons: [
          {
            src: '/vereda-logo-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/vereda-logo-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true, allowedHosts: ['terminal.local'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})

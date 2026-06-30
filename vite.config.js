import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base: ścieżka, pod którą aplikacja jest hostowana.
// Dla GitHub Pages (https://USER.github.io/workt/) ustaw VITE_BASE=/workt/.
const base = process.env.VITE_BASE || './';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Protokoły kontroli budynku',
        short_name: 'Protokoły',
        description: 'Tworzenie protokołów okresowej kontroli stanu technicznego — zdjęcia + głos (PL), eksport do Word.',
        lang: 'pl',
        theme_color: '#1f6feb',
        background_color: '#f4f6f8',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 2000,
  },
});

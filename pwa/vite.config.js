import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from a GitHub Pages project subpath (robynm.github.io/poppy/),
// so hashed asset URLs must be prefixed with /poppy/.
export default defineConfig({
  base: '/poppy/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Static assets in public/ that aren't in the module graph but should be precached.
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Poppy',
        short_name: 'Poppy',
        description:
          'Cultivate your closet. Tag the pieces you own and compose looks worth keeping.',
        id: '/poppy/',
        start_url: '/poppy/',
        scope: '/poppy/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFBF6',
        theme_color: '#FF5A36',
        lang: 'en',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});

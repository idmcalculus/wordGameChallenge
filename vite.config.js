import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';
import viteCompression from 'vite-plugin-compression';
import { resolve } from 'path';

// Check if we're using Bun
const isBun = typeof process.versions.bun !== 'undefined';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    // Optimize for Bun when available
    optimizeDeps: {
      // Bun has faster native ESM support
      esbuildOptions: {
        target: isBun ? 'esnext' : 'es2020',
      }
    },
    // Configuration will be merged with the css config below
    root: 'src',
    publicDir: '../public',
    base: './',
    
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: !isProduction, // Enable sourcemaps in development
      assetsInlineLimit: 4096, // Don't inline assets larger than 4kb
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.html'),
        },
        output: {
          manualChunks: {
            'game-logic': ['./js/WordGame.js'],
            'ui-components': ['./js/uiHandler.js', './js/modals.js'],
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[ext]/[name]-[hash][extname]';
          }
        }
      },
      minify: isProduction ? 'terser' : false,
    },
    
    server: {
      port: 8080,
      hot: true,
    },
    
    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          charset: false,
          // Fix Sass deprecation warning by using modern API
          sassOptions: {
            outputStyle: isProduction ? 'compressed' : 'expanded',
          }
        }
      }
    },
    
    plugins: [
      legacy({
        targets: ['defaults', 'not IE 11']
      }),
      
      // PWA plugin to replace workbox-webpack-plugin
      VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Word Game Challenge',
          short_name: 'Word Game',
          description: 'A modern, browser-based word guessing game',
          theme_color: '#4a90e2',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '32x32',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '72x72',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '96x96',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '128x128',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '144x144',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '152x152',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '384x384',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: new RegExp('^https://api\\.datamuse\\.com/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
              },
            },
          ],
        }
      }),
      
      // Compression plugin to replace compression-webpack-plugin
      ...(isProduction ? [
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240, // Only compress files larger than 10kb
          deleteOriginFile: false,
        })
      ] : [])
    ],
    
    // Environment variables handling
    envPrefix: ['VITE_', 'APP_'],
    
    // Resolve paths
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  };
});

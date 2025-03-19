/**
 * Register the service worker for production builds
 * 
 * Note: When using vite-plugin-pwa, the service worker registration is handled automatically
 * by the plugin in production builds. This function is kept for compatibility or manual registration
 * if needed.
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // With Vite PWA plugin, the service worker is generated at build time with a different name
      // The plugin handles registration automatically, but we can manually register if needed
      if (import.meta.env.PROD) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      }
    });
  }
}

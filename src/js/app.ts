// Import styles - Vite handles SCSS processing
import '../scss/main.scss';

// Import game modules
import GameController from './controllers/GameController';
import { setupModals } from './modals';
import { registerServiceWorker } from './serviceWorkerRegistration';
import { initializeThemeManager } from './themeManager';
import { installGlobalErrorHandlers, getCapturedErrors, clearCapturedErrors } from './utils/errorReporter';

installGlobalErrorHandlers();

/**
 * Initializes the application when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Helpful for production debugging without noisy console logs.
  window.getWordGameClientErrors = getCapturedErrors;
  window.clearWordGameClientErrors = clearCapturedErrors;

  initializeThemeManager();
  const game = new GameController();
  const teardownModals = setupModals({
    onOpenStats: () => {
      game.displayStats();
    }
  });

  window.addEventListener('beforeunload', () => {
    teardownModals();
    game.destroy();
  }, { once: true });
});

// Register service worker for offline functionality
registerServiceWorker();

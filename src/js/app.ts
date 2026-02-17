// Import styles - Vite handles SCSS processing
import '../scss/main.scss';

// Import game modules
import WordGame from './WordGame';
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
  const game = new WordGame();
  window.game = game;
  setupModals({
    getGame: () => game
  });
});

// Register service worker for offline functionality
registerServiceWorker();

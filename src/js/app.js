// Import styles - Vite handles SCSS processing
import '../scss/main.scss';

// Import game modules
import WordGame from './WordGame.js';
import { setupModals } from './modals.js';
import { registerServiceWorker } from './serviceWorkerRegistration.js';
import { initializeThemeManager } from './themeManager.js';
import { installGlobalErrorHandlers, getCapturedErrors, clearCapturedErrors } from './utils/errorReporter.js';

installGlobalErrorHandlers();

/**
 * Initializes the application when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Helpful for production debugging without noisy console logs.
  window.getWordGameClientErrors = getCapturedErrors;
  window.clearWordGameClientErrors = clearCapturedErrors;

  initializeThemeManager();
  setupModals();
  // Initialize the game and store instance on window for access by modals
  window.game = new WordGame();
});

// Register service worker for offline functionality
registerServiceWorker();

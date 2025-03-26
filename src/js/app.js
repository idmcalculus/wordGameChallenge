// Import styles - Vite handles SCSS processing
import '../scss/main.scss';

// Import game modules
import WordGame from './WordGame.js';
import { setupModals } from './modals.js';
import { registerServiceWorker } from './serviceWorkerRegistration.js';

document.addEventListener('DOMContentLoaded', () => {
  setupModals();
  // Initialize the game and store instance on window for access by modals
  window.game = new WordGame();
});

// Register service worker for offline functionality
registerServiceWorker();

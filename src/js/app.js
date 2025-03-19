// Import styles - Vite handles SCSS processing
import '../scss/main.scss';

// Import game modules
import WordGame from './WordGame.js';
import { setupModals } from './modals.js';
import { registerServiceWorker } from './serviceWorkerRegistration.js';

document.addEventListener('DOMContentLoaded', () => {
  setupModals();
  // Initialize the game - variable is needed to maintain the instance
  new WordGame();
});

// Register service worker for offline functionality
registerServiceWorker();

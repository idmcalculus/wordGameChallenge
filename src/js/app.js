import '../scss/main.scss';
import WordGame from './WordGame.js';
import { setupModals } from './modals.js';
import { registerServiceWorker } from './serviceWorkerRegistration.js';

document.addEventListener('DOMContentLoaded', () => {
  setupModals();
  const game = new WordGame();
});

// Register service worker for offline functionality
registerServiceWorker();

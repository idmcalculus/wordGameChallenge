import WordGame from './WordGame.js';
import { setupModals } from './modals.js';

document.addEventListener("DOMContentLoaded", () => {
    setupModals();
    const game = new WordGame();
});

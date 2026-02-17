import { createConfetti } from './utils/confetti.js';
import { logger } from './utils/logger.js';

let alertCallback = null;
let tryAgainCallback = null;
let isGameStartAlert = false;
let isGameResultAlert = false;
let alertCloseCallback = null;

function resetAlertState() {
  alertCallback = null;
  tryAgainCallback = null;
  isGameStartAlert = false;
  isGameResultAlert = false;
  alertCloseCallback = null;
}

function handleAlertCloseFromDismiss() {
  if (isGameStartAlert && alertCallback) {
    alertCallback();
  }

  if (isGameResultAlert && alertCloseCallback) {
    alertCloseCallback();
  }

  resetAlertState();
}

/**
 * Sets up the modal event listeners and elements.
 */
export function setupModals() {
  // Alert Modal Elements
  const alertModal = document.getElementById('alertModal');
  const alertClose = document.querySelector('#alertModal .close');
  const alertResetButton = document.getElementById('alertResetButton');
  const alertTryAgainButton = document.getElementById('alertTryAgainButton');

  // How to Play Modal Elements
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const howToPlayModal = document.getElementById('howToPlayModal');
  const howToPlayClose = document.querySelector('#howToPlayModal .close');

  // Stats Modal Elements
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const statsClose = document.querySelector('#statsModal .close');

  // About Modal Elements
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const aboutClose = document.querySelector('#aboutModal .close');

  // Alert Modal Event Listeners
  alertClose.onclick = () => {
    alertModal.style.display = 'none';
    handleAlertCloseFromDismiss();
  };

  alertTryAgainButton.onclick = () => {
    alertModal.style.display = 'none';
    if (tryAgainCallback) {
      tryAgainCallback();
    }
    resetAlertState();
  };

  alertResetButton.onclick = () => {
    alertModal.style.display = 'none';
    if (alertCallback) {
      alertCallback();
    }
    resetAlertState();
  };

  // How to Play Modal Event Listeners
  howToPlayBtn.onclick = () => {
    howToPlayModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  howToPlayClose.onclick = () => {
    howToPlayModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  };

  // Stats Modal Event Listeners
  statsBtn.onclick = () => {
    const game = window.game;
    if (game) {
      // First show the modal
      statsModal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      
      // Then display stats with a slight delay to ensure modal is visible
      setTimeout(() => {
        game.displayStats();
      }, 50);
    } else {
      logger.error(new Error('Game instance not found'), { source: 'statsModal.open' });
    }
  };

  statsClose.onclick = () => {
    statsModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  };

  // About Modal Event Listeners
  if (aboutBtn && aboutModal && aboutClose) {
    aboutBtn.onclick = () => {
      aboutModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    aboutClose.onclick = () => {
      aboutModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };
  }

  // Close modals when clicking outside
  window.onclick = (event) => {
    if (event.target === alertModal) {
      alertModal.style.display = 'none';
      handleAlertCloseFromDismiss();
    }
    if (event.target === howToPlayModal) {
      howToPlayModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
    if (event.target === statsModal) {
      statsModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
    if (aboutModal && event.target === aboutModal) {
      aboutModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  };

  // Handle ESC key to close modals
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (howToPlayModal.style.display === 'flex') {
        howToPlayModal.style.display = 'none';
        document.body.style.overflow = '';
      }
      if (alertModal.style.display === 'flex') {
        alertModal.style.display = 'none';
        handleAlertCloseFromDismiss();
      }
      if (aboutModal && aboutModal.style.display === 'flex') {
        aboutModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    }
  });
}

/**
 * Displays an alert modal with a message and optional callbacks.
 * @param {string} message - The message to display in the alert.
 * @param {function} tryAgainCb - Callback for the "Try Again" button.
 * @param {function} resetCb - Callback for the "Reset" button.
 * @param {boolean} isGameStart - Indicates if this is a game start alert.
 * @param {string} tryAgainText - Text for the "Try Again" button.
 * @param {string} resetText - Text for the "Reset" button.
 * @param {Object} options - Additional options.
 * @param {boolean} options.isGameResult - Indicates if this is an end-game result alert.
 * @param {function} options.onClose - Callback invoked when the alert is dismissed with X/backdrop/ESC.
 */
export function showAlert(
  message,
  tryAgainCb,
  resetCb,
  isGameStart = false,
  tryAgainText = 'Try Again',
  resetText = 'Reset Game',
  options = {}
) {
  const alertMessage = document.getElementById('alertMessage');
  const alertModal = document.getElementById('alertModal');
  const alertTryAgainButton = document.getElementById('alertTryAgainButton');
  const alertResetButton = document.getElementById('alertResetButton');
  const alertButtonsContainer = document.querySelector('.alert-buttons');

  alertMessage.innerHTML = message;
  alertModal.style.display = 'flex';
  alertModal.style.alignItems = 'center';
  alertModal.style.justifyContent = 'center';
  
  // Trigger confetti if this is a success message
  if (message.includes('success-alert') || message.includes('🎉') || message.includes('Congratulations')) {
    setTimeout(() => createConfetti(), 100);
  }
  
  // Set button text
  alertTryAgainButton.textContent = tryAgainText;
  alertResetButton.textContent = resetText;
  
  // Show/hide Try Again button based on whether a callback was provided
  if (tryAgainCb) {
    alertTryAgainButton.style.display = 'inline-block';
    tryAgainCallback = tryAgainCb;
  } else {
    alertTryAgainButton.style.display = 'none';
    tryAgainCallback = null;
  }
  
  // Set reset callback
  alertCallback = resetCb;
  
  // Set the game start alert flag
  isGameStartAlert = isGameStart;
  isGameResultAlert = Boolean(options.isGameResult);
  alertCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;
  
  // Center the Reset Game button when Try Again is hidden
  if (!tryAgainCb && alertButtonsContainer) {
    alertButtonsContainer.style.justifyContent = 'center';
  } else if (alertButtonsContainer) {
    alertButtonsContainer.style.justifyContent = 'space-between';
  }
}

let alertCallback = null;
let tryAgainCallback = null;
let isGameStartAlert = false;

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

  // Alert Modal Event Listeners
  alertClose.onclick = () => {
    alertModal.style.display = 'none';
    // If this is a game start alert, reset the game when the X is clicked
    if (isGameStartAlert && alertCallback) {
      alertCallback();
      alertCallback = null;
      isGameStartAlert = false;
    }
  };

  alertTryAgainButton.onclick = () => {
    alertModal.style.display = 'none';
    if (tryAgainCallback) {
      tryAgainCallback();
      tryAgainCallback = null;
    }
  };

  alertResetButton.onclick = () => {
    alertModal.style.display = 'none';
    if (alertCallback) {
      alertCallback();
      alertCallback = null;
    }
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
      console.error('Game instance not found');
    }
  };

  statsClose.onclick = () => {
    statsModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  };

  // Close modals when clicking outside
  window.onclick = (event) => {
    if (event.target === alertModal) {
      alertModal.style.display = 'none';
      // If this is a game start alert, reset the game when clicking outside
      if (isGameStartAlert && alertCallback) {
        alertCallback();
        alertCallback = null;
        isGameStartAlert = false;
      }
    }
    if (event.target === howToPlayModal) {
      howToPlayModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
    if (event.target === statsModal) {
      statsModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Re-enable scrolling
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
        // If this is a game start alert, reset the game when ESC is pressed
        if (isGameStartAlert && alertCallback) {
          alertCallback();
          alertCallback = null;
          isGameStartAlert = false;
        }
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
 */
export function showAlert(message, tryAgainCb, resetCb, isGameStart = false) {
  const alertMessage = document.getElementById('alertMessage');
  const alertModal = document.getElementById('alertModal');
  const alertTryAgainButton = document.getElementById('alertTryAgainButton');
  const alertButtonsContainer = document.querySelector('.alert-buttons');

  alertMessage.innerHTML = message;
  alertModal.style.display = 'flex';
  alertModal.style.alignItems = 'center';
  alertModal.style.justifyContent = 'center';
  
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
  
  // Center the Reset Game button when Try Again is hidden
  if (!tryAgainCb && alertButtonsContainer) {
    alertButtonsContainer.style.justifyContent = 'center';
  } else if (alertButtonsContainer) {
    alertButtonsContainer.style.justifyContent = 'space-between';
  }
}
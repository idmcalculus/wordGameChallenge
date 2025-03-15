let alertCallback = null;
let tryAgainCallback = null;
let isGameStartAlert = false;

export function setupModals() {
  // Alert Modal Elements
  const alertModal = document.getElementById('alertModal');
  const alertMessage = document.getElementById('alertMessage');
  const alertClose = document.querySelector('#alertModal .close');
  const alertResetButton = document.getElementById('alertResetButton');
  const alertTryAgainButton = document.getElementById('alertTryAgainButton');

  // How to Play Modal Elements
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const howToPlayModal = document.getElementById('howToPlayModal');
  const howToPlayClose = document.querySelector('#howToPlayModal .close');

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
    document.body.style.overflow = ''; // Re-enable scrolling
  };

  // Close modals when clicking outside
  window.onclick = (event) => {
    if (event.target == alertModal) {
      alertModal.style.display = 'none';
      // If this is a game start alert, reset the game when clicking outside
      if (isGameStartAlert && alertCallback) {
        alertCallback();
        alertCallback = null;
        isGameStartAlert = false;
      }
    }
    if (event.target == howToPlayModal) {
      howToPlayModal.style.display = 'none';
      document.body.style.overflow = ''; // Re-enable scrolling
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
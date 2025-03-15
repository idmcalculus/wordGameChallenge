let alertCallback = null;

export function setupModals() {
  // Alert Modal Elements
  const alertModal = document.getElementById('alertModal');
  const alertMessage = document.getElementById('alertMessage');
  const alertClose = document.querySelector('#alertModal .close');
  const alertResetButton = document.getElementById('alertResetButton');

  // How to Play Modal Elements
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const howToPlayModal = document.getElementById('howToPlayModal');
  const howToPlayClose = document.querySelector('#howToPlayModal .close');

  // Alert Modal Event Listeners
  alertClose.onclick = () => {
    alertModal.style.display = 'none';
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
      }
    }
  });
}

export function showAlert(message, callback) {
  const alertMessage = document.getElementById('alertMessage');
  const alertModal = document.getElementById('alertModal');

  alertMessage.innerHTML = message;
  alertModal.style.display = 'flex';
  alertModal.style.alignItems = 'center';
  alertModal.style.justifyContent = 'center';
  alertCallback = callback;
}
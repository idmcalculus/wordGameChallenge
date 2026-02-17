import { createConfetti } from './utils/confetti';
import { logger } from './utils/logger';
import type { SetupModalsOptions, ShowAlertOptions } from './types/interface';

let alertCallback: (() => void) | null = null;
let tryAgainCallback: (() => void) | null = null;
let isGameStartAlert = false;
let isGameResultAlert = false;
let alertCloseCallback: (() => void) | null = null;

function resetAlertState(): void {
  alertCallback = null;
  tryAgainCallback = null;
  isGameStartAlert = false;
  isGameResultAlert = false;
  alertCloseCallback = null;
}

function handleAlertCloseFromDismiss(): void {
  if (isGameStartAlert && alertCallback) {
    alertCallback();
  }

  if (isGameResultAlert && alertCloseCallback) {
    alertCloseCallback();
  }

  resetAlertState();
}

function getGameInstanceGetter(getGame?: SetupModalsOptions['getGame']): () => ReturnType<NonNullable<SetupModalsOptions['getGame']>> {
  if (typeof getGame === 'function') {
    return getGame;
  }

  return () => window.game ?? null;
}

/**
 * Sets up the modal event listeners and elements.
 */
export function setupModals({ getGame }: SetupModalsOptions = {}): void {
  const alertModal = document.getElementById('alertModal');
  const alertClose = document.querySelector<HTMLElement>('#alertModal .close');
  const alertResetButton = document.getElementById('alertResetButton') as HTMLButtonElement | null;
  const alertTryAgainButton = document.getElementById('alertTryAgainButton') as HTMLButtonElement | null;

  const howToPlayBtn = document.getElementById('howToPlayBtn') as HTMLButtonElement | null;
  const howToPlayModal = document.getElementById('howToPlayModal');
  const howToPlayClose = document.querySelector<HTMLElement>('#howToPlayModal .close');

  const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement | null;
  const statsModal = document.getElementById('statsModal');
  const statsClose = document.querySelector<HTMLElement>('#statsModal .close');

  const aboutBtn = document.getElementById('aboutBtn') as HTMLButtonElement | null;
  const aboutModal = document.getElementById('aboutModal');
  const aboutClose = document.querySelector<HTMLElement>('#aboutModal .close');

  if (
    !alertModal ||
    !alertClose ||
    !alertResetButton ||
    !alertTryAgainButton ||
    !howToPlayBtn ||
    !howToPlayModal ||
    !howToPlayClose ||
    !statsBtn ||
    !statsModal ||
    !statsClose
  ) {
    logger.error(new Error('Modal setup failed due to missing required elements'), {
      source: 'setupModals'
    });
    return;
  }

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

  howToPlayBtn.onclick = () => {
    howToPlayModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  howToPlayClose.onclick = () => {
    howToPlayModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

  const getGameInstance = getGameInstanceGetter(getGame);

  statsBtn.onclick = () => {
    const game = getGameInstance();
    if (!game) {
      logger.error(new Error('Game instance not found'), { source: 'statsModal.open' });
      return;
    }

    statsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      game.displayStats();
    }, 50);
  };

  statsClose.onclick = () => {
    statsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

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

  window.onclick = (event: MouseEvent) => {
    if (event.target === alertModal) {
      alertModal.style.display = 'none';
      handleAlertCloseFromDismiss();
    }

    if (event.target === howToPlayModal) {
      howToPlayModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    if (event.target === statsModal) {
      statsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    if (aboutModal && event.target === aboutModal) {
      aboutModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  };

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }

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
  });
}

/**
 * Displays an alert modal with a message and optional callbacks.
 */
export function showAlert(
  message: string,
  tryAgainCb: (() => void) | null,
  resetCb: (() => void) | null,
  isGameStart = false,
  tryAgainText = 'Try Again',
  resetText = 'Reset Game',
  options: ShowAlertOptions = {}
): void {
  const alertMessage = document.getElementById('alertMessage');
  const alertModal = document.getElementById('alertModal');
  const alertTryAgainButton = document.getElementById('alertTryAgainButton') as HTMLButtonElement | null;
  const alertResetButton = document.getElementById('alertResetButton') as HTMLButtonElement | null;
  const alertButtonsContainer = document.querySelector<HTMLElement>('.alert-buttons');

  if (!alertMessage || !alertModal || !alertTryAgainButton || !alertResetButton) {
    logger.error(new Error('Alert modal elements not found'), { source: 'showAlert' });
    return;
  }

  alertMessage.innerHTML = message;
  alertModal.style.display = 'flex';
  alertModal.style.alignItems = 'center';
  alertModal.style.justifyContent = 'center';

  if (message.includes('success-alert') || message.includes('🎉') || message.includes('Congratulations')) {
    window.setTimeout(() => createConfetti(), 100);
  }

  alertTryAgainButton.textContent = tryAgainText;
  alertResetButton.textContent = resetText;

  if (tryAgainCb) {
    alertTryAgainButton.style.display = 'inline-block';
    tryAgainCallback = tryAgainCb;
  } else {
    alertTryAgainButton.style.display = 'none';
    tryAgainCallback = null;
  }

  alertCallback = resetCb;

  isGameStartAlert = isGameStart;
  isGameResultAlert = Boolean(options.isGameResult);
  alertCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;

  if (alertButtonsContainer) {
    alertButtonsContainer.style.justifyContent = tryAgainCb ? 'space-between' : 'center';
  }
}

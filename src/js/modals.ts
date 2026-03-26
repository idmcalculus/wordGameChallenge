import { createConfetti } from './utils/confetti';
import { logger } from './utils/logger';
import type {
  AlertContent,
  AlertVariant,
  ModalTeardown,
  SetupModalsOptions,
  ShowAlertOptions
} from './types/interface';

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

function lockBodyScroll(): void {
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll(): void {
  document.body.style.overflow = 'auto';
}

function openModal(modal: HTMLElement): void {
  modal.style.display = 'flex';
}

function closeModal(modal: HTMLElement): void {
  modal.style.display = 'none';
}

function getAlertClassName(variant: AlertVariant): string {
  if (variant === 'success') {
    return 'success-alert';
  }

  if (variant === 'invalid') {
    return 'invalid-word-alert';
  }

  return 'failure-alert';
}

function renderAlertMessage(container: HTMLElement, content: AlertContent): void {
  container.textContent = '';

  const root = document.createElement('div');
  root.classList.add(getAlertClassName(content.variant));

  const icon = document.createElement('span');
  icon.classList.add('alert-icon');
  icon.textContent = content.icon;

  const heading = document.createElement('h3');
  heading.textContent = content.title;

  root.appendChild(icon);
  root.appendChild(heading);

  content.paragraphs.forEach(({ text, emphasis }) => {
    const paragraph = document.createElement('p');

    if (!emphasis) {
      paragraph.textContent = text;
      root.appendChild(paragraph);
      return;
    }

    paragraph.append(document.createTextNode(text));
    const strong = document.createElement('strong');
    strong.textContent = emphasis;
    paragraph.append(strong);
    root.appendChild(paragraph);
  });

  container.appendChild(root);
}

/**
 * Sets up the modal event listeners and elements.
 */
export function setupModals({ onOpenStats }: SetupModalsOptions = {}): ModalTeardown {
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
    return () => {};
  }

  type ListenerEntry = {
    target: EventTarget;
    type: string;
    handler: EventListenerOrEventListenerObject;
    options?: AddEventListenerOptions | boolean;
  };

  const listeners: ListenerEntry[] = [];
  const addListener = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void => {
    target.addEventListener(type, handler, options);
    listeners.push({ target, type, handler, options });
  };

  addListener(alertClose, 'click', () => {
    closeModal(alertModal);
    handleAlertCloseFromDismiss();
  });

  addListener(alertTryAgainButton, 'click', () => {
    closeModal(alertModal);
    if (tryAgainCallback) {
      tryAgainCallback();
    }
    resetAlertState();
  });

  addListener(alertResetButton, 'click', () => {
    closeModal(alertModal);
    if (alertCallback) {
      alertCallback();
    }
    resetAlertState();
  });

  addListener(howToPlayBtn, 'click', () => {
    openModal(howToPlayModal);
    lockBodyScroll();
  });

  addListener(howToPlayClose, 'click', () => {
    closeModal(howToPlayModal);
    unlockBodyScroll();
  });

  addListener(statsBtn, 'click', () => {
    openModal(statsModal);
    lockBodyScroll();

    window.setTimeout(() => {
      if (typeof onOpenStats === 'function') {
        onOpenStats();
      } else {
        logger.warn(new Error('Stats open handler is not configured'), { source: 'statsModal.open' });
      }
    }, 50);
  });

  addListener(statsClose, 'click', () => {
    closeModal(statsModal);
    unlockBodyScroll();
  });

  if (aboutBtn && aboutModal && aboutClose) {
    addListener(aboutBtn, 'click', () => {
      openModal(aboutModal);
      lockBodyScroll();
    });

    addListener(aboutClose, 'click', () => {
      closeModal(aboutModal);
      unlockBodyScroll();
    });
  }

  addListener(window, 'click', (event: Event) => {
    const target = event.target;

    if (target === alertModal) {
      closeModal(alertModal);
      handleAlertCloseFromDismiss();
    }

    if (target === howToPlayModal) {
      closeModal(howToPlayModal);
      unlockBodyScroll();
    }

    if (target === statsModal) {
      closeModal(statsModal);
      unlockBodyScroll();
    }

    if (aboutModal && target === aboutModal) {
      closeModal(aboutModal);
      unlockBodyScroll();
    }
  });

  addListener(document, 'keydown', (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Escape') {
      return;
    }

    if (howToPlayModal.style.display === 'flex') {
      closeModal(howToPlayModal);
      unlockBodyScroll();
    }

    if (alertModal.style.display === 'flex') {
      closeModal(alertModal);
      handleAlertCloseFromDismiss();
    }

    if (statsModal.style.display === 'flex') {
      closeModal(statsModal);
      unlockBodyScroll();
    }

    if (aboutModal && aboutModal.style.display === 'flex') {
      closeModal(aboutModal);
      unlockBodyScroll();
    }
  });

  return (): void => {
    listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });

    resetAlertState();
  };
}

/**
 * Displays an alert modal with a message and optional callbacks.
 */
export function showAlert(
  content: AlertContent,
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

  renderAlertMessage(alertMessage, content);
  openModal(alertModal);
  alertModal.style.alignItems = 'center';
  alertModal.style.justifyContent = 'center';

  if (content.variant === 'success') {
    const successAlert = alertMessage.querySelector<HTMLElement>('.success-alert');
    if (successAlert) {
      successAlert.classList.remove('success-alert--pop');
      // Force reflow so repeated wins replay the pop animation reliably.
      void successAlert.offsetWidth;
      successAlert.classList.add('success-alert--pop');
    }

    window.setTimeout(() => {
      const popTargetRect = successAlert?.getBoundingClientRect();
      const originX = popTargetRect ? popTargetRect.left + popTargetRect.width / 2 : window.innerWidth / 2;
      const originY = popTargetRect ? popTargetRect.top + Math.min(popTargetRect.height * 0.34, 130) : window.innerHeight * 0.33;

      createConfetti({
        particleCount: 190,
        burstCount: 3,
        durationMs: 2500,
        originX,
        originY,
        spread: Math.PI * 1.3,
        burstVelocityMin: 420,
        burstVelocityMax: 920,
        enableTopRain: true,
        popScale: 1.2
      });
    }, 80);
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

export function updateAlertContent(content: AlertContent, expectedTitle?: string): boolean {
  const alertMessage = document.getElementById('alertMessage');
  const alertModal = document.getElementById('alertModal');

  if (!alertMessage || !alertModal || alertModal.style.display !== 'flex') {
    return false;
  }

  if (expectedTitle) {
    const currentTitle = alertMessage.querySelector('h3')?.textContent;
    if (currentTitle !== expectedTitle) {
      return false;
    }
  }

  renderAlertMessage(alertMessage, content);
  return true;
}

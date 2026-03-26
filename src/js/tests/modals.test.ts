// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confettiMock = vi.fn();
const loggerErrorMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock('../utils/confetti', () => ({
  createConfetti: (): void => {
    confettiMock();
  }
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: (...args: unknown[]): void => {
      loggerErrorMock(...args);
    },
    warn: (...args: unknown[]): void => {
      loggerWarnMock(...args);
    }
  }
}));

function buildModalDom(): void {
  document.body.innerHTML = `
    <button id="howToPlayBtn" type="button"></button>
    <button id="statsBtn" type="button"></button>
    <button id="aboutBtn" type="button"></button>

    <div id="alertModal" class="modal" style="display:none">
      <div class="modal-content">
        <span class="close">x</span>
        <div id="alertMessage"></div>
        <div class="alert-buttons">
          <button id="alertTryAgainButton" type="button"></button>
          <button id="alertResetButton" type="button"></button>
        </div>
      </div>
    </div>

    <div id="howToPlayModal" class="modal" style="display:none">
      <div class="modal-content">
        <span class="close">x</span>
      </div>
    </div>

    <div id="statsModal" class="modal" style="display:none">
      <div class="modal-content">
        <span class="close">x</span>
      </div>
    </div>

    <div id="aboutModal" class="modal" style="display:none">
      <div class="modal-content">
        <span class="close">x</span>
      </div>
    </div>
  `;
}

describe('modals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    confettiMock.mockReset();
    loggerErrorMock.mockReset();
    loggerWarnMock.mockReset();
    buildModalDom();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('logs an error and returns noop teardown when required elements are missing', async () => {
    document.body.innerHTML = '<div></div>';
    const { setupModals } = await import('../modals');
    const teardown = setupModals();

    expect(typeof teardown).toBe('function');
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });

  it('opens stats modal and triggers stats callback', async () => {
    const { setupModals } = await import('../modals');
    const onOpenStats = vi.fn();
    const teardown = setupModals({ onOpenStats });

    const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement | null;
    const statsModal = document.getElementById('statsModal') as HTMLElement | null;
    const statsClose = document.querySelector<HTMLElement>('#statsModal .close');
    expect(statsBtn && statsModal && statsClose).toBeTruthy();
    if (!statsBtn || !statsModal || !statsClose) {
      return;
    }

    statsBtn.click();
    expect(statsModal.style.display).toBe('flex');
    vi.advanceTimersByTime(60);
    expect(onOpenStats).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');

    statsClose.click();
    expect(statsModal.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('auto');

    teardown();
  });

  it('warns when stats modal is opened without a stats callback', async () => {
    const { setupModals } = await import('../modals');
    setupModals();

    const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement | null;
    statsBtn?.click();
    vi.advanceTimersByTime(60);

    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
  });

  it('shows success alert content and triggers confetti', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    showAlert(
      {
        variant: 'success',
        icon: '🎉',
        title: 'Congratulations!',
        paragraphs: [{ text: 'You won!' }]
      },
      null,
      null
    );

    vi.advanceTimersByTime(120);
    expect(confettiMock).toHaveBeenCalledTimes(1);

    const alertMessage = document.getElementById('alertMessage');
    expect(alertMessage?.textContent).toContain('Congratulations!');
    expect(alertMessage?.querySelector('.success-alert')).toBeTruthy();
  });

  it('renders emphasized alert text and executes reset callback from reset button', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();
    const reset = vi.fn();

    showAlert(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Game Over',
        paragraphs: [
          { text: 'The word was: ', emphasis: 'apex' }
        ]
      },
      null,
      reset
    );

    const strong = document.querySelector('#alertMessage strong');
    expect(strong?.textContent).toBe('apex');

    const resetButton = document.getElementById('alertResetButton') as HTMLButtonElement | null;
    resetButton?.click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('runs close callback for game-result alert when modal is dismissed via close icon', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();
    const onClose = vi.fn();

    showAlert(
      {
        variant: 'failure',
        icon: '😕',
        title: 'Game Over',
        paragraphs: [{ text: 'Try again.' }]
      },
      null,
      null,
      false,
      'Try Again',
      'Reset Game',
      {
        isGameResult: true,
        onClose
      }
    );

    const alertClose = document.querySelector<HTMLElement>('#alertModal .close');
    expect(alertClose).toBeTruthy();
    alertClose?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles try-again/reset button callbacks and game-start close callback behavior', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    const tryAgain = vi.fn();
    const reset = vi.fn();

    showAlert(
      {
        variant: 'invalid',
        icon: '⚠️',
        title: 'Invalid Word',
        paragraphs: [{ text: 'Try again.' }]
      },
      tryAgain,
      reset,
      true,
      'Retry',
      'Reset'
    );

    const tryButton = document.getElementById('alertTryAgainButton') as HTMLButtonElement | null;
    const resetButton = document.getElementById('alertResetButton') as HTMLButtonElement | null;
    const closeButton = document.querySelector<HTMLElement>('#alertModal .close');
    expect(tryButton?.textContent).toBe('Retry');
    expect(resetButton?.textContent).toBe('Reset');
    expect(document.querySelector('.alert-buttons')?.getAttribute('style')).toContain('space-between');

    tryButton?.click();
    expect(tryAgain).toHaveBeenCalledTimes(1);

    // Re-open and dismiss start alert via close icon: should call reset callback.
    showAlert(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Invalid Input',
        paragraphs: [{ text: 'Need value.' }]
      },
      null,
      reset,
      true
    );
    closeButton?.click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('closes active modals on Escape key', async () => {
    const { setupModals } = await import('../modals');
    setupModals();

    const howToPlayBtn = document.getElementById('howToPlayBtn') as HTMLButtonElement | null;
    const howToPlayModal = document.getElementById('howToPlayModal');
    expect(howToPlayBtn && howToPlayModal).toBeTruthy();
    if (!howToPlayBtn || !howToPlayModal) {
      return;
    }

    howToPlayBtn.click();
    expect(howToPlayModal.style.display).toBe('flex');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(howToPlayModal.style.display).toBe('none');
  });

  it('ignores non-escape keydowns and closes alert/stats/about on escape', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement | null;
    const aboutBtn = document.getElementById('aboutBtn') as HTMLButtonElement | null;
    const statsModal = document.getElementById('statsModal');
    const aboutModal = document.getElementById('aboutModal');
    const alertModal = document.getElementById('alertModal');
    expect(statsBtn && aboutBtn && statsModal && aboutModal && alertModal).toBeTruthy();
    if (!statsBtn || !aboutBtn || !statsModal || !aboutModal || !alertModal) {
      return;
    }

    showAlert(
      { variant: 'invalid', icon: '⚠️', title: 'Invalid', paragraphs: [{ text: 'nope' }] },
      null,
      null
    );
    statsBtn.click();
    aboutBtn.click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(alertModal.style.display).toBe('flex');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(alertModal.style.display).toBe('none');
    expect(statsModal.style.display).toBe('none');
    expect(aboutModal.style.display).toBe('none');
  });

  it('closes how-to-play and about modals on backdrop click', async () => {
    const { setupModals } = await import('../modals');
    setupModals();

    const howToPlayBtn = document.getElementById('howToPlayBtn') as HTMLButtonElement | null;
    const aboutBtn = document.getElementById('aboutBtn') as HTMLButtonElement | null;
    const howToPlayModal = document.getElementById('howToPlayModal');
    const aboutModal = document.getElementById('aboutModal');
    expect(howToPlayBtn && aboutBtn && howToPlayModal && aboutModal).toBeTruthy();
    if (!howToPlayBtn || !aboutBtn || !howToPlayModal || !aboutModal) {
      return;
    }

    howToPlayBtn.click();
    const howToPlayBackdropClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(howToPlayBackdropClick, 'target', { value: howToPlayModal, configurable: true });
    window.dispatchEvent(howToPlayBackdropClick);
    expect(howToPlayModal.style.display).toBe('none');

    aboutBtn.click();
    const aboutBackdropClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(aboutBackdropClick, 'target', { value: aboutModal, configurable: true });
    window.dispatchEvent(aboutBackdropClick);
    expect(aboutModal.style.display).toBe('none');
  });

  it('closes alert and stats modals on backdrop click and supports how-to-play/about close icons', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    const howToPlayBtn = document.getElementById('howToPlayBtn') as HTMLButtonElement | null;
    const aboutBtn = document.getElementById('aboutBtn') as HTMLButtonElement | null;
    const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement | null;
    const howToPlayModal = document.getElementById('howToPlayModal');
    const aboutModal = document.getElementById('aboutModal');
    const statsModal = document.getElementById('statsModal');
    const alertModal = document.getElementById('alertModal');
    const howToPlayClose = document.querySelector<HTMLElement>('#howToPlayModal .close');
    const aboutClose = document.querySelector<HTMLElement>('#aboutModal .close');
    expect(
      howToPlayBtn &&
      aboutBtn &&
      statsBtn &&
      howToPlayModal &&
      aboutModal &&
      statsModal &&
      alertModal &&
      howToPlayClose &&
      aboutClose
    ).toBeTruthy();
    if (
      !howToPlayBtn ||
      !aboutBtn ||
      !statsBtn ||
      !howToPlayModal ||
      !aboutModal ||
      !statsModal ||
      !alertModal ||
      !howToPlayClose ||
      !aboutClose
    ) {
      return;
    }

    howToPlayBtn.click();
    howToPlayClose.click();
    expect(howToPlayModal.style.display).toBe('none');

    aboutBtn.click();
    aboutClose.click();
    expect(aboutModal.style.display).toBe('none');

    showAlert(
      { variant: 'failure', icon: '⚠️', title: 'Oops', paragraphs: [{ text: 'broken' }] },
      null,
      null
    );
    const alertBackdropClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(alertBackdropClick, 'target', { value: alertModal, configurable: true });
    window.dispatchEvent(alertBackdropClick);
    expect(alertModal.style.display).toBe('none');

    statsBtn.click();
    const statsBackdropClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(statsBackdropClick, 'target', { value: statsModal, configurable: true });
    window.dispatchEvent(statsBackdropClick);
    expect(statsModal.style.display).toBe('none');
  });

  it('logs error when showAlert is called without required alert elements', async () => {
    const { showAlert } = await import('../modals');
    document.body.innerHTML = '<div id="alertModal"></div>';

    showAlert(
      { variant: 'failure', icon: '⚠️', title: 'Broken', paragraphs: [{ text: 'no dom' }] },
      null,
      null
    );

    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('updates alert content in place only when the expected title still matches', async () => {
    const { setupModals, showAlert, updateAlertContent } = await import('../modals');
    setupModals();

    showAlert(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Game Over',
        paragraphs: [{ text: 'Meaning: looking it up...' }]
      },
      null,
      null
    );

    expect(updateAlertContent(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Game Over',
        paragraphs: [{ text: 'Meaning: To stop or end something.' }]
      },
      'Game Over'
    )).toBe(true);
    expect(document.getElementById('alertMessage')?.textContent).toContain('Meaning: To stop or end something.');

    expect(updateAlertContent(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Game Over',
        paragraphs: [{ text: 'Meaning: Updated without title guard.' }]
      }
    )).toBe(true);
    expect(document.getElementById('alertMessage')?.textContent).toContain('Meaning: Updated without title guard.');

    expect(updateAlertContent(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Different',
        paragraphs: [{ text: 'No update' }]
      },
      'Congratulations!'
    )).toBe(false);

    document.getElementById('alertModal')!.style.display = 'none';
    expect(updateAlertContent(
      {
        variant: 'failure',
        icon: '⚠️',
        title: 'Game Over',
        paragraphs: [{ text: 'Still hidden' }]
      }
    )).toBe(false);
  });

  it('covers setup branch without about modal elements and callback-null button handlers', async () => {
    buildModalDom();
    document.getElementById('aboutBtn')?.remove();
    document.getElementById('aboutModal')?.remove();
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    showAlert(
      { variant: 'failure', icon: '⚠️', title: 'No callbacks', paragraphs: [{ text: 'none' }] },
      null,
      null
    );

    const tryButton = document.getElementById('alertTryAgainButton') as HTMLButtonElement | null;
    const resetButton = document.getElementById('alertResetButton') as HTMLButtonElement | null;
    expect(tryButton && resetButton).toBeTruthy();
    tryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(loggerErrorMock).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'Alert modal elements not found' }));
  });

  it('covers success-alert fallback geometry when success node query returns null', async () => {
    const { setupModals, showAlert } = await import('../modals');
    setupModals();

    const alertMessage = document.getElementById('alertMessage') as HTMLElement | null;
    expect(alertMessage).toBeTruthy();
    if (!alertMessage) {
      return;
    }

    const originalQuerySelector = alertMessage.querySelector.bind(alertMessage);
    vi.spyOn(alertMessage, 'querySelector').mockImplementation((selectors: string): HTMLElement | null => {
      if (selectors === '.success-alert') {
        return null;
      }
      return originalQuerySelector(selectors);
    });

    showAlert(
      {
        variant: 'success',
        icon: '🎉',
        title: 'Winner',
        paragraphs: [{ text: 'Great run' }]
      },
      null,
      null
    );

    vi.advanceTimersByTime(120);
    expect(confettiMock).toHaveBeenCalled();
  });
});

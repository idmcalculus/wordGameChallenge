import { startTimer, stopTimer } from '../utils/timerUtils';

export class TimerController {
  private timerDisplay: HTMLElement | null;
  private timerId: number | null;

  constructor() {
    this.timerDisplay = null;
    this.timerId = null;
  }

  bindDisplay(timerDisplay: HTMLElement | null): void {
    this.timerDisplay = timerDisplay;
  }

  start(startTime: Date): void {
    if (!this.timerDisplay) {
      return;
    }

    this.stop();
    this.timerId = startTimer(startTime, this.timerDisplay);
  }

  stop(): void {
    if (this.timerId === null) {
      return;
    }

    stopTimer(this.timerId);
    this.timerId = null;
  }

  hide(): void {
    if (!this.timerDisplay) {
      return;
    }

    this.timerDisplay.style.display = 'none';
  }
}

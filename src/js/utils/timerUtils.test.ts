import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTimer, stopTimer } from './timerUtils';

interface TimerDisplayLike {
  style: {
    display: string;
  };
  textContent: string;
}

describe('timerUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts timer and updates text in MM:SS format', () => {
    const timerDisplay = {
      style: {
        display: 'none'
      },
      textContent: ''
    } as TimerDisplayLike as HTMLElement;

    const startTime = new Date();
    const timerId = startTimer(startTime, timerDisplay);

    expect(timerDisplay.style.display).toBe('inline-flex');

    vi.advanceTimersByTime(65_000);

    expect(timerDisplay.textContent).toBe('Time: 01:05');
    stopTimer(timerId);
  });

  it('stops timer updates when stopTimer is called', () => {
    const timerDisplay = {
      style: {
        display: 'none'
      },
      textContent: ''
    } as TimerDisplayLike as HTMLElement;

    const timerId = startTimer(new Date(), timerDisplay);

    vi.advanceTimersByTime(10_000);
    const beforeStop = timerDisplay.textContent;

    stopTimer(timerId);
    vi.advanceTimersByTime(10_000);

    expect(timerDisplay.textContent).toBe(beforeStop);
  });
});

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerController } from '../TimerController';

const { startTimerMock, stopTimerMock } = vi.hoisted(() => ({
  startTimerMock: vi.fn((): number => 123),
  stopTimerMock: vi.fn()
}));

vi.mock('../../utils/timerUtils', () => ({
  startTimer: startTimerMock,
  stopTimer: stopTimerMock
}));

describe('TimerController', () => {
  beforeEach(() => {
    startTimerMock.mockClear();
    stopTimerMock.mockClear();
    document.body.innerHTML = '<div id="timer"></div>';
  });

  it('does nothing when starting without a bound display', () => {
    const controller = new TimerController();
    controller.start(new Date('2026-02-17T12:00:00.000Z'));

    expect(startTimerMock).not.toHaveBeenCalled();
  });

  it('starts timer with bound display and stops previous timer before restart', () => {
    const controller = new TimerController();
    const display = document.getElementById('timer');
    controller.bindDisplay(display);

    const startTime = new Date('2026-02-17T12:00:00.000Z');
    controller.start(startTime);
    expect(startTimerMock).toHaveBeenCalledWith(startTime, display);
    expect(stopTimerMock).not.toHaveBeenCalled();

    const nextStartTime = new Date('2026-02-17T12:01:00.000Z');
    controller.start(nextStartTime);
    expect(stopTimerMock).toHaveBeenCalledWith(123);
    expect(startTimerMock).toHaveBeenCalledWith(nextStartTime, display);
  });

  it('hides timer display and safely ignores redundant stops', () => {
    const controller = new TimerController();
    const display = document.getElementById('timer');
    controller.bindDisplay(display);

    controller.hide();
    expect(display?.style.display).toBe('none');

    controller.stop();
    expect(stopTimerMock).not.toHaveBeenCalled();
  });
});

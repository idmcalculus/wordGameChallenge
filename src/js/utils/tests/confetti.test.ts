// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfetti, createFirework } from '../confetti';

interface MockCanvasContext {
  globalAlpha: number;
  fillStyle: string;
  clearRect: (x: number, y: number, width: number, height: number) => void;
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
  scale: (x: number, y: number) => void;
  beginPath: () => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  fill: () => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
}

function createMockContext(): MockCanvasContext {
  return {
    globalAlpha: 1,
    fillStyle: '',
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn()
  };
}

describe('confetti utils', () => {
  let rafId = 0;
  const rafTimers = new Map<number, number>();

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    const mockContext = createMockContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D
    );

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      rafId += 1;
      const timerId = window.setTimeout(() => {
        callback(performance.now());
      }, 16);
      rafTimers.set(rafId, timerId);
      return rafId;
    });

    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      const timerId = rafTimers.get(id);
      if (typeof timerId === 'number') {
        clearTimeout(timerId);
        rafTimers.delete(id);
      }
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    rafTimers.clear();
  });

  it('renders and cleans up confetti canvas and pop flash', () => {
    createConfetti({
      particleCount: 40,
      burstCount: 2,
      durationMs: 900
    });

    expect(document.querySelector('.confetti-canvas')).toBeTruthy();
    expect(document.querySelector('.confetti-pop-flash')).toBeTruthy();

    vi.advanceTimersByTime(4000);
    expect(document.querySelector('.confetti-canvas')).toBeNull();
    expect(document.querySelector('.confetti-pop-flash')).toBeNull();
  });

  it('creates a focused firework burst at provided coordinates', () => {
    createFirework(220, 160);

    const popFlash = document.querySelector<HTMLElement>('.confetti-pop-flash');
    expect(popFlash).toBeTruthy();
    expect(popFlash?.style.left).toBe('220px');
    expect(popFlash?.style.top).toBe('160px');

    vi.advanceTimersByTime(3000);
    expect(document.querySelector('.confetti-canvas')).toBeNull();
  });

  it('handles reduced-motion mode, context fallback, and sparse burst timeouts safely', () => {
    // Force reduced-motion branch.
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    createConfetti({
      burstCount: 8,
      durationMs: 700,
      particleCount: 30
    });

    expect(document.querySelector('.confetti-canvas')).toBeTruthy();
    vi.advanceTimersByTime(3000);
    expect(document.querySelector('.confetti-canvas')).toBeNull();

    // Force color fallback path where random index exceeds color array bounds.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);
    createConfetti({
      burstCount: 1,
      durationMs: 700
    });
    vi.advanceTimersByTime(1500);
    randomSpy.mockRestore();

    // Context-null branch should remove canvas immediately.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null);
    createConfetti({
      burstCount: 1,
      durationMs: 700
    });
    expect(document.querySelector('.confetti-canvas')).toBeNull();
  });
});

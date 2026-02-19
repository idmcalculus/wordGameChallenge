// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardController } from '../KeyboardController';
import type { OnKeyboardInput } from '../../types/interface';

const { createAlphabetContainerMock, updateAlphabetContainerMock } = vi.hoisted(() => ({
  createAlphabetContainerMock: vi.fn(),
  updateAlphabetContainerMock: vi.fn()
}));

vi.mock('../../uiHandler', () => ({
  createAlphabetContainer: createAlphabetContainerMock,
  updateAlphabetContainer: updateAlphabetContainerMock
}));

describe('KeyboardController', () => {
  beforeEach(() => {
    createAlphabetContainerMock.mockClear();
    updateAlphabetContainerMock.mockClear();
    document.body.innerHTML = '<div id="alphabetContainer"></div>';
  });

  it('creates keyboard and hides container initially', () => {
    const onInput: OnKeyboardInput = vi.fn();
    const controller = new KeyboardController(['a', 'b', 'c']);

    controller.create(onInput);

    expect(createAlphabetContainerMock).toHaveBeenCalledWith(['a', 'b', 'c'], onInput);
    const container = document.getElementById('alphabetContainer');
    expect(container?.style.display).toBe('none');
    expect(container?.classList.contains('visible')).toBe(false);
  });

  it('shows container and updates letter status', () => {
    const controller = new KeyboardController(['a', 'b', 'c']);

    controller.updateLetterStatus('a', 'correct');

    expect(updateAlphabetContainerMock).toHaveBeenCalledWith('a', 'correct');
    const container = document.getElementById('alphabetContainer');
    expect(container?.classList.contains('visible')).toBe(true);
  });

  it('clears container and hides it again', () => {
    const controller = new KeyboardController(['a', 'b', 'c']);
    const container = document.getElementById('alphabetContainer');
    if (!container) {
      throw new Error('Container not found');
    }

    container.innerHTML = '<button>Q</button>';
    controller.clear();

    expect(container.innerHTML).toBe('');
    expect(container.style.display).toBe('none');
    expect(container.classList.contains('visible')).toBe(false);
  });

  it('gracefully handles missing keyboard container', () => {
    document.body.innerHTML = '';
    const controller = new KeyboardController(['a']);

    expect(() => controller.show()).not.toThrow();
    expect(() => controller.hide()).not.toThrow();
    expect(() => controller.clear()).not.toThrow();
    expect(() => controller.updateLetterStatus('a', 'correct')).not.toThrow();
  });
});

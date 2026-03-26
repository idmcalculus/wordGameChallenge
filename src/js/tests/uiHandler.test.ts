// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAlphabetContainer,
  createRow,
  resetGameUI,
  updateAlphabetContainer,
  updateDifficulty,
  updateStrategyInsights
} from '../uiHandler';

describe('uiHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="alphabetContainer"></div>
      <div id="wrapper"></div>
      <button id="startGame" style="display:none"></button>
      <div class="wordLengthInputContainer" style="display:none"></div>
      <input id="wordLengthInput" value="7" />
      <div id="difficulty" style="display:block">Difficulty:</div>
      <div id="puzzleProfile" style="display:block">Profile</div>
      <section id="strategyCoach" style="display:block">
        <div id="strategyCoachCount"></div>
        <p id="strategyCoachMessage"></p>
        <p id="strategyCoachDetail"></p>
        <div id="strategyCoachLetters"></div>
      </section>
      <button id="resetGame" style="display:block"></button>
      <button id="playAgainMain" style="display:block"></button>
      <div class="actionButtons includesHintButtons">
        <button id="letterHintButton"></button>
        <button id="positionHintButton"></button>
      </div>
    `;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('creates on-screen keyboard and emits key input callbacks', () => {
    const onKeyInput = vi.fn();
    createAlphabetContainer('abcdefghijklmnopqrstuvwxyz'.split(''), onKeyInput);

    const container = document.getElementById('alphabetContainer');
    expect(container?.querySelector('.alphabet-label')?.textContent).toContain('Keyboard');
    expect(container?.querySelectorAll('.keyboard-row')).toHaveLength(4);

    const qKey = container?.querySelector<HTMLButtonElement>('.keyboard-key[data-key="q"]');
    const enterKey = container?.querySelector<HTMLButtonElement>('.keyboard-key[data-key="enter"]');
    expect(qKey).toBeTruthy();
    expect(enterKey).toBeTruthy();

    qKey?.click();
    enterKey?.click();

    expect(onKeyInput).toHaveBeenCalledWith('q');
    expect(onKeyInput).toHaveBeenCalledWith('enter');
  });

  it('returns early when alphabet container is missing', () => {
    document.getElementById('alphabetContainer')?.remove();
    expect(() => createAlphabetContainer(['a', 'b'])).not.toThrow();
    expect(() => updateAlphabetContainer('a', 'correct')).not.toThrow();
  });

  it('updates keyboard letter status and accessibility text', () => {
    createAlphabetContainer('abcdefghijklmnopqrstuvwxyz'.split(''));

    updateAlphabetContainer('g', 'contains');

    const container = document.getElementById('alphabetContainer');
    const key = container?.querySelector<HTMLElement>('.keyboard-key[data-letter="g"]');
    expect(container?.classList.contains('visible')).toBe(true);
    expect(key?.classList.contains('contains')).toBe(true);
    expect(key?.getAttribute('aria-label')).toContain('wrong position');
  });

  it('creates a row with sanitized input behavior and navigation', () => {
    const checkRowLetters = vi.fn();
    const row = createRow(3, checkRowLetters);
    document.body.appendChild(row);
    const inputs = Array.from(row.querySelectorAll<HTMLInputElement>('input.wordLetterBox'));
    expect(inputs).toHaveLength(3);

    const first = inputs[0];
    const second = inputs[1];
    const third = inputs[2];
    expect(first && second && third).toBeTruthy();
    if (!first || !second || !third) {
      return;
    }

    first.value = '1';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(first.value).toBe('');

    first.value = 'a';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    vi.runAllTimers();
    expect(checkRowLetters).toHaveBeenCalled();

    second.focus();
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(third);

    third.value = '';
    third.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(document.activeElement).toBe(second);

    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(first);

    const focusSpy = vi.spyOn(third, 'focus');
    third.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('resets game UI and clears hint buttons', () => {
    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
      wrapper.innerHTML = '<div>row</div>';
    }

    resetGameUI();

    expect(document.getElementById('wrapper')?.innerHTML).toBe('');
    expect((document.getElementById('wordLengthInput') as HTMLInputElement | null)?.value).toBe('');
    expect((document.getElementById('startGame') as HTMLButtonElement | null)?.style.display).toBe('block');
    expect(document.getElementById('difficulty')?.style.display).toBe('none');
    expect(document.getElementById('puzzleProfile')?.style.display).toBe('none');
    expect(document.getElementById('strategyCoach')?.style.display).toBe('none');
    expect(document.getElementById('strategyCoachLetters')?.innerHTML).toBe('');
    expect(document.getElementById('resetGame')?.style.display).toBe('none');
    expect(document.getElementById('playAgainMain')?.style.display).toBe('none');
    expect(document.getElementById('letterHintButton')).toBeNull();
    expect(document.getElementById('positionHintButton')).toBeNull();
  });

  it('updates difficulty label by word length bucket', () => {
    const difficulty = document.getElementById('difficulty');
    expect(difficulty).toBeTruthy();

    updateDifficulty(4);
    expect(difficulty?.textContent).toBe('Difficulty: Easy');
    updateDifficulty(6);
    expect(difficulty?.textContent).toBe('Difficulty: Medium');
    updateDifficulty(8);
    expect(difficulty?.textContent).toBe('Difficulty: Hard');
    updateDifficulty(10);
    expect(difficulty?.textContent).toBe('Difficulty: Very Hard');
    expect(difficulty?.style.display).toBe('inline-flex');
    expect(document.getElementById('puzzleProfile')?.style.display).toBe('none');
  });

  it('renders metadata-driven difficulty guidance when provided', () => {
    updateDifficulty({
      label: 'Hard',
      score: 4,
      summary: 'repeat letters possible • one less-common letter',
      guidance: 'Do not assume every clue maps to a new letter.'
    });

    expect(document.getElementById('difficulty')?.textContent).toBe('Difficulty: Hard');
    expect(document.getElementById('difficulty')?.getAttribute('title')).toContain('repeat letters possible');
    expect(document.getElementById('puzzleProfile')?.textContent).toContain('Do not assume');
    expect(document.getElementById('puzzleProfile')?.style.display).toBe('block');
    expect(document.getElementById('puzzleProfile')?.getAttribute('title')).toContain('Profile:');
  });

  it('renders and clears strategy insights', () => {
    updateStrategyInsights({
      remainingCandidateCount: 12,
      previousCandidateCount: 48,
      topUntriedLetters: ['a', 'e', 'r'],
      duplicateLetterStillPossible: true,
      freshLettersInLastGuess: 4,
      reusedEliminatedLettersInLastGuess: 0,
      coachMessage: 'Strong coverage. That guess cut the local pool from 48 to 12.',
      coachDetail: 'Pool change: 48 to 12 • Best new letters: A, E, R • Duplicate letters remain plausible'
    });

    expect(document.getElementById('strategyCoach')?.style.display).toBe('block');
    expect(document.getElementById('strategyCoachCount')?.textContent).toContain('12 local answers left');
    expect(document.getElementById('strategyCoachMessage')?.textContent).toContain('cut the local pool');
    expect(document.getElementById('strategyCoachDetail')?.textContent).toContain('Best new letters');
    expect(document.querySelectorAll('.strategyCoach__chip')).toHaveLength(3);

    updateStrategyInsights(null);

    expect(document.getElementById('strategyCoach')?.style.display).toBe('none');
    expect(document.getElementById('strategyCoachLetters')?.innerHTML).toBe('');
  });

  it('ignores alphabet updates for unknown letters and missing difficulty element', () => {
    createAlphabetContainer(['a', 'b', 'c']);
    updateAlphabetContainer('z', 'notContains');
    const unknown = document.querySelector('.keyboard-key[data-letter="z"]');
    expect(unknown).toBeNull();

    document.getElementById('difficulty')?.remove();
    expect(() => updateDifficulty(5)).not.toThrow();
    document.getElementById('strategyCoach')?.remove();
    expect(() => updateStrategyInsights(null)).not.toThrow();
  });

  it('handles keyboard keydown activation and all letter status variants', () => {
    const onKeyInput = vi.fn();
    createAlphabetContainer('abcdefghijklmnopqrstuvwxyz'.split(''), onKeyInput);

    const enterKey = document.querySelector<HTMLButtonElement>('.keyboard-key[data-key="enter"]');
    const aKey = document.querySelector<HTMLButtonElement>('.keyboard-key[data-letter="a"]');
    const bKey = document.querySelector<HTMLButtonElement>('.keyboard-key[data-letter="b"]');
    expect(enterKey && aKey && bKey).toBeTruthy();
    if (!enterKey || !aKey || !bKey) {
      return;
    }

    enterKey.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    enterKey.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onKeyInput).toHaveBeenCalledWith('enter');

    updateAlphabetContainer('a', 'correct');
    expect(aKey.getAttribute('aria-label')).toContain('right position');

    // Container already visible path + fallback status branch.
    const container = document.getElementById('alphabetContainer');
    container?.classList.add('visible');
    updateAlphabetContainer('b', 'notContains');
    expect(bKey.getAttribute('aria-label')).toContain('not in the word');
  });

  it('handles input/navigation guards when adjacent row inputs are missing', () => {
    const checkRowLetters = vi.fn();
    const row = createRow(3, checkRowLetters);
    document.body.appendChild(row);
    const inputs = Array.from(row.querySelectorAll<HTMLInputElement>('input.wordLetterBox'));
    const first = inputs[0];
    const second = inputs[1];
    const third = inputs[2];
    expect(first && second && third).toBeTruthy();
    if (!first || !second || !third) {
      return;
    }

    // Next-input missing branch in input auto-advance.
    second.remove();
    first.value = 'a';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    vi.runAllTimers();

    // Last-input path where auto-advance condition is false.
    third.value = 'z';
    third.dispatchEvent(new Event('input', { bubbles: true }));
    expect(checkRowLetters).toHaveBeenCalled();

    // Missing previous input branches for Backspace and ArrowLeft.
    first.remove();
    third.value = '';
    third.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    third.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));

    // Missing next input branch for ArrowRight on the second input.
    third.remove();
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  });

  it('resets safely when optional UI elements are absent', () => {
    document.body.innerHTML = '<div class="actionButtons includesHintButtons"></div>';
    expect(() => resetGameUI()).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { evaluateGuess, LETTER_STATES } from './gameEngine';

describe('evaluateGuess', () => {
  it('marks all letters as correct when guess matches target', () => {
    const result = evaluateGuess('pile', 'pile');

    expect(result.letterStates).toEqual([
      LETTER_STATES.CORRECT,
      LETTER_STATES.CORRECT,
      LETTER_STATES.CORRECT,
      LETTER_STATES.CORRECT
    ]);
    expect(result.totalCorrect).toBe(4);
    expect(result.isWin).toBe(true);
  });

  it('handles duplicate letters with remaining-count logic', () => {
    const result = evaluateGuess('apex', 'papa');

    expect(result.letterStates).toEqual([
      LETTER_STATES.CONTAINS,
      LETTER_STATES.CONTAINS,
      LETTER_STATES.NOT_CONTAINS,
      LETTER_STATES.NOT_CONTAINS
    ]);
    expect(result.keyboardStates.p).toBe(LETTER_STATES.CONTAINS);
    expect(result.keyboardStates.a).toBe(LETTER_STATES.CONTAINS);
    expect(result.isWin).toBe(false);
  });

  it('keeps the strongest keyboard state for a letter', () => {
    const result = evaluateGuess('caper', 'caaaa');

    expect(result.keyboardStates.c).toBe(LETTER_STATES.CORRECT);
    expect(result.keyboardStates.a).toBe(LETTER_STATES.CORRECT);
    expect(result.letterStates).toEqual([
      LETTER_STATES.CORRECT,
      LETTER_STATES.CORRECT,
      LETTER_STATES.NOT_CONTAINS,
      LETTER_STATES.NOT_CONTAINS,
      LETTER_STATES.NOT_CONTAINS
    ]);
  });

  it('returns empty result for invalid input lengths', () => {
    const result = evaluateGuess('cat', 'to');

    expect(result.letterStates).toEqual([]);
    expect(result.keyboardStates).toEqual({});
    expect(result.totalCorrect).toBe(0);
    expect(result.isWin).toBe(false);
  });
});

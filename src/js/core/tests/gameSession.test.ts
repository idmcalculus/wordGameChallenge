import { describe, expect, it } from 'vitest';
import { GameSession } from '../gameSession';

describe('GameSession', () => {
  it('starts with sanitized target word and resets counters', () => {
    const session = new GameSession(5);

    session.start({ targetWord: 'CrOwN', wordLength: 5, startTime: new Date('2026-02-17T12:00:00.000Z') });

    expect(session.getTargetWord()).toBe('crown');
    expect(session.getWordLength()).toBe(5);
    expect(session.getAttemptsUsed()).toBe(0);
    expect(session.isActive()).toBe(true);
  });

  it('tracks attempts, keyboard state priority and win evaluation', () => {
    const session = new GameSession(5);
    session.start({ targetWord: 'crown', wordLength: 5 });

    const first = session.submitGuess('crane');
    expect(first.attemptsUsed).toBe(1);
    expect(first.hasAttemptsRemaining).toBe(true);
    expect(first.evaluation.isWin).toBe(false);

    const keyboardAfterFirst = session.getKeyboardStates();
    expect(keyboardAfterFirst.c).toBe('correct');
    expect(keyboardAfterFirst.r).toBe('correct');

    const second = session.submitGuess('crown');
    expect(second.evaluation.isWin).toBe(true);
    expect(second.attemptsUsed).toBe(2);
  });

  it('provides hint context and avoids invalid usage after clear', () => {
    const session = new GameSession(5);
    session.start({ targetWord: 'apple', wordLength: 5 });

    session.submitGuess('ample');
    session.registerLetterHint('p');

    const context = session.getHintContext();
    expect(context.usedLetters.has('a')).toBe(true);
    expect(context.usedLetters.has('p')).toBe(true);
    expect(context.revealedLetters.length).toBeGreaterThan(0);
    expect(session.getAvailableLetterHints().length).toBeGreaterThanOrEqual(0);

    session.clear();

    expect(session.isActive()).toBe(false);
    expect(() => session.submitGuess('apple')).toThrow('Game session is not active');
  });

  it('returns candidate positions for position hints based on known correct spots', () => {
    const session = new GameSession(5);
    session.start({ targetWord: 'crown', wordLength: 5 });
    session.submitGuess('cabin');

    const positions = session.getAvailablePositionHints(['c', 'a', 'b', 'i', 'n']);
    expect(positions).toContain(1);
    expect(positions).toContain(2);
    expect(positions).toContain(3);
    expect(positions).not.toContain(0);
    expect(positions).not.toContain(4);
  });

  it('enforces guess length and attempt limits', () => {
    const session = new GameSession(1);
    session.start({ targetWord: 'cat', wordLength: 3 });

    expect(session.getMaximumAttempts()).toBe(1);
    expect(session.getCurrentRowNumber()).toBe(1);
    expect(() => session.submitGuess('to')).toThrow('Guess length does not match current word length');

    const result = session.submitGuess('cot');
    expect(result.attemptsUsed).toBe(1);
    expect(result.hasAttemptsRemaining).toBe(false);
    expect(session.hasAttemptsRemaining()).toBe(false);
    expect(session.getCurrentRowNumber()).toBe(2);
    expect(() => session.submitGuess('cat')).toThrow('No attempts remaining');
  });

  it('supports elapsed time bounds and inactive hint calls', () => {
    const session = new GameSession(5);

    expect(session.getElapsedSeconds()).toBe(0);
    expect(session.getAvailableLetterHints()).toEqual([]);
    expect(session.getAvailablePositionHints(['a', 'b', 'c'])).toEqual([]);

    const startedAt = new Date('2026-02-17T12:00:00.000Z');
    session.start({ targetWord: 'dog', wordLength: 3, startTime: startedAt });

    expect(session.getElapsedSeconds(new Date('2026-02-17T12:00:05.000Z'))).toBe(5);
    expect(session.getElapsedSeconds(new Date('2026-02-17T11:59:55.000Z'))).toBe(0);
  });

  it('keeps higher keyboard state priority and ignores invalid hint characters', () => {
    const session = new GameSession(5);
    session.start({ targetWord: 'crown', wordLength: 5 });
    session.submitGuess('candy');

    const beforeHint = session.getKeyboardStates();
    expect(beforeHint.c).toBe('correct');

    session.registerLetterHint('c', 'contains');
    session.registerLetterHint('1', 'contains');

    const afterHint = session.getKeyboardStates();
    expect(afterHint.c).toBe('correct');
    expect(afterHint['1']).toBeUndefined();
  });

  it('rejects invalid session start payloads', () => {
    const session = new GameSession(5);

    expect(() => session.start({ targetWord: 'nope', wordLength: 3 })).toThrow('Invalid target word for game session');
    expect(() => session.start({ targetWord: '', wordLength: 3 })).toThrow('Invalid target word for game session');
  });
});

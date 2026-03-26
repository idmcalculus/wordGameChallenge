import { describe, expect, it } from 'vitest';
import { buildStrategyInsight } from '../strategyEngine';
import { evaluateGuess } from '../gameEngine';
import type { GuessHistoryEntry } from '../../types/interface';

function createHistoryEntry(targetWord: string, guess: string): GuessHistoryEntry {
  return {
    guess,
    letterStates: evaluateGuess(targetWord, guess).letterStates
  };
}

describe('strategyEngine', () => {
  it('returns opening guidance and top letters before any guesses', () => {
    const insight = buildStrategyInsight(['crown', 'climb', 'crane', 'cover'], [], 5);

    expect(insight.remainingCandidateCount).toBe(4);
    expect(insight.previousCandidateCount).toBeNull();
    expect(insight.topUntriedLetters.length).toBeGreaterThan(0);
    expect(insight.coachMessage).toContain('Open with broad coverage');
  });

  it('uses position-confirming guidance when only a few candidates remain', () => {
    const answerPool = ['crown', 'brown', 'frown'];
    const history = [createHistoryEntry('crown', 'shown')];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.remainingCandidateCount).toBe(3);
    expect(insight.coachMessage).toContain('Prioritize position-confirming guesses');
  });

  it('narrows candidates from guess history and reports a solved local pool', () => {
    const answerPool = ['crown', 'clown', 'brown', 'groan'];
    const history = [createHistoryEntry('crown', 'crane')];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.remainingCandidateCount).toBe(1);
    expect(insight.previousCandidateCount).toBe(4);
    expect(insight.coachMessage).toContain('Only one local answer');
    expect(insight.coachDetail).toContain('4 to 1');
  });

  it('warns when the latest guess reuses eliminated letters', () => {
    const answerPool = ['plane', 'crane', 'slate', 'glare', 'flame'];
    const history: GuessHistoryEntry[] = [
      {
        guess: 'zzxxx',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      },
      {
        guess: 'xzzzx',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      }
    ];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.reusedEliminatedLettersInLastGuess).toBeGreaterThanOrEqual(2);
    expect(insight.coachMessage).toContain('reused');
  });

  it('surfaces strong-coverage feedback when a fresh guess cuts the pool', () => {
    const answerPool = ['shade', 'shake', 'shape', 'shale', 'shame', 'share'];
    const history: GuessHistoryEntry[] = [
      {
        guess: 'zzxxx',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      },
      createHistoryEntry('shade', 'shirt')
    ];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.previousCandidateCount).toBe(6);
    expect(insight.remainingCandidateCount).toBe(5);
    expect(insight.coachMessage).toContain('Strong coverage');
    expect(insight.coachDetail).toContain('6 to 5');
  });

  it('warns when duplicate letters remain plausible', () => {
    const answerPool = ['apple', 'addle', 'allot', 'array', 'eerie'];
    const history: GuessHistoryEntry[] = [
      {
        guess: 'zzxxx',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      }
    ];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.duplicateLetterStillPossible).toBe(true);
    expect(insight.coachMessage).toContain('repeated letter is still possible');
    expect(insight.coachDetail).toContain('Duplicate letters remain plausible');
  });

  it('falls back to generic advice when no special coaching branch applies', () => {
    const answerPool = ['cider', 'stone', 'flour', 'grime', 'cloud'];
    const history: GuessHistoryEntry[] = [
      {
        guess: 'ababa',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      }
    ];

    const insight = buildStrategyInsight(answerPool, history, 5);

    expect(insight.duplicateLetterStillPossible).toBe(false);
    expect(insight.coachMessage).toContain('Keep trading for new information');
  });

  it('gracefully handles malformed history entries while filtering candidates', () => {
    const history: GuessHistoryEntry[] = [
      {
        guess: 'crate',
        letterStates: ['correct']
      },
      {
        guess: 'zzzzz',
        letterStates: ['notContains', 'notContains', 'notContains', 'notContains', 'notContains']
      }
    ];

    const insight = buildStrategyInsight(['crate', 'slate'], history, 5);

    expect(insight.remainingCandidateCount).toBe(0);
    expect(insight.topUntriedLetters).toEqual([]);
    expect(insight.reusedEliminatedLettersInLastGuess).toBe(0);
  });

  it('suggests only untried letters for follow-up guesses', () => {
    const answerPool = ['planet', 'placid', 'plasma', 'plenty'];
    const history = [createHistoryEntry('planet', 'people')];

    const insight = buildStrategyInsight(answerPool, history, 6);

    expect(insight.topUntriedLetters).not.toContain('p');
    expect(insight.topUntriedLetters).not.toContain('e');
    expect(insight.topUntriedLetters.length).toBeLessThanOrEqual(5);
  });
});

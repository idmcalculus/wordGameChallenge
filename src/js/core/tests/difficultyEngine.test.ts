import { describe, expect, it } from 'vitest';
import { assessPuzzleDifficulty } from '../difficultyEngine';

describe('difficultyEngine', () => {
  it('scores a short common unique-letter word as easier', () => {
    expect(assessPuzzleDifficulty('sun', 'common')).toMatchObject({
      label: 'Easy',
      hasDuplicateLetters: false,
      rareLetterCount: 0,
      uniqueLetterCount: 3,
      ambiguityFamilySize: 1
    });
  });

  it('raises difficulty for duplicate letters and rarer consonants', () => {
    const result = assessPuzzleDifficulty('jazz', 'stretch');

    expect(result.label).toBe('Very Hard');
    expect(result.hasDuplicateLetters).toBe(true);
    expect(result.rareLetterCount).toBe(3);
    expect(result.summary).toContain('repeat letters possible');
    expect(result.guidance).toContain('Do not assume');
  });

  it('treats large answer families as a separate source of difficulty', () => {
    const baseline = assessPuzzleDifficulty('take', 'common');
    const result = assessPuzzleDifficulty('take', 'common', { ambiguityFamilySize: 7 });

    expect(result.label).not.toBe(baseline.label);
    expect(result.score).toBeGreaterThan(baseline.score);
    expect(result.ambiguityFamilySize).toBe(7);
    expect(result.summary).toContain('large answer family');
    expect(result.guidance).toContain('Confirm the changing slot');
  });

  it('uses stretch-vocabulary messaging when no stronger risk signal applies', () => {
    const result = assessPuzzleDifficulty('stone', 'stretch');

    expect(result.summary).toContain('less familiar vocabulary');
    expect(result.guidance).toContain('Use broad coverage early');
  });

  it('throws when asked to assess an invalid word', () => {
    expect(() => assessPuzzleDifficulty('1234', 'common')).toThrow('Puzzle difficulty requires a valid word');
  });
});

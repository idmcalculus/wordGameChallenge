import { describe, expect, it } from 'vitest';
import { getHintPolicy } from '../hintPolicy';

describe('hintPolicy', () => {
  it('keeps the total reveal cap tied to word length', () => {
    expect(getHintPolicy(5, 'Medium').totalRevealLimit).toBe(5);
    expect(getHintPolicy(0, 'Medium').totalRevealLimit).toBe(0);
  });

  it('reduces position reveal power for short words', () => {
    expect(getHintPolicy(4, 'Easy')).toMatchObject({
      maxPositionReveals: 1,
      minRowForPositionReveal: 1
    });
    expect(getHintPolicy(6, 'Medium')).toMatchObject({
      maxPositionReveals: 1,
      minRowForPositionReveal: 2
    });
  });

  it('tightens cooldowns and unlock timing for harder puzzles', () => {
    const hardPolicy = getHintPolicy(8, 'Hard');
    const veryHardPolicy = getHintPolicy(8, 'Very Hard');

    expect(hardPolicy).toMatchObject({
      letterCooldownMs: 8000,
      positionCooldownMs: 75000,
      maxPositionReveals: 1,
      minRowForPositionReveal: 2
    });
    expect(veryHardPolicy).toMatchObject({
      letterCooldownMs: 10000,
      positionCooldownMs: 90000,
      maxPositionReveals: 1,
      minRowForPositionReveal: 3
    });
  });

  it('sanitizes invalid word lengths safely', () => {
    expect(getHintPolicy(Number.NaN, 'Easy').totalRevealLimit).toBe(0);
  });
});

import type { HintPolicy } from '../types/interface';
import type { DifficultyLabel } from '../types/types';

interface HintPolicyBase {
  letterCooldownMs: number;
  positionCooldownMs: number;
  maxPositionReveals: number;
  minRowForPositionReveal: number;
}

const HINT_POLICY_BY_DIFFICULTY: Readonly<Record<DifficultyLabel, HintPolicyBase>> = {
  Easy: {
    letterCooldownMs: 5000,
    positionCooldownMs: 45000,
    maxPositionReveals: 2,
    minRowForPositionReveal: 1
  },
  Medium: {
    letterCooldownMs: 6500,
    positionCooldownMs: 60000,
    maxPositionReveals: 2,
    minRowForPositionReveal: 2
  },
  Hard: {
    letterCooldownMs: 8000,
    positionCooldownMs: 75000,
    maxPositionReveals: 1,
    minRowForPositionReveal: 2
  },
  'Very Hard': {
    letterCooldownMs: 10000,
    positionCooldownMs: 90000,
    maxPositionReveals: 1,
    minRowForPositionReveal: 3
  }
};

function getPositionRevealLimit(wordLength: number, requestedLimit: number): number {
  if (wordLength <= 0 || requestedLimit <= 0) {
    return 0;
  }

  if (wordLength <= 4) {
    return 1;
  }

  if (wordLength <= 6) {
    return Math.min(1, requestedLimit);
  }

  return requestedLimit;
}

export function getHintPolicy(wordLength: number, difficultyLabel: DifficultyLabel): HintPolicy {
  const safeWordLength = Number.isInteger(wordLength) ? Math.max(0, wordLength) : 0;
  const basePolicy = HINT_POLICY_BY_DIFFICULTY[difficultyLabel];

  return {
    totalRevealLimit: safeWordLength,
    letterCooldownMs: basePolicy.letterCooldownMs,
    positionCooldownMs: basePolicy.positionCooldownMs,
    maxPositionReveals: getPositionRevealLimit(safeWordLength, basePolicy.maxPositionReveals),
    minRowForPositionReveal: basePolicy.minRowForPositionReveal
  };
}

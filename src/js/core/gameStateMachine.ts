import type { GameStateMachine } from '../types/interface';
import type { GameState } from '../types/types';

export const GAME_STATES = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  WON: 'won',
  LOST: 'lost'
} as const);

const ALLOWED_TRANSITIONS: Record<GameState, Set<GameState>> = {
  [GAME_STATES.IDLE]: new Set([GAME_STATES.RUNNING]),
  [GAME_STATES.RUNNING]: new Set([GAME_STATES.IDLE, GAME_STATES.WON, GAME_STATES.LOST]),
  [GAME_STATES.WON]: new Set([GAME_STATES.IDLE, GAME_STATES.RUNNING]),
  [GAME_STATES.LOST]: new Set([GAME_STATES.IDLE, GAME_STATES.RUNNING])
};

export function createGameStateMachine(initialState: GameState = GAME_STATES.IDLE): GameStateMachine {
  let currentState: GameState = initialState;

  function canTransition(nextState: GameState) {
    if (nextState === currentState) {
      return true;
    }

    const allowed = ALLOWED_TRANSITIONS[currentState];
    return Boolean(allowed && allowed.has(nextState));
  }

  function transition(nextState: GameState) {
    if (!canTransition(nextState)) {
      throw new Error(`Invalid game state transition: ${currentState} -> ${nextState}`);
    }

    currentState = nextState;
    return currentState;
  }

  function getState() {
    return currentState;
  }

  return {
    canTransition,
    transition,
    getState
  };
}

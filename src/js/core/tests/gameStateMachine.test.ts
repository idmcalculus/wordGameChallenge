import { describe, expect, it } from 'vitest';
import { createGameStateMachine, GAME_STATES } from '../gameStateMachine';

describe('gameStateMachine', () => {
  it('supports valid transitions across a game lifecycle', () => {
    const machine = createGameStateMachine();

    expect(machine.getState()).toBe(GAME_STATES.IDLE);
    expect(machine.transition(GAME_STATES.RUNNING)).toBe(GAME_STATES.RUNNING);
    expect(machine.transition(GAME_STATES.WON)).toBe(GAME_STATES.WON);
    expect(machine.transition(GAME_STATES.IDLE)).toBe(GAME_STATES.IDLE);
  });

  it('rejects invalid transitions', () => {
    const machine = createGameStateMachine();

    expect(() => machine.transition(GAME_STATES.WON)).toThrow(
      'Invalid game state transition: idle -> won'
    );
  });

  it('allows idempotent transitions to the same state', () => {
    const machine = createGameStateMachine();

    expect(machine.transition(GAME_STATES.IDLE)).toBe(GAME_STATES.IDLE);
  });
});

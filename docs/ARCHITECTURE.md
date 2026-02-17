# Architecture Overview

This project follows a modular vanilla JavaScript architecture with a thin UI shell around game domain logic.

## Layers

- `src/js/core/`
  - Pure domain rules.
  - `gameEngine.ts` evaluates guesses and returns letter/keyboard states.
  - No DOM access and no localStorage access.

- `src/js/repositories/`
  - Persistence and data normalization.
  - `statsRepository.ts` owns stats migration, deduplication, sorting, and localStorage writes.

- `src/js/components/`
  - Stateful UI components.
  - `StatsManager.ts` handles stats rendering, filtering, sorting, and pagination.

- `src/js/types/`
  - Shared contracts used across modules.
  - `types.ts` holds union/basic reusable types.
  - `interface.ts` holds shared interfaces for engine, repository, and UI boundaries.

- `src/js/`
  - App orchestration and feature modules.
  - `WordGame.ts` orchestrates game flow and delegates to core/repository/UI modules.
  - `uiHandler.ts`, `hintHandler.ts`, `modals.ts`, and `themeManager.ts` manage specific UI concerns.

## Runtime Flow

1. `app.ts` initializes theme, creates `WordGame`, and wires modal access through dependency injection.
2. `WordGame.play()` fetches word candidates and creates rows/keyboard UI.
3. On row completion, `WordGame` calls `evaluateGuess()` from `core/gameEngine.ts`.
4. `WordGame.gameWon()` persists via `addStat()` in `repositories/statsRepository.ts`.
5. Stats modal renders data through `StatsManager`.

## Contribution Rules of Thumb

- Put pure logic in `core/` first.
- Put storage concerns in `repositories/`.
- Keep `WordGame` as orchestration, not as a utility dump.
- Avoid introducing new global state (`window.*`) when a dependency can be injected.
- Keep UI modules focused: one module, one UI concern.

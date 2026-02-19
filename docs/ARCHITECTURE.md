# Architecture Overview

This project follows a modular vanilla TypeScript architecture with a thin UI shell around game domain logic.

## Layers

- `src/js/core/`
  - Pure domain rules.
  - `gameSession.ts` owns canonical in-memory game session state (word, attempts, hint context, keyboard state).
  - `gameEngine.ts` evaluates guesses and returns letter/keyboard states.
  - No DOM access and no localStorage access.

- `src/js/controllers/`
  - UI controllers for focused responsibilities.
  - `GameController.ts` orchestrates gameplay flow and delegates to domain + UI controllers.
  - `BoardController.ts` owns row lifecycle, cell state updates, and row animation helpers.
  - `KeyboardController.ts` owns virtual keyboard lifecycle and status updates.
  - `TimerController.ts` owns timer binding/start/stop behavior.

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
  - `app.ts` wires infrastructure (theme, modal setup, controller lifecycle).
  - `modals.ts` uses typed alert content models and returns teardown callbacks for listener cleanup.
  - `uiHandler.ts`, `hintHandler.ts`, `modals.ts`, and `themeManager.ts` manage specific UI concerns.

## Runtime Flow

1. `app.ts` initializes theme, creates `GameController`, and wires modal actions through callback injection (`onOpenStats`) without global state.
2. `GameController.play()` fetches word candidates, starts `GameSession`, and initializes controllers.
3. On row completion, `GameController` submits a guess via `GameSession`, which delegates scoring to `core/gameEngine.ts`.
4. UI updates are applied through `BoardController` and `KeyboardController`.
5. `GameController.gameWon()` persists via `addStat()` in `repositories/statsRepository.ts`.
6. Stats modal renders data through `StatsManager`.

## Performance Notes

- `StatsManager` now uses incremental rendering:
  - Initial render shows first 20 rows.
  - `Load More` appends only the next batch instead of rebuilding all prior rows.
  - Full table rerender is only used when filters/sort change.
- This keeps DOM churn lower as stats grow and avoids repeated layout work.

## Testing Strategy

- Coverage gate (`>=95%`) is enforced on deterministic layers:
  - `core/`
  - `repositories/`
  - selected pure `utils/`
  - `apiHandler.ts`
- UI modules (`components/`, `controllers/`) are covered with focused jsdom tests, but are not part of the hard coverage gate to keep the threshold stable and useful.
- Practical rule:
  - game-rule or persistence changes require strict unit coverage;
  - UI wiring changes require jsdom behavior tests for affected paths.

## Contribution Rules of Thumb

- Put pure logic in `core/` first.
- Put in-memory gameplay state in `core/gameSession.ts`, not in DOM traversal.
- Put storage concerns in `repositories/`.
- Keep `GameController` as orchestration, not as a utility dump.
- Put UI-only state changes in `controllers/`.
- Avoid introducing new global state (`window.*`) when a dependency can be injected.
- Keep UI modules focused: one module, one UI concern.

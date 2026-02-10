# Pegging Logic Assessment & Refactoring Plan

## Current Implementation Issues

1.  **Fragmented Reset Logic**:
    -   `playCard` handles "31" resets (lines 794-809).
    -   `playCard` handles "Neither can play" (Last Card) resets (lines 857-876).
    -   `sayGo` handles "Go" resets (lines 1125-1140).
    -   These three blocks repeat similar logic (resetting `peggingStack`, `currentPeggingTotal`, `hasSaidGo`, choosing next player) but with slight variations (e.g., `playCard` uses a 1.5s timeout, `sayGo` is immediate).

2.  **Race Conditions & State Inconsistency**:
    -   In `playCard`, when a reset is scheduled (setTimeout 1.5s), the code *also* updates the state immediately with the "Last Card" score.
    -   The `turnPlayerId` is momentarily set to the current player (to show the score), but `checkAutoPlay` is called immediately.
    -   If the current player is the CPU, `checkAutoPlay` might try to act again during the 1.5s "wait" period, potentially causing loops or invalid actions.
    -   The `sayGo` function does *not* use a timeout, creating an inconsistent user experience (sometimes instant, sometimes delayed).

3.  **UI/State Sync**:
    -   The "Go" popup in the UI blocks the "Continue" button unless type is 'counting', but the service logic for 'pegging' updates automatically. This is generally fine but can be confusing if the user thinks they need to dismiss it.
    -   The "Stuck" state likely occurs when the transition to the next `turnPlayerId` fails or when the `phase` transition to `counting` is missed.

4.  **Phase Transition**:
    -   `checkForPeggingFinished` is called at different points. If it returns true (all cards played), it switches phase to `counting`.
    -   If a reset timeout is pending, and phase switches to `counting`, the timeout callback still executes 1.5s later and updates `peggingStack` and `turnPlayerId`. While mostly harmless, this is "dirty" state management.

## Refactoring Recommendations

We should refactor `game.service.ts` to centralize the Pegging Flow Control.

### 1. Centralized `resolvePeggingCycle` Method
Create a unified method to handle the end of a 31-cycle (whether by hitting 31, Go, or Last Card).

```typescript
private resolvePeggingCycle(lastPlayerId: string, reason: '31' | 'GO') {
    // 1. Determine points (if not already added)
    // 2. Schedule Reset
    // 3. Block Input/AI during Reset
}
```

### 2. State "Busy" Flag
Introduce a local `_isResetting` flag or similar to prevent `playCard` or `checkAutoPlay` from running while the board is clearing. This prevents the "CPU loops during 1.5s delay" bug.

### 3. Unified Phase Transition
Ensure `checkForPeggingFinished` is the *final* authority on whether to start a new pegging cycle or move to counting.

### 4. Remove Redundant Timeouts
Standardize the visual delay (e.g., 1.5s) for all board-clearing events to ensure consistent UX and predictable state updates.

## Proposed Strategy
1.  **Refactor**: Implement `resetBoard()` helper.
2.  **Fix**: Update `playCard` and `sayGo` to use `resetBoard()`.
3.  **Guard**: Add `if (this._isResetting) return;` to input methods.

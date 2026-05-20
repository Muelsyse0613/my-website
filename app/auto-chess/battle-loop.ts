import { GamePhase, type GameAction, type GameState } from './types';

const TICK_MS = 16;

export class BattleLoop {
  private rafId = 0;
  private lastTick = 0;
  private running = false;
  private dispatch: (action: GameAction) => void;
  private getState: () => GameState;

  constructor(
    dispatch: (action: GameAction) => void,
    getState: () => GameState
  ) {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTick = performance.now();
    this.tick(this.lastTick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const state = this.getState();
    if (state.phase !== GamePhase.Battle) {
      this.stop();
      return;
    }

    const elapsed = now - this.lastTick;
    if (elapsed >= TICK_MS) {
      this.lastTick = now - (elapsed % TICK_MS);
      this.dispatch({ type: 'BATTLE_TICK', dt: elapsed });
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

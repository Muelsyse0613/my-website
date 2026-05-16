import { Difficulty, Player, BLACK, WHITE } from './types';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'move'; row: number; col: number; nodes: number; qnodes: number }
  | { type: 'error'; message: string };

class AIBridge {
  private worker: Worker | null = null;
  private ready = false;
  private readyResolve!: () => void;
  private readyPromise: Promise<void>;
  private pendingResolve: ((move: { row: number; col: number }) => void) | null = null;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  async init(): Promise<void> {
    if (this.worker) return;
    this.worker = new Worker(new URL('./worker.ts', import.meta.url));
    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        this.ready = true;
        this.readyResolve();
      } else if (msg.type === 'move') {
        if (this.pendingResolve) {
          this.pendingResolve({ row: msg.row, col: msg.col });
          this.pendingResolve = null;
        }
      } else if (msg.type === 'error') {
        console.error('[AI Bridge]', msg.message);
        if (this.pendingResolve) {
          this.pendingResolve({ row: -1, col: -1 });
          this.pendingResolve = null;
        }
      }
    };
    this.worker.onerror = (err) => {
      console.error('[AI Bridge] Worker error:', err);
    };
    this.worker.postMessage({ type: 'init' });
    await this.readyPromise;
  }

  async findBestMove(
    board: Int32Array,
    player: Player,
    difficulty: Difficulty,
    lastMove?: { row: number; col: number }
  ): Promise<{ row: number; col: number }> {
    if (!this.worker || !this.ready) {
      return { row: -1, col: -1 };
    }
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      const p: 1 | 2 = player === BLACK ? 1 : 2;
      this.worker!.postMessage(
        { type: 'find_move', board, player: p, difficulty, lastMove },
        [board.buffer]
      );
    });
  }

  clearTT(): void {
    this.worker?.postMessage({ type: 'clear_tt' });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

export const aiBridge = new AIBridge();

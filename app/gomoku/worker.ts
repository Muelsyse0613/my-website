/// <reference lib="webworker" />

import { BOARD_SIZE, EMPTY } from './types';
import { genCands } from './game-logic';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'move'; row: number; col: number; nodes: number; qnodes: number }
  | { type: 'error'; message: string };

type MainMessage =
  | { type: 'init' }
  | { type: 'find_move'; board: Int32Array; player: 1 | 2; difficulty: 'easy' | 'medium' | 'hard' | 'master'; lastMove?: { row: number; col: number } }
  | { type: 'clear_tt' };

let Module: any = null;

// ── Ponder state ──
const DIFFICULTY_CONFIG: Record<string, [number, number, number]> = {
  easy:   [3,  4,  4],
  medium: [6,  6,  6],
  hard:   [10, 10, 8],
  master: [12, 14, 12],
};

interface PonderEntry {
  aiRow: number;
  aiCol: number;
}

let ponderCache = new Map<string, PonderEntry>();
let ponderCancelled = false;
let isPondering = false;

function cancelPonder(): void {
  ponderCancelled = true;
}

function cacheKey(row: number, col: number): string {
  return `${row},${col}`;
}

function startPonder(
  board: Int32Array,
  aiPlayer: 1 | 2,
  difficulty: string
): void {
  if (isPondering) return;

  const humanPlayer: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  const cands = genCands(board);
  if (cands.length === 0) return;

  // Score each candidate via C++ eval_cell_score
  const boardPtr = Module._malloc(225 * 4);
  Module.HEAP32.set(board, boardPtr >> 2);

  const scored: [number, number, number][] = [];
  try {
    for (const [r, c] of cands) {
      const score = Module._eval_cell_score(boardPtr, humanPlayer, r, c);
      scored.push([score, r, c]);
    }
  } finally {
    Module._free(boardPtr);
  }

  scored.sort((a, b) => b[0] - a[0]);
  const topN = scored.slice(0, 3);

  isPondering = true;
  ponderCancelled = false;
  ponderCache.clear();

  const [depth, vcfSelf, vcfOpp] = DIFFICULTY_CONFIG[difficulty];
  ponderStep(0, topN, board, aiPlayer, humanPlayer, depth, vcfSelf, vcfOpp);
}

function ponderStep(
  index: number,
  candidates: [number, number, number][],
  board: Int32Array,
  aiPlayer: 1 | 2,
  humanPlayer: 1 | 2,
  depth: number,
  vcfSelf: number,
  vcfOpp: number
): void {
  if (ponderCancelled || index >= candidates.length) {
    isPondering = false;
    return;
  }

  const [, humanR, humanC] = candidates[index];

  // Hypothetical board: human plays at (humanR, humanC)
  const pondBoard = new Int32Array(board);
  pondBoard[humanR * BOARD_SIZE + humanC] = humanPlayer;

  const boardPtr = Module._malloc(225 * 4);
  Module.HEAP32.set(pondBoard, boardPtr >> 2);
  const resultPtr = Module._malloc(8);

  try {
    Module._find_best_move_fixed_depth(boardPtr, aiPlayer, depth, vcfSelf, vcfOpp, resultPtr);
    const aiRow = Module.HEAP32[resultPtr >> 2];
    const aiCol = Module.HEAP32[(resultPtr >> 2) + 1];

    if (aiRow >= 0 && aiCol >= 0) {
      ponderCache.set(cacheKey(humanR, humanC), { aiRow, aiCol });
    }
  } catch {
    // Ponder errors are non-fatal
  } finally {
    Module._free(boardPtr);
    Module._free(resultPtr);
  }

  // Yield to message queue so find_move can interrupt between steps
  setTimeout(
    () => ponderStep(index + 1, candidates, board, aiPlayer, humanPlayer, depth, vcfSelf, vcfOpp),
    0
  );
}

// ── WASM init ──
async function initWasm(): Promise<void> {
  // @ts-expect-error - WASM module served from public/, not a TS module
  const aiEngineModule = await import(/* turbopackIgnore: true */ '/wasm/ai_engine.js');
  Module = await aiEngineModule.default();
  (self as unknown as Worker).postMessage({ type: 'ready' } satisfies WorkerMessage);
}

// ── Message handler ──
self.onmessage = async (e: MessageEvent<MainMessage>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      await initWasm();
    } catch (err: any) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: 'WASM 初始化失败: ' + err.message,
      } satisfies WorkerMessage);
    }
    return;
  }

  if (!Module) return;

  if (msg.type === 'clear_tt') {
    Module._clear_tt();
    cancelPonder();
    ponderCache.clear();
    return;
  }

  if (msg.type === 'find_move') {
    const { board, player, difficulty, lastMove } = msg;

    // Check ponder cache first
    if (lastMove && ponderCache.has(cacheKey(lastMove.row, lastMove.col))) {
      cancelPonder();
      const entry = ponderCache.get(cacheKey(lastMove.row, lastMove.col))!;
      (self as unknown as Worker).postMessage({
        type: 'move',
        row: entry.aiRow,
        col: entry.aiCol,
        nodes: 0,
        qnodes: 0,
      } satisfies WorkerMessage);
      return;
    }

    // Cache miss — cancel in-flight ponder and do normal search
    cancelPonder();

    const boardPtr = Module._malloc(225 * 4);
    Module.HEAP32.set(board, boardPtr >> 2);
    const resultPtr = Module._malloc(8);

    try {
      const [depth, vcfSelf, vcfOpp] = DIFFICULTY_CONFIG[difficulty];
      Module._find_best_move_fixed_depth(boardPtr, player, depth, vcfSelf, vcfOpp, resultPtr);

      const aiRow = Module.HEAP32[resultPtr >> 2];
      const aiCol = Module.HEAP32[(resultPtr >> 2) + 1];

      (self as unknown as Worker).postMessage({
        type: 'move',
        row: aiRow,
        col: aiCol,
        nodes: 0,
        qnodes: 0,
      } satisfies WorkerMessage);

      // After AI moves, start pondering for the next human turn
      if (aiRow >= 0 && aiCol >= 0) {
        const postAIBoard = new Int32Array(board);
        postAIBoard[aiRow * BOARD_SIZE + aiCol] = player;
        setTimeout(() => startPonder(postAIBoard, player, difficulty), 0);
      }
    } catch (err: any) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: 'AI 计算失败: ' + err.message,
      } satisfies WorkerMessage);
    } finally {
      Module._free(boardPtr);
      Module._free(resultPtr);
    }
  }
};

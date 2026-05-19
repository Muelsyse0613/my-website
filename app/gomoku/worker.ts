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

// ── Dynamic depth ──
const DIFFICULTY_CONFIG: Record<string, [number, number, number]> = {
  easy:   [3,  4,  4],
  medium: [6,  6,  6],
  hard:   [10, 10, 8],
  master: [12, 14, 12],
};

function countStones(board: Int32Array): number {
  let n = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) n++;
  }
  return n;
}

function getEffectiveConfig(difficulty: string, stones: number): [number, number, number] {
  const [base, vcfSelf, vcfOpp] = DIFFICULTY_CONFIG[difficulty];
  if (difficulty === 'easy' || difficulty === 'medium') return [base, vcfSelf, vcfOpp];

  let depth = base;
  if (difficulty === 'hard') {
    if (stones <= 2)       depth = 7;
    else if (stones <= 4)  depth = 8;
    else if (stones <= 6)  depth = 9;
    else                   depth = 10;
  } else if (difficulty === 'master') {
    if (stones <= 1)       depth = 8;
    else if (stones <= 3)  depth = 9;
    else if (stones <= 5)  depth = 10;
    else                   depth = 12;
  }
  return [depth, vcfSelf, vcfOpp];
}

interface PonderEntry {
  aiRow: number;
  aiCol: number;
}

let ponderCache = new Map<string, PonderEntry>();
let ponderCancelled = false;
let isPondering = false;
let ponderGen = 0;

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
  const gen = ++ponderGen;

  const [depth, vcfSelf, vcfOpp] = getEffectiveConfig(difficulty, countStones(board));
  ponderStep(0, topN, board, aiPlayer, humanPlayer, gen, depth, vcfSelf, vcfOpp);
}

function ponderStep(
  index: number,
  candidates: [number, number, number][],
  board: Int32Array,
  aiPlayer: 1 | 2,
  humanPlayer: 1 | 2,
  gen: number,
  depth: number,
  vcfSelf: number,
  vcfOpp: number
): void {
  if (ponderCancelled || gen !== ponderGen || index >= candidates.length) {
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
    () => ponderStep(index + 1, candidates, board, aiPlayer, humanPlayer, gen, depth, vcfSelf, vcfOpp),
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
    ponderGen++;
    return;
  }

  if (msg.type === 'find_move') {
    const { board, player, difficulty, lastMove } = msg;

    // Check ponder cache first
    if (lastMove && ponderCache.has(cacheKey(lastMove.row, lastMove.col))) {
      cancelPonder();
      const entry = ponderCache.get(cacheKey(lastMove.row, lastMove.col))!;
      // All remaining cache entries are for the previous board state.
      // Clear them so stale entries can't regress subsequent turns.
      ponderCache.clear();
      if (board[entry.aiRow * BOARD_SIZE + entry.aiCol] === EMPTY) {
        (self as unknown as Worker).postMessage({
          type: 'move',
          row: entry.aiRow,
          col: entry.aiCol,
          nodes: 0,
          qnodes: 0,
        } satisfies WorkerMessage);
        // Schedule pondering for the next turn (the cache-miss path does
        // this after search; we must do it here since we skip the search).
        const postAIBoard = new Int32Array(board);
        postAIBoard[entry.aiRow * BOARD_SIZE + entry.aiCol] = player;
        setTimeout(() => startPonder(postAIBoard, player, difficulty), 0);
        return;
      }
    }

    // Cache miss — cancel in-flight ponder and do normal search
    cancelPonder();

    const boardPtr = Module._malloc(225 * 4);
    Module.HEAP32.set(board, boardPtr >> 2);
    const resultPtr = Module._malloc(8);

    try {
      const doSearch = () => {
        const [depth, vcfSelf, vcfOpp] = getEffectiveConfig(difficulty, countStones(board));
        Module._find_best_move_fixed_depth(boardPtr, player, depth, vcfSelf, vcfOpp, resultPtr);
        const r = Module.HEAP32[resultPtr >> 2];
        const c = Module.HEAP32[(resultPtr >> 2) + 1];
        return { row: r, col: c };
      };

      let { row: aiRow, col: aiCol } = doSearch();

      // Defense: if engine returned an occupied cell, clear TT and retry once
      if (aiRow >= 0 && aiCol >= 0 && board[aiRow * BOARD_SIZE + aiCol] !== EMPTY) {
        Module._clear_tt();
        const retry = doSearch();
        aiRow = retry.row;
        aiCol = retry.col;
      }

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

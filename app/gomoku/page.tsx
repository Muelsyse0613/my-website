'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { BLACK, WHITE, GameState, Difficulty, Player } from './types';
import { gameReducer, getInitialState, flatBoard } from './game-logic';
import { drawBoard, drawStones, drawLastMove, drawWinLine, canvasToBoard, BASE_SIZE } from './board-renderer';
import { aiBridge } from './ai-bridge';
import './gomoku.css';

function renderCanvas(canvas: HTMLCanvasElement, state: GameState, displaySize: number): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = displaySize * dpr;
  canvas.height = displaySize * dpr;
  canvas.style.width = `${displaySize}px`;
  canvas.style.height = `${displaySize}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawBoard(ctx, displaySize);
  drawStones(ctx, state.board, displaySize);

  if (state.winLine) {
    drawWinLine(ctx, state.winLine, displaySize);
  }

  if (state.moveHistory.length > 0) {
    const last = state.moveHistory[state.moveHistory.length - 1];
    drawLastMove(ctx, last.row, last.col, state.board, displaySize);
  }
}

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  master: '大师',
};

export default function GomokuPage() {
  const [state, dispatch] = useReducer(gameReducer, 'medium', (d) =>
    getInitialState(d as Difficulty, BLACK)
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Responsive canvas sizing
  const [boardSize, setBoardSize] = useState(BASE_SIZE);

  useEffect(() => {
    function measure() {
      if (boardWrapperRef.current) {
        const w = boardWrapperRef.current.clientWidth;
        setBoardSize(Math.min(BASE_SIZE, Math.max(260, w)));
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Init AI bridge
  useEffect(() => {
    aiBridge.init();
    return () => {
      aiBridge.terminate();
    };
  }, []);

  // Render canvas on state or size change
  useEffect(() => {
    if (canvasRef.current) {
      renderCanvas(canvasRef.current, state, boardSize);
    }
  }, [state, boardSize]);

  // Trigger AI move
  useEffect(() => {
    if (!state.isAIThinking || state.gameOver) return;

    let cancelled = false;

    const doAIMove = async () => {
      try {
        const board = flatBoard(state.board);
        const lastMove = state.moveHistory.length > 0
          ? { row: state.moveHistory[state.moveHistory.length - 1].row, col: state.moveHistory[state.moveHistory.length - 1].col }
          : undefined;
        const result = await aiBridge.findBestMove(board, state.aiPlayer, state.difficulty, lastMove);
        if (!cancelled && result.row >= 0 && result.col >= 0) {
          // Diagnostic: verify the cell is still empty before dispatch
          if (state.board[result.row]?.[result.col] !== 0) {
            console.error('[Dispatch] 即将落子但位置已被占:', {
              aiRow: result.row, aiCol: result.col,
              cellValue: state.board[result.row]?.[result.col],
              moveCount: state.moveHistory.length,
            });
          }
          dispatch({ type: 'AI_MOVE', row: result.row, col: result.col });
        } else if (!cancelled) {
          dispatch({ type: 'AI_CANCELLED' });
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'AI_CANCELLED' });
        }
      }
    };

    doAIMove();

    return () => {
      cancelled = true;
    };
  }, [state.isAIThinking, state.gameOver, state.board, state.aiPlayer, state.difficulty]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stateRef.current.isAIThinking || stateRef.current.gameOver) return;
    if (stateRef.current.currentPlayer !== stateRef.current.humanPlayer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pos = canvasToBoard(mx, my, rect.width, rect.height, boardSize);
    if (!pos) return;

    dispatch({ type: 'CELL_CLICK', row: pos.row, col: pos.col });
  }, [boardSize]);

  const handleNewGame = useCallback(() => {
    aiBridge.clearTT();
    dispatch({ type: 'NEW_GAME' });
  }, []);

  const handleUndo = useCallback(() => {
    aiBridge.clearTT();
    dispatch({ type: 'UNDO' });
  }, []);

  const handleDifficulty = useCallback((d: Difficulty) => {
    aiBridge.clearTT();
    dispatch({ type: 'SET_DIFFICULTY', difficulty: d });
  }, []);

  const handleColor = useCallback((c: Player) => {
    aiBridge.clearTT();
    dispatch({ type: 'SET_COLOR', color: c });
  }, []);

  return (
    <div className="gomoku-shell font-sans selection:bg-purple-200/70">
      <div className="gomoku-cosmic-bg" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex max-w-xl items-center justify-between px-5 py-8 sm:px-8">
        <Link href="/" scroll={false} className="gomoku-back-link">
          <span aria-hidden="true">←</span>
          返回主页
        </Link>
      </nav>

      <main className="relative z-10 mx-auto max-w-xl px-5 pb-28 sm:px-8 sm:pb-36">
        <header className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            C++ AI Engine · WebAssembly
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            五子棋 Gomoku
          </h1>
        </header>

        {/* Board */}
        <div className="gomoku-glass rounded-[1.5rem] p-3 sm:p-5">
          <div ref={boardWrapperRef} className="gomoku-board-wrapper">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`gomoku-canvas ${state.isAIThinking || state.gameOver ? 'gomoku-disabled' : ''}`}
            />
          </div>
        </div>

        {/* Status bar */}
        <div className="mx-auto mt-4">
          <div className="gomoku-glass rounded-full px-6 py-2.5 text-center">
            <div className="gomoku-inner flex items-center justify-center gap-2">
              {state.isAIThinking && <span className="gomoku-thinking-dot" />}
              <span
                className={`text-sm font-bold ${
                  state.gameOver
                    ? state.winner === state.humanPlayer
                      ? 'text-emerald-500'
                      : state.winner === state.aiPlayer
                        ? 'text-rose-500'
                        : 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                {state.statusMessage}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="gomoku-glass mt-4 rounded-[1.5rem] p-5">
          <div className="gomoku-inner space-y-4">
            {/* Difficulty + color in one row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  难度
                </p>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard', 'master'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDifficulty(d)}
                      className={`gomoku-diff-btn flex-1 rounded-full px-2 py-2 text-xs font-bold transition-all ${
                        state.difficulty === d
                          ? 'bg-slate-900 text-white shadow-lg'
                          : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-700'
                      }`}
                    >
                      {DIFF_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  执子
                </p>
                <div className="flex gap-1.5">
                  {([BLACK, WHITE] as Player[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColor(c)}
                      disabled={state.isAIThinking}
                      className={`gomoku-color-btn flex-1 rounded-full px-2 py-2 text-xs font-bold transition-all ${
                        state.humanPlayer === c
                          ? 'bg-slate-900 text-white shadow-lg'
                          : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-700'
                      } disabled:opacity-50`}
                    >
                      {c === BLACK ? '⚫ 黑棋' : '⚪ 白棋'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons + move count */}
            <div className="flex items-center gap-2">
              <button onClick={handleNewGame} className="gomoku-action-btn flex-1 rounded-full px-4 py-2.5 text-sm font-black">
                新游戏
              </button>
              <button
                onClick={handleUndo}
                disabled={state.isAIThinking || state.moveHistory.length < 2 || state.difficulty === 'hard' || state.difficulty === 'master'}
                className="gomoku-action-btn flex-1 rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-40"
              >
                悔棋
              </button>
              <span className="gomoku-chip shrink-0">
                第 {state.moveHistory.length} 手
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

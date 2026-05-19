import { BOARD_SIZE, EMPTY, BLACK, WHITE, CellState, Player, GameState, Difficulty } from './types';

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function createEmptyBoard(): CellState[][] {
  return Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY));
}

export function isValidMove(board: CellState[][], row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === EMPTY;
}

export function makeMove(
  board: CellState[][],
  row: number,
  col: number,
  player: Player
): CellState[][] {
  const next = board.map(r => [...r]);
  next[row][col] = player;
  return next;
}

export function checkWin(board: CellState[][], row: number, col: number): [number, number][] | null {
  const player = board[row][col];
  if (player === EMPTY) return null;

  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [[row, col]];
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push([r, c]);
      } else break;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push([r, c]);
      } else break;
    }
    if (line.length >= 5) return line.slice(0, 5);
  }
  return null;
}

export function genCands(board: Int32Array | number[]): [number, number][] {
  const cands: [number, number][] = [];
  const seen = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] === EMPTY) continue;
    const r = Math.floor(i / BOARD_SIZE);
    const c = i % BOARD_SIZE;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > 2) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        const idx = nr * BOARD_SIZE + nc;
        if (board[idx] !== EMPTY) continue;
        if (seen.has(idx)) continue;
        seen.add(idx);
        cands.push([nr, nc]);
      }
    }
  }
  return cands;
}

export function flatBoard(board: CellState[][]): Int32Array {
  const flat = new Int32Array(BOARD_SIZE * BOARD_SIZE);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      flat[r * BOARD_SIZE + c] = board[r][c];
    }
  }
  return flat;
}

export function getInitialState(difficulty: Difficulty, humanColor: Player): GameState {
  const aiColor: Player = humanColor === BLACK ? WHITE : BLACK;
  return {
    board: createEmptyBoard(),
    currentPlayer: BLACK,
    humanPlayer: humanColor,
    aiPlayer: aiColor,
    difficulty,
    gameOver: false,
    winner: EMPTY,
    winLine: null,
    moveHistory: [],
    isAIThinking: aiColor === BLACK,
    statusMessage: aiColor === BLACK ? 'AI 思考中...' : '轮到你落子',
  };
}

import type { GameAction } from './types';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY': {
      return { ...state, difficulty: action.difficulty! };
    }
    case 'SET_COLOR': {
      const newHuman: Player = action.color!;
      const newAI: Player = newHuman === BLACK ? WHITE : BLACK;
      return {
        ...getInitialState(state.difficulty, newHuman),
        difficulty: state.difficulty,
      };
    }
    case 'NEW_GAME': {
      return getInitialState(state.difficulty, state.humanPlayer);
    }
    case 'AI_START_THINKING': {
      return { ...state, isAIThinking: true, statusMessage: 'AI 思考中...' };
    }
    case 'AI_CANCELLED': {
      return { ...state, isAIThinking: false, statusMessage: 'AI 思考被中断' };
    }
    case 'CELL_CLICK': {
      const { row, col } = action;
      if (row === undefined || col === undefined) return state;
      if (state.gameOver || state.isAIThinking) return state;
      if (state.currentPlayer !== state.humanPlayer) return state;
      if (!isValidMove(state.board, row, col)) return state;

      const newBoard = makeMove(state.board, row, col, state.humanPlayer);
      const winLine = checkWin(newBoard, row, col);
      const newHistory = [...state.moveHistory, { row, col, player: state.humanPlayer }];

      if (winLine) {
        return {
          ...state,
          board: newBoard,
          currentPlayer: state.aiPlayer,
          gameOver: true,
          winner: state.humanPlayer,
          winLine,
          moveHistory: newHistory,
          statusMessage: '哼，侥幸而已！',
        };
      }

      if (newHistory.length >= BOARD_SIZE * BOARD_SIZE) {
        return {
          ...state,
          board: newBoard,
          gameOver: true,
          moveHistory: newHistory,
          statusMessage: '硬拖到平局，这就是你的本事吗？！',
        };
      }

      return {
        ...state,
        board: newBoard,
        currentPlayer: state.aiPlayer,
        moveHistory: newHistory,
        isAIThinking: true,
        statusMessage: 'AI 思考中...',
      };
    }
    case 'AI_MOVE': {
      const { row, col } = action;
      if (row === undefined || col === undefined) return { ...state, isAIThinking: false };
      if (!isValidMove(state.board, row, col)) {
        return {
          ...state,
          isAIThinking: false,
          currentPlayer: state.humanPlayer,
          statusMessage: 'AI 出错，请重试',
        };
      }

      const newBoard = makeMove(state.board, row, col, state.aiPlayer);
      const winLine = checkWin(newBoard, row, col);
      const newHistory = [...state.moveHistory, { row, col, player: state.aiPlayer }];

      if (winLine) {
        return {
          ...state,
          board: newBoard,
          currentPlayer: state.humanPlayer,
          gameOver: true,
          winner: state.aiPlayer,
          winLine,
          moveHistory: newHistory,
          isAIThinking: false,
          statusMessage: '被打败了吧？杂鱼~杂鱼~ ♡',
        };
      }

      if (newHistory.length >= BOARD_SIZE * BOARD_SIZE) {
        return {
          ...state,
          board: newBoard,
          gameOver: true,
          moveHistory: newHistory,
          isAIThinking: false,
          statusMessage: '平局',
        };
      }

      return {
        ...state,
        board: newBoard,
        currentPlayer: state.humanPlayer,
        moveHistory: newHistory,
        isAIThinking: false,
        statusMessage: '轮到你落子',
      };
    }
    case 'UNDO': {
      if (state.isAIThinking || state.moveHistory.length < 2) return state;
      if (state.difficulty === 'hard' || state.difficulty === 'master') return state;
      const stepsBack = state.moveHistory[state.moveHistory.length - 1].player === state.humanPlayer ? 2 : 1;
      const newHistory = state.moveHistory.slice(0, -stepsBack);
      let newBoard = createEmptyBoard();
      for (const m of newHistory) {
        newBoard[m.row][m.col] = m.player;
      }
      return {
        ...state,
        board: newBoard,
        currentPlayer: state.humanPlayer,
        gameOver: false,
        winner: EMPTY,
        winLine: null,
        moveHistory: newHistory,
        statusMessage: '轮到你落子',
      };
    }
    default:
      return state;
  }
}

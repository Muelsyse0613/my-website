export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type CellState = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Player = typeof BLACK | typeof WHITE;
export type Difficulty = 'easy' | 'medium' | 'hard' | 'master';

export interface GameState {
  board: CellState[][];
  currentPlayer: Player;
  humanPlayer: Player;
  aiPlayer: Player;
  difficulty: Difficulty;
  gameOver: boolean;
  winner: CellState;
  winLine: [number, number][] | null;
  moveHistory: { row: number; col: number; player: Player }[];
  isAIThinking: boolean;
  statusMessage: string;
}

export type GameAction =
  | { type: 'CELL_CLICK'; row: number; col: number }
  | { type: 'AI_MOVE'; row: number; col: number }
  | { type: 'AI_START_THINKING' }
  | { type: 'AI_CANCELLED' }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_COLOR'; color: Player }
  | { type: 'NEW_GAME' }
  | { type: 'UNDO' };

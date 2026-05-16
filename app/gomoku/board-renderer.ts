import { BOARD_SIZE, EMPTY, BLACK, WHITE, CellState } from './types';

const BASE_CELL = 36;
const BASE_MARGIN = 28;
export const BASE_SIZE = BASE_MARGIN * 2 + (BOARD_SIZE - 1) * BASE_CELL;

const STAR_POINTS: [number, number][] = [
  [3, 3], [3, 7], [3, 11],
  [7, 3], [7, 7], [7, 11],
  [11, 3], [11, 7], [11, 11],
];

function layoutVars(displaySize: number) {
  const scale = displaySize / BASE_SIZE;
  return {
    cellSize: BASE_CELL * scale,
    margin: BASE_MARGIN * scale,
    scale,
  };
}

export function drawBoard(ctx: CanvasRenderingContext2D, displaySize: number): void {
  const { cellSize, margin } = layoutVars(displaySize);

  ctx.fillStyle = '#f5ead0';
  ctx.fillRect(0, 0, displaySize, displaySize);

  ctx.strokeStyle = 'rgba(23, 32, 51, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = margin + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(margin, pos);
    ctx.lineTo(margin + (BOARD_SIZE - 1) * cellSize, pos);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos, margin);
    ctx.lineTo(pos, margin + (BOARD_SIZE - 1) * cellSize);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(23, 32, 51, 0.6)';
  for (const [r, c] of STAR_POINTS) {
    ctx.beginPath();
    ctx.arc(margin + c * cellSize, margin + r * cellSize, 3.5 * layoutVars(displaySize).scale, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export function drawStones(
  ctx: CanvasRenderingContext2D,
  board: CellState[][],
  displaySize: number,
): void {
  const { cellSize, margin } = layoutVars(displaySize);
  const radius = cellSize * 0.43;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell === EMPTY) continue;

      const x = margin + c * cellSize;
      const y = margin + r * cellSize;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (cell === BLACK) {
        const grad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, radius * 0.05, x, y, radius);
        grad.addColorStop(0, '#4a4a4a');
        grad.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const grad = ctx.createRadialGradient(x - radius * 0.15, y - radius * 0.15, radius * 0.05, x, y, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#d4d4d4');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

export function drawLastMove(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  board: CellState[][],
  displaySize: number,
): void {
  const { cellSize, margin } = layoutVars(displaySize);
  const x = margin + col * cellSize;
  const y = margin + row * cellSize;
  const cell = board[row][col];

  ctx.beginPath();
  ctx.arc(x, y, 4.5 * layoutVars(displaySize).scale, 0, 2 * Math.PI);
  ctx.fillStyle = cell === BLACK ? '#ff6b6b' : '#e03131';
  ctx.fill();
}

export function drawWinLine(
  ctx: CanvasRenderingContext2D,
  winLine: [number, number][],
  displaySize: number,
): void {
  if (!winLine || winLine.length === 0) return;
  const { cellSize, margin } = layoutVars(displaySize);
  const radius = cellSize * 0.43;
  for (const [r, c] of winLine) {
    const x = margin + c * cellSize;
    const y = margin + r * cellSize;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

export function canvasToBoard(
  mouseX: number,
  mouseY: number,
  canvasElWidth: number,
  canvasElHeight: number,
  displaySize: number,
): { row: number; col: number } | null {
  const { cellSize, margin } = layoutVars(displaySize);
  const sx = displaySize / canvasElWidth;
  const sy = displaySize / canvasElHeight;
  const mx = mouseX * sx;
  const my = mouseY * sy;
  const col = Math.round((mx - margin) / cellSize);
  const row = Math.round((my - margin) / cellSize);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}

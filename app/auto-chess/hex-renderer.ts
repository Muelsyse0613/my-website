import {
  type BoardInterface,
  type GameState,
  type Position,
  type VFXEffect,
  type FloatingText,
  BOARD_COLS,
  BOARD_ROWS,
  BENCH_SLOTS,
  HEX_RADIUS,
  HEX_ROW_SPACING,
  SPRITE_SIZE,
  HEX_COL_SPACING,
  GamePhase,
  ItemType,
  Owner,
  UnitState,
} from './types';
import { gridToWorld, getHexVertices, ITEMS } from './game-logic';

// ===== Sprite Cache =====
const spriteCache = new Map<string, HTMLImageElement>();
const unitSpriteMap = new Map<string, HTMLImageElement>();
const itemIconCache = new Map<ItemType, HTMLImageElement>();

export function preloadSprite(spriteFile: string, unitName?: string): void {
  const key = unitName ?? spriteFile;
  if (unitSpriteMap.has(key)) return;
  const img = new Image();
  img.src = `/auto-chess/sprites/${spriteFile}`;
  img.onload = () => {
    spriteCache.set(spriteFile, img);
    unitSpriteMap.set(key, img);
  };
  spriteCache.set(spriteFile, img);
  unitSpriteMap.set(key, img);
}

function getUnitSprite(unitName: string): HTMLImageElement | null {
  return unitSpriteMap.get(unitName) ?? null;
}

export function preloadItemIcons(): void {
  const iconMap: [ItemType, string][] = [
    [ItemType.IronSword, 'iron_sword'],
    [ItemType.ChainMail, 'chain_mail'],
    [ItemType.Bow, 'bow'],
    [ItemType.BlueCrystal, 'blue_crystal'],
  ];
  for (const [type, file] of iconMap) {
    const img = new Image();
    img.src = `/auto-chess/items/${file}.png`;
    img.onload = () => itemIconCache.set(type, img);
    itemIconCache.set(type, img);
  }
}

function getItemIcon(type: ItemType): HTMLImageElement | null {
  return itemIconCache.get(type) ?? null;
}

// ===== Dynamic Layout State =====
let layoutScale = 1;
let boardOriginX = 0;
let boardOriginY = 0;
let benchOriginX = 0;
let benchOriginY = 0;
let shopOriginX = 0;
let shopOriginY = 0;
let equipOriginX = 0;
let equipOriginY = 0;
let canvasW = 880;
let canvasH = 680;

export function getLayout() {
  return { layoutScale, boardOriginX, boardOriginY, benchOriginX, benchOriginY,
           shopOriginX, shopOriginY, equipOriginX, equipOriginY, canvasW, canvasH };
}

export function updateLayout(displayWidth: number, displayHeight: number): void {
  canvasW = displayWidth;
  canvasH = displayHeight;

  const isMobile = displayWidth < 700;

  // Compute board dimensions in world space
  const boardWorldW = BOARD_COLS * HEX_COL_SPACING + HEX_RADIUS;
  const boardWorldH = BOARD_ROWS * HEX_ROW_SPACING + HEX_RADIUS;

  if (isMobile) {
    // Mobile layout: keep bench horizontal on top and give the board the rest
    // of the canvas. Shop/equipment controls are rendered by React below the
    // canvas on small screens, so the playable board no longer gets squeezed.
    const { slotSize } = getBenchMetrics();
    const sidePadding = 8;
    const benchBottom = sidePadding + slotSize + 22;
    const boardAreaY = benchBottom;
    const boardAreaW = displayWidth - sidePadding * 2;
    const boardAreaH = displayHeight - boardAreaY - sidePadding;

    benchOriginX = sidePadding;
    benchOriginY = sidePadding;

    const scaleX = boardAreaW / boardWorldW;
    const scaleY = boardAreaH / boardWorldH;
    layoutScale = Math.min(scaleX, scaleY, 1.0);

    const scaledW = boardWorldW * layoutScale;
    const scaledH = boardWorldH * layoutScale;
    boardOriginX = sidePadding + (boardAreaW - scaledW) / 2;
    boardOriginY = boardAreaY + (boardAreaH - scaledH) / 2;

    // Kept for coordinate helpers; mobile shop/equipment canvas hit targets are disabled.
    shopOriginX = displayWidth;
    shopOriginY = displayHeight;
    equipOriginX = displayWidth;
    equipOriginY = displayHeight;
  } else {
    // Desktop layout: bench left, board center, shop right
    const benchW = 90;
    const shopW = 140;
    benchOriginX = 4;
    benchOriginY = 60;

    const boardAreaW = displayWidth - benchW - shopW - 30;
    const boardAreaH = displayHeight - 30;
    const scaleX = boardAreaW / boardWorldW;
    const scaleY = boardAreaH / boardWorldH;
    layoutScale = Math.min(scaleX, scaleY, 1.0);

    const scaledW = boardWorldW * layoutScale;
    const scaledH = boardWorldH * layoutScale;
    boardOriginX = benchW + (boardAreaW - scaledW) / 2;
    boardOriginY = (displayHeight - scaledH) / 2;

    shopOriginX = displayWidth - shopW - 8;
    shopOriginY = 20;
    equipOriginX = shopOriginX;
    equipOriginY = 360;
  }
}

// ===== Hex center on canvas =====
function hexCenterToCanvas(row: number, col: number): { x: number; y: number } {
  const w = gridToWorld(row, col);
  return {
    x: boardOriginX + w.x * layoutScale,
    y: boardOriginY + w.y * layoutScale,
  };
}

function getScaledHexRadius(): number {
  return HEX_RADIUS * layoutScale;
}

function getBenchMetrics(): { slotSize: number; gap: number } {
  if (canvasW < 700) {
    const gap = 6;
    const available = Math.max(0, canvasW - 16 - (BENCH_SLOTS - 1) * gap);
    const slotSize = Math.max(34, Math.min(44, available / BENCH_SLOTS));
    return { slotSize, gap };
  }
  return { slotSize: 52, gap: 14 };
}

// ===== Main Render =====
export function renderAll(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  displayWidth: number,
  displayHeight: number
): void {
  updateLayout(displayWidth, displayHeight);

  const dpr = window.devicePixelRatio || 1;
  ctx.canvas.width = displayWidth * dpr;
  ctx.canvas.height = displayHeight * dpr;
  ctx.canvas.style.width = `${displayWidth}px`;
  ctx.canvas.style.height = `${displayHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  drawBackground(ctx, displayWidth, displayHeight);
  drawBenchSlots(ctx, state);
  drawHexGrid(ctx, state);
  drawEquipmentInventory(ctx, state);
  drawShop(ctx, state);
  drawVFX(ctx, state.vfxEffects);
  drawFloatingTexts(ctx, state.floatingTexts);
  if (state.dragging && state.dragMousePos) {
    drawDragHighlight(ctx, state);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 3, 50, w / 2, h / 2, w);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(1, '#0f0d21');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ===== Hex Grid =====
function drawHexGrid(ctx: CanvasRenderingContext2D, state: GameState): void {
  const r = getScaledHexRadius();
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const c = hexCenterToCanvas(row, col);
      const verts = getHexVertices(row, col).map((v) => ({
        x: boardOriginX + v.x * layoutScale,
        y: boardOriginY + v.y * layoutScale,
      }));

      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();

      const isPlayerHalf = state.board.isPlayerHalf({ col, row });
      const hasUnit = state.board.hasUnitAt({ col, row });
      const unit = state.board.getUnitAt({ col, row });

      if (isPlayerHalf) {
        ctx.fillStyle = hasUnit ? 'rgba(80, 60, 140, 0.7)' : 'rgba(40, 30, 80, 0.5)';
      } else {
        ctx.fillStyle = hasUnit ? 'rgba(140, 50, 50, 0.7)' : 'rgba(50, 25, 25, 0.5)';
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight drop target
      if (state.dragging && state.dragMousePos && isPlayerHalf && !hasUnit) {
        const gridTarget = canvasToGrid(state.dragMousePos.x, state.dragMousePos.y);
        if (gridTarget && gridTarget.col === col && gridTarget.row === row) {
          ctx.fillStyle = 'rgba(100, 255, 100, 0.25)';
          ctx.fill();
        }
      }

      if (unit && unit.state !== UnitState.Dead) {
        drawUnitOnHex(ctx, unit, c.x, c.y);
      }
    }
  }
}

function drawUnitOnHex(
  ctx: CanvasRenderingContext2D,
  unit: { name: string; owner: number; hp: number; maxHp: number; mana: number; maxMana: number; starLevel: number; state: number; items: { name: string; type: number }[] },
  cx: number,
  cy: number
): void {
  const img = getUnitSprite(unit.name);
  const size = SPRITE_SIZE * layoutScale;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = unit.owner === Owner.PlayerCtrl ? '#4a90d9' : '#d94a4a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, 14 * layoutScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.name[0] || '?', cx, cy);
  }

  if (unit.state === UnitState.Dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // HP bar
  const barW = (SPRITE_SIZE + 4) * layoutScale;
  const barH = Math.max(2, 4 * layoutScale);
  const barY = cy + size / 2 + 2;
  const hpRatio = Math.max(0, unit.hp / unit.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - barW / 2, barY, barW, barH);
  ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
  ctx.fillRect(cx - barW / 2, barY, barW * hpRatio, barH);

  // Mana bar
  if (unit.maxMana > 0) {
    const manaRatio = unit.mana / unit.maxMana;
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(cx - barW / 2, barY + barH + 1, barW * manaRatio, Math.max(1, 2 * layoutScale));
  }

  // Stars
  for (let i = 0; i < unit.starLevel; i++) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    const sx = cx - size / 2 + 5 + i * 8 * layoutScale;
    const sy = cy - size / 2 - 4;
    ctx.arc(sx, sy, 2.5 * layoutScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Item dots
  if (unit.items.length > 0) {
    for (let i = 0; i < unit.items.length; i++) {
      const ix = cx - size / 2 + 4 + i * 10 * layoutScale;
      const iy = barY + barH + 3;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(ix, iy, 8 * layoutScale, 3 * layoutScale);
    }
  }
}

// ===== Bench Slots =====
function drawBenchSlots(ctx: CanvasRenderingContext2D, state: GameState): void {
  const isMobile = canvasW < 700;
  const { slotSize, gap } = getBenchMetrics();

  for (let i = 0; i < BENCH_SLOTS; i++) {
    const x = isMobile ? (benchOriginX + i * (slotSize + gap) + slotSize / 2) : (benchOriginX + slotSize / 2);
    const y = isMobile ? (benchOriginY + slotSize / 2) : (benchOriginY + i * (slotSize + gap) + slotSize / 2);

    ctx.fillStyle = state.bench[i] ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 8);
    ctx.fill();
    ctx.stroke();

    // Drag target highlight
    if (state.dragging && state.dragMousePos) {
      const mx = state.dragMousePos.x;
      const my = state.dragMousePos.y;
      if (mx > x - slotSize / 2 && mx < x + slotSize / 2 && my > y - slotSize / 2 && my < y + slotSize / 2) {
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 8);
        ctx.stroke();
      }
    }

    const unit = state.bench[i];
    if (unit) {
      const img = getUnitSprite(unit.name);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - slotSize / 2 + 4, y - slotSize / 2 + 4, slotSize - 8, slotSize - 8);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, slotSize / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4a90d9';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unit.name[0] || '?', x, y);
      }

      if (unit.starLevel > 1) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(unit.starLevel), x, y + slotSize / 2 + 9);
      }

      const hpRatio = unit.hp / unit.maxHp;
      const barW = slotSize - 12;
      const barH = 3;
      const barY = y + slotSize / 2 + 3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - barW / 2, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(x - barW / 2, barY, barW * hpRatio, barH);
    }
  }
}

// ===== Equipment Inventory =====
function drawEquipmentInventory(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (canvasW < 700) return;
  const x = equipOriginX;
  const y = equipOriginY;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('装备栏', x, y + 12);
  for (let i = 0; i < state.equipmentInventory.length; i++) {
    const item = state.equipmentInventory[i];
    const ix = x + i * 40;
    const iy = y + 18;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ix, iy, 36, 36, 6);
    ctx.fill();
    ctx.stroke();
    const icon = getItemIcon(item.type);
    if (icon && icon.complete && icon.naturalWidth > 0) {
      ctx.drawImage(icon, ix + 4, iy + 4, 28, 28);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, ix + 18, iy + 20);
    }
  }
}

// ===== Shop =====
function drawShop(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== GamePhase.Preparation || canvasW < 700) return;
  const x = shopOriginX;
  const y = shopOriginY;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('商店', x, y - 6);
  for (let i = 0; i < state.shopUnits.length; i++) {
    const unit = state.shopUnits[i];
    const sy = y + 6 + i * 46;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, sy, 130, 40, 8);
    ctx.fill();
    ctx.stroke();
    if (unit) {
      const img = getUnitSprite(unit.name);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + 3, sy + 4, 32, 32);
      }
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(unit.name, x + 38, sy + 16);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px sans-serif';
      ctx.fillText([...unit.traits].join(','), x + 38, sy + 29);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`$${unit.price}`, x + 122, sy + 24);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('已购买', x + 65, sy + 22);
    }
  }
}

// ===== VFX =====
function drawVFX(ctx: CanvasRenderingContext2D, effects: VFXEffect[]): void {
  const now = performance.now();
  for (const vfx of effects) {
    const elapsed = now - vfx.createdAt;
    const alpha = Math.max(0, 1 - elapsed / vfx.duration);
    if (vfx.type === 'lineAoe' && vfx.startPos && vfx.endPos) {
      ctx.strokeStyle = `rgba(255, 100, 50, ${alpha})`;
      ctx.lineWidth = 3 * layoutScale;
      ctx.beginPath();
      ctx.moveTo(boardOriginX + vfx.startPos.x * layoutScale, boardOriginY + vfx.startPos.y * layoutScale);
      ctx.lineTo(boardOriginX + vfx.endPos.x * layoutScale, boardOriginY + vfx.endPos.y * layoutScale);
      ctx.stroke();
    }
    if (vfx.type === 'healAura' && vfx.centerPos) {
      const cx = boardOriginX + vfx.centerPos.x * layoutScale;
      const cy = boardOriginY + vfx.centerPos.y * layoutScale;
      ctx.strokeStyle = `rgba(100, 255, 100, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (vfx.radius ?? 100) * layoutScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(100, 255, 100, ${alpha * 0.1})`;
      ctx.fill();
    }
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  const now = performance.now();
  for (const ft of texts) {
    const elapsed = now - ft.createdAt;
    const alpha = Math.max(0, 1 - elapsed / ft.duration);
    const yOff = -elapsed / ft.duration * 30;
    const hex = ft.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.font = `bold ${Math.max(11, 14 * layoutScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, boardOriginX + ft.x * layoutScale, boardOriginY + ft.y * layoutScale + yOff);
  }
}

function drawDragHighlight(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.dragging || !state.dragMousePos) return;
  const unit = state.units.find((u) => u.id === state.dragging!.unitId);
  if (!unit) return;
  const img = getUnitSprite(unit.name);
  const size = SPRITE_SIZE * layoutScale;
  const mx = state.dragMousePos.x;
  const my = state.dragMousePos.y;
  ctx.globalAlpha = 0.7;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, mx - size / 2, my - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(mx, my, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#4a90d9';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ===== Coordinate Conversions (public, used by page.tsx) =====

export function canvasToGrid(canvasX: number, canvasY: number): Position | null {
  // Convert canvas coords to hex grid position
  const worldX = (canvasX - boardOriginX) / layoutScale;
  const worldY = (canvasY - boardOriginY) / layoutScale;
  let best: Position | null = null;
  let bestDist = Infinity;
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const c = gridToWorld(row, col);
      const d2 = (worldX - c.x) ** 2 + (worldY - c.y) ** 2;
      if (d2 < bestDist) { bestDist = d2; best = { col, row }; }
    }
  }
  if (best && bestDist > HEX_RADIUS ** 2 * 2.0) return null;
  return best;
}

export function canvasToBenchSlot(canvasX: number, canvasY: number): number {
  const isMobile = canvasW < 700;
  const { slotSize, gap } = getBenchMetrics();
  for (let i = 0; i < BENCH_SLOTS; i++) {
    const x = isMobile ? (benchOriginX + i * (slotSize + gap) + slotSize / 2) : (benchOriginX + slotSize / 2);
    const y = isMobile ? (benchOriginY + slotSize / 2) : (benchOriginY + i * (slotSize + gap) + slotSize / 2);
    if (canvasX > x - slotSize / 2 && canvasX < x + slotSize / 2 &&
        canvasY > y - slotSize / 2 && canvasY < y + slotSize / 2) {
      return i;
    }
  }
  return -1;
}

export function canvasToShopSlot(canvasX: number, canvasY: number): number {
  if (canvasW < 700) return -1;
  const sx = shopOriginX;
  const sy = shopOriginY + 6;
  for (let i = 0; i < 5; i++) {
    const iy = sy + i * 46;
    if (canvasX > sx && canvasX < sx + 130 && canvasY > iy && canvasY < iy + 40) {
      return i;
    }
  }
  return -1;
}

export function canvasToEquipSlot(canvasX: number, canvasY: number): number {
  if (canvasW < 700) return -1;
  const ex = equipOriginX;
  const ey = equipOriginY + 18;
  for (let i = 0; i < 4; i++) {
    const ix = ex + i * 40;
    if (canvasX > ix && canvasX < ix + 36 && canvasY > ey && canvasY < ey + 36) {
      return i;
    }
  }
  return -1;
}

export function gridCenterToCanvas(pos: Position): { x: number; y: number } {
  const w = gridToWorld(pos.row, pos.col);
  return {
    x: boardOriginX + w.x * layoutScale,
    y: boardOriginY + w.y * layoutScale,
  };
}

export function benchSlotCenterToCanvas(slot: number): { x: number; y: number } {
  const isMobile = canvasW < 700;
  const { slotSize, gap } = getBenchMetrics();
  return {
    x: isMobile ? (benchOriginX + slot * (slotSize + gap) + slotSize / 2) : (benchOriginX + slotSize / 2),
    y: isMobile ? (benchOriginY + slotSize / 2) : (benchOriginY + slot * (slotSize + gap) + slotSize / 2),
  };
}

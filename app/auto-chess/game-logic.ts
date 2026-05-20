import {
  type BoardInterface,
  type GameState,
  type GameAction,
  type HeroTemplate,
  type Item,
  type Position,
  type Skill,
  type UnitInstance,
  type FloatingText,
  type VFXEffect,
  BENCH_SLOTS,
  BOARD_COLS,
  BOARD_ROWS,
  GamePhase,
  HEX_COL_SPACING,
  HEX_RADIUS,
  HEX_ROW_SPACING,
  ItemType,
  Owner,
  SHOP_SLOTS,
  SPRITE_SIZE,
  TRAIT_BONUSES,
  TRAIT_MECHANICS,
  TraitBonusType,
  TraitMechanic,
  UnitState,
} from './types';

// ===== ID generators =====
let nextUnitId = 1;
let nextFloatingId = 1;
let nextVfxId = 1;

export function resetIds(): void {
  nextUnitId = 1;
  nextFloatingId = 1;
  nextVfxId = 1;
}

// ===== Board Class =====
export class Board implements BoardInterface {
  private cells: (UnitInstance | null)[] = new Array(BOARD_ROWS * BOARD_COLS).fill(null);
  private unitToPos = new Map<number, Position>();

  indexOf(pos: Position): number {
    return pos.row * BOARD_COLS + pos.col;
  }

  addUnit(unit: UnitInstance, pos: Position): void {
    const idx = this.indexOf(pos);
    if (this.cells[idx]) return;
    this.cells[idx] = unit;
    this.unitToPos.set(unit.id, { ...pos });
    unit.position = { ...pos };
  }

  removeUnit(unit: UnitInstance): void {
    const pos = this.unitToPos.get(unit.id);
    if (!pos) return;
    this.cells[this.indexOf(pos)] = null;
    this.unitToPos.delete(unit.id);
  }

  getUnitAt(pos: Position): UnitInstance | null {
    if (!this.isValidPosition(pos)) return null;
    return this.cells[this.indexOf(pos)];
  }

  hasUnitAt(pos: Position): boolean {
    return this.getUnitAt(pos) !== null;
  }

  containsUnit(unit: UnitInstance): boolean {
    return this.unitToPos.has(unit.id);
  }

  isValidPosition(pos: Position): boolean {
    return pos.col >= 0 && pos.col < BOARD_COLS && pos.row >= 0 && pos.row < BOARD_ROWS;
  }

  isPlayerHalf(pos: Position): boolean {
    return pos.row >= BOARD_ROWS / 2;
  }

  clear(): void {
    this.cells.fill(null);
    this.unitToPos.clear();
  }

  getAllUnits(): UnitInstance[] {
    return this.cells.filter((u): u is UnitInstance => u !== null && u.state !== UnitState.Dead);
  }

  getUnitPosition(unit: UnitInstance): Position | undefined {
    return this.unitToPos.get(unit.id);
  }

  cloneForBattle(): Board {
    const b = new Board();
    for (const [id, pos] of this.unitToPos) {
      b.unitToPos.set(id, { ...pos });
    }
    for (let i = 0; i < this.cells.length; i++) {
      b.cells[i] = this.cells[i];
    }
    return b;
  }
}

// ===== Hex Geometry =====
export function gridToWorld(row: number, col: number): { x: number; y: number } {
  const xOffset = (row % 2 === 0) ? 0 : HEX_COL_SPACING / 2;
  return {
    x: xOffset + col * HEX_COL_SPACING + HEX_COL_SPACING / 2,
    y: row * HEX_ROW_SPACING + HEX_ROW_SPACING / 2,
  };
}

export function worldToGrid(wx: number, wy: number): Position | null {
  let best: Position | null = null;
  let bestDist = Infinity;
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const c = gridToWorld(row, col);
      const d2 = (wx - c.x) ** 2 + (wy - c.y) ** 2;
      if (d2 < bestDist) {
        bestDist = d2;
        best = { col, row };
      }
    }
  }
  return best;
}

export function getHexVertices(
  row: number,
  col: number
): { x: number; y: number }[] {
  const c = gridToWorld(row, col);
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    verts.push({
      x: c.x + HEX_RADIUS * Math.cos(angle),
      y: c.y + HEX_RADIUS * Math.sin(angle),
    });
  }
  return verts;
}

// ===== Unit Factory =====
export function createUnitFromTemplate(
  tpl: HeroTemplate,
  owner: Owner,
  pos: Position = { col: 0, row: 0 }
): UnitInstance {
  const starLevel = 1;
  const unit: UnitInstance = {
    id: nextUnitId++,
    name: tpl.name,
    owner,
    position: { ...pos },
    state: UnitState.Idle,
    hp: tpl.hp,
    maxHp: tpl.hp,
    atk: tpl.atk,
    range: tpl.range,
    maxMana: tpl.maxMana,
    mana: tpl.startingMana,
    armor: tpl.armor,
    magicRes: tpl.magicRes,
    price: tpl.price,
    starLevel,
    traits: new Set(tpl.traits),
    baseMaxHp: tpl.hp,
    baseAtk: tpl.atk,
    baseArmor: tpl.armor,
    baseMagicRes: tpl.magicRes,
    target: null,
    attackSpeed: 60,
    attackCooldown: 0,
    moveSpeed: 40,
    moveCooldown: 0,
    skill: createSkillFromType(tpl.skillType),
    startingMana: tpl.startingMana,
    stunRemaining: 0,
    moving: false,
    smoothPos: gridToWorld(pos.row, pos.col),
    moveTarget: { ...pos },
    items: [],
    maxEquipSlots: 1,
  };
  return unit;
}

// ===== Skills =====
function createSkillFromType(type: string): Skill | null {
  switch (type) {
    case 'Stun':
      return STUN_SKILL;
    case 'LineAOE':
      return LINE_AOE_SKILL;
    case 'HealAura':
      return HEAL_AURA_SKILL;
    default:
      return null;
  }
}

function getSkillMultiplier(
  caster: UnitInstance,
  state: GameState
): number {
  return getMechanicBonuses(caster.traits, state.traitCounts).skillDamageMultiplier;
}

function getDoubleChance(
  unit: UnitInstance,
  state: GameState
): number {
  return getMechanicBonuses(unit.traits, state.traitCounts).doubleAttackChance;
}

const STUN_SKILL: Skill = {
  type: 'Stun',
  manaCost: 60,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, _board, state) {
    const mult = getSkillMultiplier(caster, state);
    const dmg = Math.floor(30 * mult);
    takeDamage(target, dmg, false);
    target.stunRemaining = 90;
    target.state = UnitState.Stunned;
    addFloating(state, target.smoothPos.x, target.smoothPos.y, `-${dmg}`, '#ff6464');
  },
};

const LINE_AOE_SKILL: Skill = {
  type: 'LineAOE',
  manaCost: 60,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, board, state) {
    const mult = getSkillMultiplier(caster, state);
    const baseDamage = 60 + Math.floor(0.5 * caster.atk);
    const totalDamage = Math.floor(baseDamage * mult);
    const startRow = caster.position.row;
    const startCol = caster.position.col;
    const endRow = target.position.row;
    const endCol = target.position.col;

    // Bresenham line
    const dr = Math.abs(endRow - startRow);
    const dc = Math.abs(endCol - startCol);
    const steps = Math.max(dr, dc);
    if (steps === 0) return;

    const affected = new Set<number>();
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const r = Math.round(startRow + (endRow - startRow) * t);
      const c = Math.round(startCol + (endCol - startCol) * t);
      const u = board.getUnitAt({ col: c, row: r });
      if (u && u.owner !== caster.owner && u.hp > 0 && !affected.has(u.id)) {
        affected.add(u.id);
        takeDamage(u, totalDamage, true);
        addFloating(state, u.smoothPos.x, u.smoothPos.y, `-${totalDamage}`, '#ff9800');
        if (u.state === UnitState.Dead) {
          handleUnitDeath(u, state);
        }
      }
    }

    addVfx(state, {
      id: nextVfxId++,
      type: 'lineAoe',
      startPos: gridToWorld(startRow, startCol),
      endPos: gridToWorld(endRow, endCol),
      createdAt: performance.now(),
      duration: 300,
    });
  },
};

const HEAL_AURA_SKILL: Skill = {
  type: 'HealAura',
  manaCost: 60,
  canCast() {
    return true;
  },
  cast(caster, _target, board, state) {
    const healAmt = 80;
    const center = caster.position;
    for (const ally of board.getAllUnits()) {
      if (ally.owner === caster.owner && ally.hp > 0) {
        const dist =
          Math.abs(ally.position.col - center.col) +
          Math.abs(ally.position.row - center.row);
        if (dist <= 2) {
          ally.hp = Math.min(ally.hp + healAmt, ally.maxHp);
          addFloating(state, ally.smoothPos.x, ally.smoothPos.y, `+${healAmt}`, '#64ff64');
        }
      }
    }
    addVfx(state, {
      id: nextVfxId++,
      type: 'healAura',
      centerPos: gridToWorld(center.row, center.col),
      radius: 2 * HEX_COL_SPACING,
      createdAt: performance.now(),
      duration: 300,
    });
  },
};

// ===== Damage =====
function armorReduce(dmg: number, armor: number): number {
  return Math.max(1, dmg - Math.floor(armor * 0.1));
}

function mrReduce(dmg: number, mr: number): number {
  return Math.max(1, dmg - Math.floor(mr * 0.1));
}

export function takeDamage(
  unit: UnitInstance,
  dmg: number,
  isMagic: boolean
): number {
  const actual = isMagic ? mrReduce(dmg, unit.magicRes) : armorReduce(dmg, unit.armor);
  unit.hp = Math.max(0, unit.hp - actual);
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.state = UnitState.Dead;
    unit.target = null;
  }
  return actual;
}

// ===== Item System =====
export const ITEMS: Record<ItemType, Item> = {
  [ItemType.IronSword]: {
    type: ItemType.IronSword,
    name: '铁剑',
    description: '+15 攻击力',
  },
  [ItemType.ChainMail]: {
    type: ItemType.ChainMail,
    name: '锁子甲',
    description: '+150 生命值',
  },
  [ItemType.Bow]: {
    type: ItemType.Bow,
    name: '反曲弓',
    description: '攻击间隔 -20%',
  },
  [ItemType.BlueCrystal]: {
    type: ItemType.BlueCrystal,
    name: '蓝水晶',
    description: '最大法力 -30',
  },
};

export function applyItemEffect(item: Item, unit: UnitInstance): void {
  switch (item.type) {
    case ItemType.IronSword:
      unit.atk += 15;
      break;
    case ItemType.ChainMail:
      unit.maxHp += 150;
      unit.hp += 150;
      break;
    case ItemType.Bow:
      unit.attackSpeed = Math.max(10, Math.floor(unit.attackSpeed * 0.8));
      break;
    case ItemType.BlueCrystal:
      unit.maxMana = Math.max(10, unit.maxMana - 30);
      break;
  }
}

export function removeItemEffect(item: Item, unit: UnitInstance): void {
  switch (item.type) {
    case ItemType.IronSword:
      unit.atk -= 15;
      break;
    case ItemType.ChainMail:
      unit.maxHp -= 150;
      unit.hp = Math.min(unit.hp, unit.maxHp);
      break;
    case ItemType.Bow:
      unit.attackSpeed = Math.floor(unit.attackSpeed / 0.8);
      break;
    case ItemType.BlueCrystal:
      unit.maxMana += 30;
      break;
  }
}

// ===== Trait System =====
export function calculateTraitCounts(
  units: UnitInstance[],
  board: BoardInterface
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const u of board.getAllUnits()) {
    if (u.owner === Owner.PlayerCtrl && u.hp > 0) {
      for (const trait of u.traits) {
        counts.set(trait, (counts.get(trait) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function calculateFinalStats(
  base: { maxHp: number; atk: number; armor: number; magicRes: number },
  traits: Set<string>,
  counts: Map<string, number>
): { maxHp: number; atk: number; armor: number; magicRes: number } {
  let hpPercent = 0;
  let hpFlat = 0;
  let armorBonus = 0;
  let mrBonus = 0;
  let atkPercent = 0;
  let atkFlat = 0;

  for (const trait of traits) {
    const bonuses = TRAIT_BONUSES[trait];
    if (!bonuses) continue;
    const currentCount = counts.get(trait) ?? 0;
    for (const bonus of bonuses) {
      if (currentCount >= bonus.requiredCount) {
        switch (bonus.type) {
          case TraitBonusType.HpPercent:
            hpPercent += bonus.value;
            break;
          case TraitBonusType.HpFlat:
            hpFlat += bonus.value;
            break;
          case TraitBonusType.Armor:
            armorBonus += bonus.value;
            break;
          case TraitBonusType.MagicRes:
            mrBonus += bonus.value;
            break;
          case TraitBonusType.AtkPercent:
            atkPercent += bonus.value;
            break;
          case TraitBonusType.AtkFlat:
            atkFlat += bonus.value;
            break;
        }
      }
    }
  }

  return {
    maxHp: Math.round(base.maxHp * (1 + hpPercent)) + hpFlat,
    atk: Math.round(base.atk * (1 + atkPercent)) + atkFlat,
    armor: base.armor + armorBonus,
    magicRes: base.magicRes + mrBonus,
  };
}

export function getMechanicBonuses(
  traits: Set<string>,
  counts: Map<string, number>
): { skillDamageMultiplier: number; doubleAttackChance: number } {
  let skillMult = 1.0;
  let doubleChance = 0.0;

  for (const trait of traits) {
    const mechanics = TRAIT_MECHANICS[trait];
    if (!mechanics) continue;
    const currentCount = counts.get(trait) ?? 0;
    for (const m of mechanics) {
      if (currentCount >= m.requiredCount) {
        if (m.mechanic === TraitMechanic.SkillDamageMultiplier) {
          skillMult = Math.max(skillMult, m.value);
        } else if (m.mechanic === TraitMechanic.DoubleAttackChance) {
          doubleChance = Math.max(doubleChance, m.value);
        }
      }
    }
  }

  return { skillDamageMultiplier: skillMult, doubleAttackChance: doubleChance };
}

export function recalcUnitStats(unit: UnitInstance, counts: Map<string, number>): void {
  const base = {
    maxHp: unit.baseMaxHp,
    atk: unit.baseAtk,
    armor: unit.baseArmor,
    magicRes: unit.baseMagicRes,
  };
  const enhanced = calculateFinalStats(base, unit.traits, counts);
  const hpDelta = enhanced.maxHp - unit.maxHp;
  unit.maxHp = enhanced.maxHp;
  unit.atk = enhanced.atk;
  unit.armor = enhanced.armor;
  unit.magicRes = enhanced.magicRes;
  unit.hp = Math.min(unit.hp + hpDelta, unit.maxHp);
}

// ===== Targeting =====
export function findTargetForUnit(
  unit: UnitInstance,
  allUnits: UnitInstance[],
  board: BoardInterface
): UnitInstance | null {
  const enemies = allUnits.filter(
    (u) =>
      u.owner !== unit.owner &&
      u.state !== UnitState.Dead &&
      board.containsUnit(u)
  );
  if (enemies.length === 0) return null;

  enemies.sort((a, b) => {
    const da =
      Math.abs(a.position.col - unit.position.col) +
      Math.abs(a.position.row - unit.position.row);
    const db =
      Math.abs(b.position.col - unit.position.col) +
      Math.abs(b.position.row - unit.position.row);
    if (da !== db) return da - db;
    if (a.hp !== b.hp) return a.hp - b.hp;
    if (a.position.col !== b.position.col) return a.position.col - b.position.col;
    return b.position.row - a.position.row;
  });

  return enemies[0];
}

// ===== Hex Neighbors =====
export function getNeighbors(
  pos: Position,
  board: BoardInterface
): Position[] {
  const { col, row } = pos;
  const even = row % 2 === 0;
  const candidates = even
    ? [
        { col: col + 1, row },
        { col: col - 1, row },
        { col: col, row: row - 1 },
        { col: col, row: row + 1 },
        { col: col + 1, row: row - 1 },
        { col: col + 1, row: row + 1 },
      ]
    : [
        { col: col + 1, row },
        { col: col - 1, row },
        { col: col, row: row - 1 },
        { col: col, row: row + 1 },
        { col: col - 1, row: row - 1 },
        { col: col - 1, row: row + 1 },
      ];

  return candidates.filter((p) => {
    if (!board.isValidPosition(p)) return false;
    const u = board.getUnitAt(p);
    return !u || u.state === UnitState.Dead;
  });
}

// ===== A* Pathfinding =====
function posKey(p: Position): string {
  return `${p.col},${p.row}`;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function findPath(
  start: Position,
  goal: Position,
  board: BoardInterface,
  maxSteps: number = 50
): Position[] {
  if (start.col === goal.col && start.row === goal.row) return [];
  if (board.hasUnitAt(goal)) {
    const neighbors = getNeighbors(goal, board);
    if (neighbors.length === 0) return [];
    let best = neighbors[0];
    let bestH = heuristic(start, best);
    for (let i = 1; i < neighbors.length; i++) {
      const h = heuristic(start, neighbors[i]);
      if (h < bestH) { bestH = h; best = neighbors[i]; }
    }
    const result = findPath(start, best, board, maxSteps);
    if (result.length > 0) return result;
    return [];
  }

  type AStarNode = { pos: Position; g: number; f: number };
  const openSet = new Map<string, AStarNode>();
  const cameFrom = new Map<string, Position>();
  const closedSet = new Set<string>();
  const startKey = posKey(start);
  openSet.set(startKey, { pos: start, g: 0, f: heuristic(start, goal) });

  let steps = 0;
  while (openSet.size > 0 && steps < maxSteps) {
    steps++;
    let currentKey = '';
    let current: AStarNode | null = null;
    let lowestF = Infinity;
    for (const [key, node] of openSet) {
      if (node.f < lowestF) { lowestF = node.f; currentKey = key; current = node; }
    }
    if (!current) break;

    if (current.pos.col === goal.col && current.pos.row === goal.row) {
      const rev: Position[] = [current.pos];
      const visited = new Set<string>();
      let ck = currentKey;
      while (cameFrom.has(ck) && !visited.has(ck)) {
        visited.add(ck);
        const parent = cameFrom.get(ck)!;
        rev.push(parent);
        ck = posKey(parent);
      }
      rev.reverse();
      return rev.slice(1);
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    for (const neighbor of getNeighbors(current.pos, board)) {
      const nk = posKey(neighbor);
      if (closedSet.has(nk)) continue;
      const g = current.g + 1;
      const existing = openSet.get(nk);
      if (existing && g >= existing.g) continue;
      openSet.set(nk, { pos: neighbor, g, f: g + heuristic(neighbor, goal) });
      cameFrom.set(nk, current.pos);
    }
  }

  return [];
}


// ===== Battle Tick =====
const COMBAT_TICK_MS = 16;

function handleUnitDeath(unit: UnitInstance, state: GameState): void {
  unit.state = UnitState.Dead;
  unit.target = null;
  const board = state.board;
  if (board.containsUnit(unit)) {
    board.removeUnit(unit);
    if (unit.owner === Owner.EnemyCtrl) {
      // Maybe drop equipment
      maybeDropEquipment(unit, state);
    }
  }
  // Remove from bench if dead (shouldn't normally happen)
  for (let i = 0; i < state.bench.length; i++) {
    if (state.bench[i]?.id === unit.id) {
      state.bench[i] = null;
    }
  }
}

function maybeDropEquipment(_unit: UnitInstance, state: GameState): void {
  // Simplified: 50% chance to drop a random item
  if (Math.random() < 0.5) {
    const allTypes = [ItemType.IronSword, ItemType.ChainMail, ItemType.Bow, ItemType.BlueCrystal];
    const dropType = allTypes[Math.floor(Math.random() * allTypes.length)];
    if (ITEMS[dropType]) {
      state.equipmentInventory = [...state.equipmentInventory, ITEMS[dropType]];
    }
  }
}

export function tickBattle(state: GameState): void {
  state.combatTickAcc += COMBAT_TICK_MS;
  if (state.combatTickAcc < COMBAT_TICK_MS) return;
  state.combatTickAcc -= COMBAT_TICK_MS;

  const board = state.board;
  const alive = state.units.filter(
    (u) => u.state !== UnitState.Dead && board.containsUnit(u)
  );

  for (const unit of alive) {
    // Stun handling
    if (unit.stunRemaining > 0) {
      unit.stunRemaining--;
      if (unit.stunRemaining <= 0) {
        unit.state = UnitState.Idle;
      }
      continue;
    }
    if (unit.state === UnitState.Dead) continue;

    // Cooldowns
    if (unit.attackCooldown > 0) unit.attackCooldown--;
    if (unit.moveCooldown > 0) unit.moveCooldown--;

    // Smooth movement
    if (unit.moving) {
      const targetWorld = gridToWorld(unit.moveTarget.row, unit.moveTarget.col);
      const dx = targetWorld.x - unit.smoothPos.x;
      const dy = targetWorld.y - unit.smoothPos.y;
      const dist = Math.hypot(dx, dy);
      const speed = HEX_ROW_SPACING / unit.moveSpeed;
      if (dist <= speed) {
        unit.smoothPos = { ...targetWorld };
        unit.moving = false;
        unit.state = UnitState.Idle;
        unit.moveCooldown = unit.moveSpeed;
      } else {
        unit.smoothPos = {
          x: unit.smoothPos.x + (dx / dist) * speed,
          y: unit.smoothPos.y + (dy / dist) * speed,
        };
      }
      continue;
    }

    // Maintain target
    if (!unit.target || unit.target.state === UnitState.Dead || !board.containsUnit(unit.target)) {
      unit.target = findTargetForUnit(unit, state.units, board);
    }
    if (!unit.target) {
      unit.state = UnitState.Idle;
      continue;
    }

    // Skill cast
    if (unit.skill && unit.mana >= unit.maxMana && unit.skill.canCast(unit, unit.target)) {
      unit.state = UnitState.Casting;
      unit.skill.cast(unit, unit.target, board, state);
      unit.mana = 0;
      if (unit.target && unit.target.state === UnitState.Dead) {
        handleUnitDeath(unit.target, state);
      }
      continue;
    }

    // Attack
    const myWorld = gridToWorld(unit.position.row, unit.position.col);
    const tw = gridToWorld(unit.target.position.row, unit.target.position.col);
    const pixelDist = Math.hypot(tw.x - myWorld.x, tw.y - myWorld.y);
    const effectiveRange = unit.range * HEX_COL_SPACING + 5;

    if (pixelDist <= effectiveRange) {
      if (unit.attackCooldown <= 0) {
        unit.state = UnitState.Attacking;
        const dmg = takeDamage(unit.target, unit.atk, false);
        unit.mana = Math.min(unit.maxMana, unit.mana + 15);
        unit.attackCooldown = unit.attackSpeed;
        addFloating(
          state,
          unit.target.smoothPos.x,
          unit.target.smoothPos.y,
          `-${dmg}`,
          '#ff4444'
        );

        if (unit.target.state === UnitState.Dead) {
          handleUnitDeath(unit.target, state);
        }

        // Double attack from trait
        const doubleChance = getDoubleChance(unit, state);
        if (
          doubleChance > 0 &&
          Math.random() < doubleChance &&
          unit.target &&
          unit.target.hp > 0
        ) {
          const dmg2 = takeDamage(unit.target, unit.atk, false);
          unit.mana = Math.min(unit.maxMana, unit.mana + 15);
          addFloating(
            state,
            unit.target.smoothPos.x,
            unit.target.smoothPos.y,
            `-${dmg2} Double!`,
            '#ff8800'
          );
          if (unit.target.state === UnitState.Dead) {
            handleUnitDeath(unit.target, state);
          }
        }
      }
      continue;
    }

    // Move toward target
    if (unit.moveCooldown <= 0) {
      const path = findPath(unit.position, unit.target.position, board);
      if (path.length > 0) {
        const next = path[0];
        if (!board.hasUnitAt(next) || board.getUnitAt(next)?.id === unit.id) {
          board.removeUnit(unit);
          board.addUnit(unit, next);
          unit.moveTarget = { ...next };
          unit.smoothPos = gridToWorld(unit.position.row, unit.position.col);
          unit.moving = true;
          unit.state = UnitState.Moving;
        }
      }
      unit.moveCooldown = unit.moveSpeed;
    }
  }

  // Check battle end
  const playerAlive = state.units.some(
    (u) =>
      u.owner === Owner.PlayerCtrl &&
      u.state !== UnitState.Dead &&
      board.containsUnit(u)
  );
  const enemyAlive = state.units.some(
    (u) =>
      u.owner === Owner.EnemyCtrl &&
      u.state !== UnitState.Dead &&
      board.containsUnit(u)
  );

  if (!playerAlive || !enemyAlive) {
    state.phase = GamePhase.Settlement;
    state.gameOver = false;
    state.victory = playerAlive && !enemyAlive;
    state.statusMessage = state.victory ? 'Victory!' : 'Defeat!';
  }
}

// ===== Floating Text & VFX Helpers =====
function addFloating(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string
): void {
  state.floatingTexts = [
    ...state.floatingTexts,
    {
      id: nextFloatingId++,
      x: x - 20,
      y: y - SPRITE_SIZE / 2 - 10,
      text,
      color,
      createdAt: performance.now(),
      duration: 600,
    },
  ];
}

function addVfx(state: GameState, vfx: VFXEffect): void {
  state.vfxEffects = [...state.vfxEffects, vfx];
}

// ===== Shop System =====
export function generateShopUnits(
  heroPool: HeroTemplate[]
): UnitInstance[] {
  const shuffled = [...heroPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SHOP_SLOTS).map((tpl) =>
    createUnitFromTemplate(tpl, Owner.PlayerCtrl)
  );
}

// ===== Enemy Wave Generation =====
export function generateEnemyWave(
  round: number,
  heroPool: HeroTemplate[]
): UnitInstance[] {
  const enemies: UnitInstance[] = [];
  const shuffled = [...heroPool].sort(() => Math.random() - 0.5);
  const count = Math.min(2 + round, 6);

  for (let i = 0; i < count; i++) {
    const tpl = shuffled[i % shuffled.length];
    const enemy = createUnitFromTemplate(tpl, Owner.EnemyCtrl);
    // Scale enemy stats by round
    const scale = 1 + (round - 1) * 0.3;
    enemy.maxHp = Math.floor(enemy.maxHp * scale);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * scale);
    enemy.baseMaxHp = enemy.baseMaxHp;
    enemy.baseAtk = enemy.baseAtk;
    enemies.push(enemy);
  }

  return enemies;
}

// ===== Combine System =====
export function tryCombineUnits(
  justAddedUnit: UnitInstance,
  state: GameState
): UnitInstance | null {
  // Find units with same name, same star level, on bench or board
  const same = state.units.filter(
    (u) =>
      u.id !== justAddedUnit.id &&
      u.name === justAddedUnit.name &&
      u.starLevel === justAddedUnit.starLevel &&
      u.state !== UnitState.Dead &&
      u.owner === Owner.PlayerCtrl
  );

  if (same.length < 2) return null;

  // Take 2 matching units
  const toRemove = same.slice(0, 2);
  const keepUnit = justAddedUnit;

  // Remove from board or bench
  for (const u of toRemove) {
    if (state.board.containsUnit(u)) {
      state.board.removeUnit(u);
    }
    for (let i = 0; i < state.bench.length; i++) {
      if (state.bench[i]?.id === u.id) {
        state.bench[i] = null;
      }
    }
    // Mark as dead (removed from game)
    u.state = UnitState.Dead;
  }

  // Upgrade keepUnit
  combineUnits(keepUnit, state);
  return keepUnit;
}

export function combineUnits(
  unit: UnitInstance,
  state: GameState
): void {
  unit.starLevel++;
  unit.maxEquipSlots++;

  // Apply star multiplier: 2-star = 1.5x, 3-star = 4.5x (relative to 1-star base)
  const multiplier = unit.starLevel === 2 ? 1.5 : 4.5;
  unit.maxHp = Math.floor(unit.baseMaxHp * multiplier);
  unit.atk = Math.floor(unit.baseAtk * multiplier);
  unit.armor = unit.baseArmor;
  unit.magicRes = unit.baseMagicRes;
  unit.hp = unit.maxHp;

  // Re-apply trait bonuses
  const counts = calculateTraitCounts(state.units, state.board);
  const base = {
    maxHp: unit.baseMaxHp,
    atk: unit.baseAtk,
    armor: unit.baseArmor,
    magicRes: unit.baseMagicRes,
  };
  const enhanced = calculateFinalStats(base, unit.traits, counts);
  // Apply star multiplier on top of trait bonuses
  unit.maxHp = Math.floor(enhanced.maxHp * (multiplier / 1));
  unit.atk = Math.floor(enhanced.atk * (multiplier / 1));
  unit.hp = unit.maxHp;
}

// ===== Equipment =====
export function tryEquipItemToUnit(
  item: Item,
  unit: UnitInstance
): boolean {
  if (unit.items.length >= unit.maxEquipSlots) return false;
  if (unit.owner !== Owner.PlayerCtrl) return false;
  unit.items = [...unit.items, item];
  applyItemEffect(item, unit);
  return true;
}

// ===== Initial State =====
export function getInitialState(
  heroPool: HeroTemplate[]
): GameState {
  resetIds();
  const board = new Board();
  const units: UnitInstance[] = [];
  const bench: (UnitInstance | null)[] = new Array(BENCH_SLOTS).fill(null);

  // Give player 3 starter units
  const starterTpls = heroPool.slice(0, 3);
  for (let i = 0; i < starterTpls.length; i++) {
    const unit = createUnitFromTemplate(starterTpls[i], Owner.PlayerCtrl);
    units.push(unit);
    bench[i] = unit;
  }

  // Generate shop
  const shopUnits = generateShopUnits(heroPool).map((u) => {
    units.push(u);
    return u;
  });

  // Initial equipment inventory: 2 random items
  const allTypes = [ItemType.IronSword, ItemType.ChainMail, ItemType.Bow, ItemType.BlueCrystal];
  const equipmentInventory = [ITEMS[allTypes[0]], ITEMS[allTypes[1]]];

  const state: GameState = {
    phase: GamePhase.Preparation,
    round: 1,
    playerHP: 100,
    gold: 50,
    populationCap: 3,
    populationLevel: 1,
    gameOver: false,
    victory: false,
    board,
    units,
    bench,
    shopUnits,
    equipmentInventory,
    traitCounts: new Map(),
    dragging: null,
    dragMousePos: null,
    selectedUnitId: null,
    floatingTexts: [],
    vfxEffects: [],
    statusMessage: '拖拽单位到棋盘上布阵，按空格开始战斗',
    combatTickAcc: 0,
    settlementResolved: false,
  };

  state.traitCounts = calculateTraitCounts(state.units, state.board);

  return state;
}

// ===== Placeholder positions for bench/equipment =====
export function benchSlotToPos(slot: number): { x: number; y: number } {
  return { x: 50, y: 80 + slot * 70 };
}

// ===== Population =====
export function getUpgradeCost(level: number): number {
  return 10 + level * 5;
}

// ===== Unit price =====
export function getUnitSellPrice(unit: UnitInstance): number {
  return unit.starLevel === 1 ? unit.price : unit.starLevel === 2 ? unit.price * 2 : unit.price * 6;
}

// ===== Cleanup expired effects =====
export function cleanupEffects(state: GameState, now: number): void {
  state.floatingTexts = state.floatingTexts.filter(
    (ft) => now - ft.createdAt < ft.duration
  );
  state.vfxEffects = state.vfxEffects.filter(
    (vfx) => now - vfx.createdAt < vfx.duration
  );
}

// ===== gameReducer =====
export function gameReducer(
  state: GameState,
  action: GameAction,
  heroPool: HeroTemplate[]
): GameState {
  const next = { ...state };

  switch (action.type) {
    case 'DRAG_START': {
      const unit = state.units.find((u) => u.id === action.unitId);
      if (
        !unit ||
        unit.owner !== Owner.PlayerCtrl ||
        state.phase !== GamePhase.Preparation
      )
        return state;
      next.dragging = {
        unitId: action.unitId,
        sourceGrid: action.sourceGrid,
        sourceBenchSlot: action.sourceBenchSlot,
      };
      next.dragMousePos = action.mousePos;
      next.selectedUnitId = action.unitId;
      return next;
    }

    case 'DRAG_MOVE': {
      if (!state.dragging) return state;
      next.dragMousePos = action.mousePos;
      return next;
    }

    case 'DRAG_DROP': {
      if (!state.dragging || !state.dragMousePos) return state;
      const drag = state.dragging;
      const mousePos = state.dragMousePos;
      next.dragging = null;
      next.dragMousePos = null;

      const unit = state.units.find((u) => u.id === drag.unitId);
      if (!unit) return state;

      const gridTarget = action.gridTarget !== undefined ? action.gridTarget : worldToGrid(mousePos.x, mousePos.y);
      const benchTarget = action.benchTarget !== undefined ? action.benchTarget : mouseToBenchSlot(mousePos.x, mousePos.y);

      // Try to place on bench
      if (benchTarget >= 0 && benchTarget < BENCH_SLOTS) {
        const existing = state.bench[benchTarget];
        if (!existing || existing.id === unit.id) {
          // Remove from source
          if (drag.sourceGrid) {
            state.board.removeUnit(unit);
          } else if (drag.sourceBenchSlot !== null) {
            next.bench = [...next.bench];
            next.bench[drag.sourceBenchSlot] = null;
          }
          next.bench = [...next.bench];
          next.bench[benchTarget] = unit;
          unit.state = UnitState.Idle;
          unit.moving = false;
          next.traitCounts = calculateTraitCounts(next.units, next.board);
          return next;
        }
        // Swap
        if (drag.sourceBenchSlot !== null) {
          next.bench = [...next.bench];
          next.bench[drag.sourceBenchSlot] = existing;
          next.bench[benchTarget] = unit;
          unit.state = UnitState.Idle;
          return next;
        }
      }

      // Try to place on board
      if (gridTarget && state.board.isPlayerHalf(gridTarget)) {
        if (!state.board.hasUnitAt(gridTarget)) {
          // Check population
          const onBoard = next.units.filter(
            (u) =>
              u.owner === Owner.PlayerCtrl &&
              u.state !== UnitState.Dead &&
              next.board.containsUnit(u)
          ).length;
          const fromBoard = drag.sourceGrid ? 1 : 0;
          if (onBoard - fromBoard + 1 > state.populationCap) {
            next.statusMessage = '人口已满！升级人口或移除单位';
            // Return to source
            return next;
          }
          // Remove from source
          if (drag.sourceGrid) {
            state.board.removeUnit(unit);
          } else if (drag.sourceBenchSlot !== null) {
            next.bench = [...next.bench];
            next.bench[drag.sourceBenchSlot] = null;
          }
          state.board.addUnit(unit, gridTarget);
          unit.state = UnitState.Idle;
          unit.moving = false;
          unit.smoothPos = gridToWorld(gridTarget.row, gridTarget.col);
          next.traitCounts = calculateTraitCounts(next.units, next.board);
          next.statusMessage = '';
          return next;
        }
        // Swap with existing unit
        const existing = state.board.getUnitAt(gridTarget);
        if (existing && existing.owner === Owner.PlayerCtrl) {
          state.board.removeUnit(unit);
          state.board.removeUnit(existing);
          if (drag.sourceGrid) {
            state.board.addUnit(existing, drag.sourceGrid);
          } else {
            next.bench = [...next.bench];
            next.bench[drag.sourceBenchSlot!] = existing;
          }
          state.board.addUnit(unit, gridTarget);
          unit.state = UnitState.Idle;
          unit.smoothPos = gridToWorld(gridTarget.row, gridTarget.col);
          next.traitCounts = calculateTraitCounts(next.units, next.board);
          return next;
        }
      }

      // Invalid drop, snap back
      return next;
    }

    case 'DRAG_CANCEL': {
      next.dragging = null;
      next.dragMousePos = null;
      return next;
    }

    case 'START_BATTLE': {
      if (state.phase !== GamePhase.Preparation) return state;
      // Must have at least 1 unit on board
      const onBoard = state.units.filter(
        (u) =>
          u.owner === Owner.PlayerCtrl &&
          u.state !== UnitState.Dead &&
          state.board.containsUnit(u)
      );
      if (onBoard.length === 0) {
        next.statusMessage = '请先在棋盘上放置单位';
        return next;
      }

      next.phase = GamePhase.Battle;
      next.statusMessage = '战斗进行中...';
      // Spawn enemies
      const enemies = generateEnemyWave(state.round, heroPool);
      next.units = [...state.units, ...enemies];

      // Place enemies on enemy half (rows 0-3)
      const enemyPositions: Position[] = [];
      for (let row = 0; row < BOARD_ROWS / 2; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          enemyPositions.push({ col, row });
        }
      }
      for (const enemy of enemies) {
        // Find empty position
        const emptyPos = enemyPositions.find(
          (p) => !next.board.hasUnitAt(p)
        );
        if (emptyPos) {
          next.board.addUnit(enemy, emptyPos);
          enemy.smoothPos = gridToWorld(emptyPos.row, emptyPos.col);
        }
      }

      next.combatTickAcc = 0;
      next.settlementResolved = false;
      return next;
    }

    case 'BATTLE_TICK': {
      if (state.phase !== GamePhase.Battle) return state;
      // Shallow copy arrays so React detects change; tickBattle mutates in place
      next.units = [...state.units];
      next.floatingTexts = [...state.floatingTexts];
      next.vfxEffects = [...state.vfxEffects];
      next.equipmentInventory = [...state.equipmentInventory];
      next.combatTickAcc = state.combatTickAcc + action.dt;
      if (next.combatTickAcc >= 16) {
        tickBattle(next as GameState);
      }
      cleanupEffects(next as GameState, performance.now());
      return next;
    }

    case 'END_BATTLE': {
      next.phase = GamePhase.Settlement;
      if (next.victory) {
        next.gold += 10 + state.round * 2;
        next.statusMessage = `第 ${state.round} 轮胜利！+${10 + state.round * 2} 金币`;
        if (state.round >= 3) {
          next.gameOver = true;
          next.victory = true;
          next.statusMessage = '恭喜！你赢得了所有战斗！';
        }
      } else {
        const hpLoss = 10 + state.round * 2;
        next.playerHP = Math.max(0, state.playerHP - hpLoss);
        next.statusMessage = `战斗失败！失去 ${hpLoss} 生命值`;
        if (next.playerHP <= 0) {
          next.gameOver = true;
          next.victory = false;
          next.statusMessage = '生命值耗尽，游戏结束...';
        }
      }
      next.settlementResolved = true;
      return next;
    }

    case 'NEXT_ROUND': {
      if (state.phase !== GamePhase.Settlement) return state;
      if (state.gameOver) {
        return getInitialState(heroPool);
      }

      // Auto-resolve settlement if END_BATTLE was skipped
      if (!state.settlementResolved) {
        if (state.victory) {
          next.gold += 10 + state.round * 2;
          if (state.round >= 3) {
            next.gameOver = true;
            next.victory = true;
            next.settlementResolved = true;
            next.statusMessage = '恭喜！你赢得了所有战斗！';
            return next;
          }
        } else {
          const hpLoss = 10 + state.round * 2;
          next.playerHP = Math.max(0, state.playerHP - hpLoss);
          if (next.playerHP <= 0) {
            next.gameOver = true;
            next.victory = false;
            next.settlementResolved = true;
            next.statusMessage = '生命值耗尽，游戏结束...';
            return next;
          }
        }
        next.settlementResolved = true;
      }

      next.phase = GamePhase.Preparation;
      next.round = state.round + 1;
      next.statusMessage = '拖拽单位到棋盘上布阵，按空格开始战斗';

      // Remove dead enemy units, revive player units
      next.units = state.units.filter((u) => u.owner === Owner.PlayerCtrl || u.state !== UnitState.Dead);
      next.board.clear();
      next.bench = new Array(BENCH_SLOTS).fill(null);

      // Revive and bench all player units
      let benchIdx = 0;
      for (const u of next.units) {
        if (u.owner === Owner.PlayerCtrl) {
          u.hp = u.maxHp;
          u.state = UnitState.Idle;
          u.mana = u.startingMana;
          u.target = null;
          u.moving = false;
          u.stunRemaining = 0;
          u.position = { col: 0, row: 0 };
          // Place on bench
          if (benchIdx < BENCH_SLOTS) {
            next.bench[benchIdx] = u;
            benchIdx++;
          }
        }
      }

      // Refresh shop
      const newShop = generateShopUnits(heroPool);
      next.units = [...next.units, ...newShop];
      next.shopUnits = newShop;
      next.gold += 5;
      next.floatingTexts = [];
      next.vfxEffects = [];
      next.traitCounts = calculateTraitCounts(next.units, next.board);

      return next;
    }

    case 'BUY_UNIT': {
      const shopUnit = state.shopUnits[action.shopIndex];
      if (!shopUnit || shopUnit.state === UnitState.Dead) return state;
      if (state.gold < shopUnit.price) {
        next.statusMessage = '金币不足！';
        return next;
      }
      // Find empty bench slot
      const emptySlot = next.bench.findIndex((b) => b === null);
      if (emptySlot === -1) {
        next.statusMessage = '备战席已满！';
        return next;
      }
      next.gold = state.gold - shopUnit.price;
      next.bench = [...next.bench];
      next.bench[emptySlot] = shopUnit;
      next.shopUnits = [...next.shopUnits];
      next.shopUnits[action.shopIndex] = null;
      shopUnit.state = UnitState.Idle;
      next.statusMessage = '';
      next.traitCounts = calculateTraitCounts(next.units, next.board);

      // Check combine
      const combined = tryCombineUnits(shopUnit, next as GameState);
      if (combined) {
        next.statusMessage = `${combined.name} 升级为 ${'★'.repeat(combined.starLevel)}!`;
      }
      return next;
    }

    case 'SELL_UNIT': {
      const unit = state.units.find((u) => u.id === action.unitId);
      if (!unit || unit.owner !== Owner.PlayerCtrl) return state;
      const price = getUnitSellPrice(unit);
      next.gold = state.gold + price;
      next.statusMessage = `出售 ${unit.name}，获得 ${price} 金币`;

      // Remove from board
      if (state.board.containsUnit(unit)) {
        next.board.removeUnit(unit);
      }
      // Remove from bench
      next.bench = [...next.bench];
      for (let i = 0; i < next.bench.length; i++) {
        if (next.bench[i]?.id === unit.id) {
          next.bench[i] = null;
        }
      }
      // Return equipment to inventory
      for (const item of unit.items) {
        removeItemEffect(item, unit);
        next.equipmentInventory = [...next.equipmentInventory, item];
      }
      unit.state = UnitState.Dead;
      next.units = state.units.map((u) =>
        u.id === unit.id ? { ...unit, items: [] } : u
      );
      next.traitCounts = calculateTraitCounts(next.units, next.board);
      next.selectedUnitId = null;
      return next;
    }

    case 'REFRESH_SHOP': {
      if (state.phase !== GamePhase.Preparation) return state;
      if (state.gold < 2) {
        next.statusMessage = '金币不足！需要 2 金币刷新';
        return next;
      }
      next.gold = state.gold - 2;
      const newShop = generateShopUnits(heroPool);
      next.units = [...state.units, ...newShop];
      next.shopUnits = newShop;
      next.statusMessage = '';
      return next;
    }

    case 'UPGRADE_POPULATION': {
      if (state.phase !== GamePhase.Preparation) return state;
      const cost = getUpgradeCost(state.populationLevel);
      if (state.gold < cost) {
        next.statusMessage = '金币不足！';
        return next;
      }
      next.gold = state.gold - cost;
      next.populationLevel = state.populationLevel + 1;
      next.populationCap = state.populationCap + 1;
      next.statusMessage = `人口升级！上限：${next.populationCap}`;
      return next;
    }

    case 'EQUIP_ITEM': {
      const unit = state.units.find((u) => u.id === action.targetUnitId);
      if (!unit || unit.owner !== Owner.PlayerCtrl) return state;
      const itemIdx = state.equipmentInventory.findIndex(
        (i) => i.type === action.itemType
      );
      if (itemIdx === -1) return state;
      const item = state.equipmentInventory[itemIdx];
      if (!tryEquipItemToUnit(item, unit)) {
        next.statusMessage = '装备栏已满！';
        return next;
      }
      next.equipmentInventory = state.equipmentInventory.filter(
        (_, i) => i !== itemIdx
      );
      next.statusMessage = `装备 ${item.name} 已给予 ${unit.name}`;
      return next;
    }

    case 'SELECT_UNIT': {
      next.selectedUnitId = action.unitId;
      return next;
    }

    case 'NEW_GAME': {
      return getInitialState(heroPool);
    }

    default:
      return state;
  }
}

// ===== Mouse to bench slot conversion =====
export function mouseToBenchSlot(
  mouseX: number,
  mouseY: number
): number {
  // Bench slots are rendered at x: 32-96, each 64px tall, spaced 70px apart, starting y = 80
  const benchLeft = 32;
  const benchRight = 96;
  const benchTop = 60;
  const slotHeight = 70;

  if (mouseX < benchLeft || mouseX > benchRight) return -1;
  const slot = Math.floor((mouseY - benchTop) / slotHeight);
  if (slot < 0 || slot >= BENCH_SLOTS) return -1;
  return slot;
}

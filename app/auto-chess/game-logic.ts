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
  type ContractModifiers,
  type ContractTag,
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

const MAX_ROUNDS = 12;
const BASE_REFRESH_COST = 1;
const COMBAT_TICK_MS = 16;

const DEFAULT_CONTRACT_MODIFIERS: ContractModifiers = {
  enemyHpMultiplier: 1,
  enemyAtkMultiplier: 1,
  enemyArmorBonus: 0,
  enemyMagicResBonus: 0,
  enemyAttackSpeedMultiplier: 1,
  enemyStartingManaBonus: 0,
  enemyCountBonus: 0,
  playerHpMultiplier: 1,
  playerAtkMultiplier: 1,
  playerArmorPenalty: 0,
  playerManaCostMultiplier: 1,
  deploymentLimitPenalty: 0,
  interestDisabled: false,
  itemDropMultiplier: 1,
  refreshCostBonus: 0,
  interestCapReduction: 0,
  buyCostBonus: 0,
  sellPriceMultiplier: 1,
};

export const CONTRACT_TAGS: ContractTag[] = [
  {
    id: 'enemy_hp_i',
    name: '源石装甲 I',
    description: '敌方生命 +18%',
    risk: 1,
    category: 'enemy',
    exclusiveGroup: 'enemy_hp',
    modifiers: { enemyHpMultiplier: 1.18 },
  },
  {
    id: 'enemy_hp_ii',
    name: '源石装甲 II',
    description: '敌方生命 +35%',
    risk: 2,
    category: 'enemy',
    exclusiveGroup: 'enemy_hp',
    modifiers: { enemyHpMultiplier: 1.35 },
  },
  {
    id: 'enemy_blade_i',
    name: '火力增幅 I',
    description: '敌方攻击 +16%',
    risk: 1,
    category: 'enemy',
    exclusiveGroup: 'enemy_atk',
    modifiers: { enemyAtkMultiplier: 1.16 },
  },
  {
    id: 'enemy_blade_ii',
    name: '火力增幅 II',
    description: '敌方攻击 +32%',
    risk: 2,
    category: 'enemy',
    exclusiveGroup: 'enemy_atk',
    modifiers: { enemyAtkMultiplier: 1.32 },
  },
  {
    id: 'enemy_haste',
    name: '急行军',
    description: '敌方攻速 +18%',
    risk: 2,
    category: 'enemy',
    modifiers: { enemyAttackSpeedMultiplier: 1.18 },
  },
  {
    id: 'enemy_mana',
    name: '预充能',
    description: '敌方初始法力 +25',
    risk: 1,
    category: 'enemy',
    modifiers: { enemyStartingManaBonus: 25 },
  },
  {
    id: 'enemy_reinforce',
    name: '增援协议',
    description: '每波额外 1 名敌人',
    risk: 2,
    category: 'enemy',
    modifiers: { enemyCountBonus: 1 },
  },
  {
    id: 'player_fragile',
    name: '易损阵线',
    description: '己方生命 -15%',
    risk: 1,
    category: 'player',
    modifiers: { playerHpMultiplier: 0.85 },
  },
  {
    id: 'player_low_atk',
    name: '火力管制',
    description: '己方攻击 -12%',
    risk: 1,
    category: 'player',
    modifiers: { playerAtkMultiplier: 0.88 },
  },
  {
    id: 'player_slow_skill',
    name: '技力阻滞',
    description: '己方技能需求 +20%',
    risk: 2,
    category: 'player',
    modifiers: { playerManaCostMultiplier: 1.2 },
  },
  {
    id: 'deploy_limit',
    name: '部署限制',
    description: '可上阵人口 -1',
    risk: 2,
    category: 'rule',
    modifiers: { deploymentLimitPenalty: 1 },
  },
  {
    id: 'no_interest',
    name: '补给切断',
    description: '本轮结算不产生利息',
    risk: 2,
    category: 'economy',
    modifiers: { interestDisabled: true },
  },
  {
    id: 'low_drop',
    name: '物资匮乏',
    description: '敌人装备掉率 -35%',
    risk: 1,
    category: 'economy',
    modifiers: { itemDropMultiplier: 0.65 },
  },
  {
    id: 'expensive_refresh',
    name: '情报管制',
    description: '刷新商店额外消耗 1 金币',
    risk: 1,
    category: 'economy',
    modifiers: { refreshCostBonus: 1 },
  },
  {
    id: 'interest_cap',
    name: '资本管制',
    description: '利息上限从 5 降至 3',
    risk: 2,
    category: 'economy',
    modifiers: { interestCapReduction: 2 },
  },
  {
    id: 'buy_premium',
    name: '征募溢价',
    description: '购买单位额外消耗 1 金币',
    risk: 2,
    category: 'economy',
    modifiers: { buyCostBonus: 1 },
  },
  {
    id: 'sell_penalty',
    name: '资产折旧',
    description: '出售单位收入减半',
    risk: 1,
    category: 'economy',
    modifiers: { sellPriceMultiplier: 0.5 },
  },
];

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
    if (!this.isValidPosition(pos)) return;

    // A unit instance must never occupy more than one cell. This defensive
    // cleanup prevents duplicated board pieces if a stale bench reference is
    // dragged again or if a move is replayed by React events.
    this.removeUnit(unit);

    const idx = this.indexOf(pos);
    const occupying = this.cells[idx];
    if (occupying && occupying.id !== unit.id) return;

    this.cells[idx] = unit;
    this.unitToPos.set(unit.id, { ...pos });
    unit.position = { ...pos };
  }

  removeUnit(unit: UnitInstance): void {
    // Scan all cells rather than trusting unitToPos, because older builds could
    // leave duplicate cell references behind.
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i]?.id === unit.id) {
        this.cells[i] = null;
      }
    }
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
function resolveTemplateSkillType(tpl: HeroTemplate): string {
  // Backward compatible enrichment: old heroes.json can keep Stun/LineAOE/HealAura,
  // while traits nudge some units into the new skill kits.
  const traits = new Set(tpl.traits);
  if (!['Stun', 'LineAOE', 'HealAura'].includes(tpl.skillType)) return tpl.skillType;
  if (tpl.skillType === 'LineAOE' && traits.has('法师')) return tpl.price >= 3 ? 'ChainLightning' : 'Fireball';
  if (tpl.skillType === 'LineAOE' && traits.has('神谕')) return 'ManaBurn';
  if (tpl.skillType === 'HealAura' && (traits.has('神盾') || traits.has('神盾使') || traits.has('先锋'))) return 'ShieldWall';
  if (tpl.skillType === 'HealAura' && (traits.has('秘术') || traits.has('斗士'))) return 'PoisonNova';
  if (tpl.skillType === 'Stun' && traits.has('刺客')) return 'DashStrike';
  if (tpl.skillType === 'Stun' && (traits.has('狙神') || traits.has('枪手'))) return 'Execute';
  return tpl.skillType;
}

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
    baseMaxMana: tpl.maxMana,
    baseRange: tpl.range,
    baseAttackSpeed: 60,
    baseMoveSpeed: 40,
    target: null,
    attackSpeed: 60,
    attackCooldown: 0,
    moveSpeed: 40,
    moveCooldown: 0,
    skill: createSkillFromType(resolveTemplateSkillType(tpl)),
    startingMana: tpl.startingMana,
    stunRemaining: 0,
    moving: false,
    smoothPos: gridToWorld(pos.row, pos.col),
    moveTarget: { ...pos },
    items: [],
    maxEquipSlots: 1,
    shield: 0,
    isShopUnit: false,
    removedFromGame: false,
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
    case 'Fireball':
      return FIREBALL_SKILL;
    case 'ChainLightning':
      return CHAIN_LIGHTNING_SKILL;
    case 'ShieldWall':
      return SHIELD_WALL_SKILL;
    case 'Execute':
      return EXECUTE_SKILL;
    case 'ManaBurn':
      return MANA_BURN_SKILL;
    case 'PoisonNova':
      return POISON_NOVA_SKILL;
    case 'DashStrike':
      return DASH_STRIKE_SKILL;
    default:
      return null;
  }
}

function boardDistance(a: Position, b: Position): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function getTraitCountsForOwner(board: BoardInterface, owner: Owner): Map<string, number> {
  const counts = new Map<string, number>();
  for (const u of board.getAllUnits()) {
    if (u.owner === owner && u.hp > 0 && !u.removedFromGame && !u.isShopUnit) {
      for (const trait of u.traits) {
        counts.set(trait, (counts.get(trait) ?? 0) + 1);
      }
    }
  }
  return counts;
}

function getMechanicBonusesForUnit(
  unit: UnitInstance,
  state: GameState
): ReturnType<typeof getMechanicBonuses> {
  const counts =
    unit.owner === Owner.PlayerCtrl
      ? state.traitCounts
      : getTraitCountsForOwner(state.board, unit.owner);
  return getMechanicBonuses(unit.traits, counts);
}

function getSkillMultiplier(caster: UnitInstance, state: GameState): number {
  return getMechanicBonusesForUnit(caster, state).skillDamageMultiplier;
}

function getDoubleChance(unit: UnitInstance, state: GameState): number {
  return getMechanicBonusesForUnit(unit, state).doubleAttackChance;
}

function getEnemiesInRadius(
  caster: UnitInstance,
  board: BoardInterface,
  center: Position,
  radius: number
): UnitInstance[] {
  return board
    .getAllUnits()
    .filter(
      (u) =>
        u.owner !== caster.owner &&
        u.hp > 0 &&
        u.state !== UnitState.Dead &&
        boardDistance(u.position, center) <= radius
    );
}

function getAlliesInRadius(
  caster: UnitInstance,
  board: BoardInterface,
  center: Position,
  radius: number
): UnitInstance[] {
  return board
    .getAllUnits()
    .filter(
      (u) =>
        u.owner === caster.owner &&
        u.hp > 0 &&
        u.state !== UnitState.Dead &&
        boardDistance(u.position, center) <= radius
    );
}

function applySkillDamage(
  target: UnitInstance,
  damage: number,
  isMagic: boolean,
  state: GameState,
  color = '#ff6464',
  suffix = ''
): void {
  const actual = takeDamage(target, damage, isMagic);
  addFloating(state, target.smoothPos.x, target.smoothPos.y, `-${actual}${suffix}`, color);
  if (target.state === UnitState.Dead) {
    handleUnitDeath(target, state);
  }
}

const STUN_SKILL: Skill = {
  type: 'Stun',
  manaCost: 60,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, _board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const dmg = Math.floor((32 + caster.atk * 0.25) * mult);
    applySkillDamage(target, dmg, false, state, '#ff6464');
    if (target.state !== UnitState.Dead) {
      target.stunRemaining = 75;
      target.state = UnitState.Stunned;
    }
  },
};

const LINE_AOE_SKILL: Skill = {
  type: 'LineAOE',
  manaCost: 60,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const baseDamage = 55 + Math.floor(0.55 * caster.atk);
    const totalDamage = Math.floor(baseDamage * mult);
    const startRow = caster.position.row;
    const startCol = caster.position.col;
    const endRow = target.position.row;
    const endCol = target.position.col;

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
        applySkillDamage(u, totalDamage, true, state, '#ff9800');
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
    const mult = getSkillMultiplier(caster, state);
    const healAmt = Math.floor((70 + caster.atk * 0.25) * mult);
    const center = caster.position;
    for (const ally of getAlliesInRadius(caster, board, center, 2)) {
      ally.hp = Math.min(ally.hp + healAmt, ally.maxHp);
      addFloating(state, ally.smoothPos.x, ally.smoothPos.y, `+${healAmt}`, '#64ff64');
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

const FIREBALL_SKILL: Skill = {
  type: 'Fireball',
  manaCost: 70,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const damage = Math.floor((48 + caster.atk * 0.55) * mult);
    const center = target.position;
    const enemies = getEnemiesInRadius(caster, board, center, 1);
    for (const enemy of enemies) {
      applySkillDamage(enemy, enemy.id === target.id ? damage : Math.floor(damage * 0.65), true, state, '#ff7a2f');
    }
    addVfx(state, {
      id: nextVfxId++,
      type: 'explosion',
      centerPos: gridToWorld(center.row, center.col),
      radius: HEX_COL_SPACING * 1.15,
      createdAt: performance.now(),
      duration: 360,
    });
  },
};

const CHAIN_LIGHTNING_SKILL: Skill = {
  type: 'ChainLightning',
  manaCost: 65,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const enemies = board
      .getAllUnits()
      .filter((u) => u.owner !== caster.owner && u.hp > 0 && u.state !== UnitState.Dead);
    const hit: UnitInstance[] = [];
    let current: UnitInstance | undefined = target;
    while (current && hit.length < 4) {
      hit.push(current);
      const currentPos = current.position;
      const remaining = enemies.filter((u) => !hit.some((h) => h.id === u.id) && u.hp > 0 && u.state !== UnitState.Dead);
      remaining.sort((a, b) => boardDistance(a.position, currentPos) - boardDistance(b.position, currentPos));
      current = remaining[0];
    }

    let previous = caster;
    for (let i = 0; i < hit.length; i++) {
      const enemy = hit[i];
      const damage = Math.floor((50 + caster.atk * 0.35) * mult * (1 - i * 0.18));
      applySkillDamage(enemy, damage, true, state, '#a78bfa');
      addVfx(state, {
        id: nextVfxId++,
        type: 'chain',
        startPos: gridToWorld(previous.position.row, previous.position.col),
        endPos: gridToWorld(enemy.position.row, enemy.position.col),
        createdAt: performance.now(),
        duration: 240 + i * 40,
      });
      previous = enemy;
    }
  },
};

const SHIELD_WALL_SKILL: Skill = {
  type: 'ShieldWall',
  manaCost: 65,
  canCast() {
    return true;
  },
  cast(caster, _target, board, state) {
    const shield = Math.floor(90 + caster.maxHp * 0.08);
    for (const ally of getAlliesInRadius(caster, board, caster.position, 1)) {
      ally.shield += shield;
      addFloating(state, ally.smoothPos.x, ally.smoothPos.y, `+${shield}盾`, '#7dd3fc');
    }
    addVfx(state, {
      id: nextVfxId++,
      type: 'shield',
      centerPos: gridToWorld(caster.position.row, caster.position.col),
      radius: HEX_COL_SPACING * 1.2,
      createdAt: performance.now(),
      duration: 420,
    });
  },
};

const EXECUTE_SKILL: Skill = {
  type: 'Execute',
  manaCost: 55,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, _board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const lowHp = target.hp / target.maxHp <= 0.35;
    const damage = Math.floor((lowHp ? 95 + caster.atk * 1.15 : 45 + caster.atk * 0.65) * mult);
    applySkillDamage(target, damage, false, state, lowHp ? '#f43f5e' : '#fb7185', lowHp ? ' 斩杀' : '');
    addVfx(state, {
      id: nextVfxId++,
      type: 'slash',
      startPos: gridToWorld(caster.position.row, caster.position.col),
      endPos: gridToWorld(target.position.row, target.position.col),
      createdAt: performance.now(),
      duration: 260,
    });
  },
};

const MANA_BURN_SKILL: Skill = {
  type: 'ManaBurn',
  manaCost: 60,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, _board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const damage = Math.floor((40 + caster.atk * 0.45 + target.mana * 0.4) * mult);
    target.mana = Math.max(0, target.mana - 35);
    applySkillDamage(target, damage, true, state, '#38bdf8', ' 破蓝');
  },
};

const POISON_NOVA_SKILL: Skill = {
  type: 'PoisonNova',
  manaCost: 75,
  canCast() {
    return true;
  },
  cast(caster, _target, board, state) {
    const mult = getSkillMultiplier(caster, state);
    const enemies = getEnemiesInRadius(caster, board, caster.position, 2);
    for (const enemy of enemies) {
      const damage = Math.floor((42 + caster.atk * 0.38) * mult);
      enemy.atk = Math.max(1, Math.floor(enemy.atk * 0.92));
      applySkillDamage(enemy, damage, true, state, '#84cc16', ' 毒');
    }
    addVfx(state, {
      id: nextVfxId++,
      type: 'poison',
      centerPos: gridToWorld(caster.position.row, caster.position.col),
      radius: HEX_COL_SPACING * 2,
      createdAt: performance.now(),
      duration: 430,
    });
  },
};

const DASH_STRIKE_SKILL: Skill = {
  type: 'DashStrike',
  manaCost: 50,
  canCast(_caster, target) {
    return target !== null && target.hp > 0;
  },
  cast(caster, target, _board, state) {
    if (!target) return;
    const mult = getSkillMultiplier(caster, state);
    const damage = Math.floor((55 + caster.atk * 0.75) * mult);
    applySkillDamage(target, damage, false, state, '#facc15');
    if (target.state !== UnitState.Dead) {
      target.stunRemaining = Math.max(target.stunRemaining, 28);
      target.state = UnitState.Stunned;
    }
    addVfx(state, {
      id: nextVfxId++,
      type: 'slash',
      startPos: gridToWorld(caster.position.row, caster.position.col),
      endPos: gridToWorld(target.position.row, target.position.col),
      createdAt: performance.now(),
      duration: 220,
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
  let actual = isMagic ? mrReduce(dmg, unit.magicRes) : armorReduce(dmg, unit.armor);
  if (unit.shield > 0) {
    const absorbed = Math.min(unit.shield, actual);
    unit.shield -= absorbed;
    actual -= absorbed;
  }
  unit.hp = Math.max(0, unit.hp - actual);
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.state = UnitState.Dead;
    unit.target = null;
    unit.shield = 0;
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
  [ItemType.GiantBelt]: {
    type: ItemType.GiantBelt,
    name: '巨人腰带',
    description: '+260 生命值',
  },
  [ItemType.MysticOrb]: {
    type: ItemType.MysticOrb,
    name: '秘法宝珠',
    description: '+10 魔抗，技能需求 -10',
  },
  [ItemType.BloodCharm]: {
    type: ItemType.BloodCharm,
    name: '嗜血护符',
    description: '+8 攻击，攻击回复少量生命',
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
      unit.attackSpeed = Math.max(10, unit.attackSpeed * 0.8);
      break;
    case ItemType.BlueCrystal:
      unit.maxMana = Math.max(10, unit.maxMana - 30);
      unit.mana = Math.min(unit.mana, unit.maxMana);
      break;
    case ItemType.GiantBelt:
      unit.maxHp += 260;
      unit.hp += 260;
      break;
    case ItemType.MysticOrb:
      unit.magicRes += 10;
      unit.maxMana = Math.max(10, unit.maxMana - 10);
      unit.mana = Math.min(unit.mana, unit.maxMana);
      break;
    case ItemType.BloodCharm:
      unit.atk += 8;
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
      unit.attackSpeed = unit.attackSpeed / 0.8;
      break;
    case ItemType.BlueCrystal:
      unit.maxMana += 30;
      break;
    case ItemType.GiantBelt:
      unit.maxHp -= 260;
      unit.hp = Math.min(unit.hp, unit.maxHp);
      break;
    case ItemType.MysticOrb:
      unit.magicRes -= 10;
      unit.maxMana += 10;
      break;
    case ItemType.BloodCharm:
      unit.atk -= 8;
      break;
  }
}

function getStarMultiplier(starLevel: number): number {
  if (starLevel <= 1) return 1;
  if (starLevel === 2) return 1.65;
  return 3.2;
}

export function rebuildUnitStats(
  unit: UnitInstance,
  counts: Map<string, number>,
  keepHpRatio = true
): void {
  const hpRatio = keepHpRatio && unit.maxHp > 0 ? Math.max(0, unit.hp / unit.maxHp) : 1;
  const enhanced = calculateFinalStats(
    {
      maxHp: unit.baseMaxHp,
      atk: unit.baseAtk,
      armor: unit.baseArmor,
      magicRes: unit.baseMagicRes,
    },
    unit.traits,
    counts
  );
  const starMultiplier = getStarMultiplier(unit.starLevel);
  unit.maxHp = Math.max(1, Math.round(enhanced.maxHp * starMultiplier));
  unit.atk = Math.max(1, Math.round(enhanced.atk * starMultiplier));
  unit.armor = enhanced.armor + (unit.starLevel >= 3 ? 10 : 0);
  unit.magicRes = enhanced.magicRes + (unit.starLevel >= 3 ? 10 : 0);
  unit.maxMana = unit.baseMaxMana;
  unit.range = unit.baseRange;
  unit.attackSpeed = unit.baseAttackSpeed;
  unit.moveSpeed = unit.baseMoveSpeed;
  unit.shield = 0;
  for (const item of unit.items) {
    applyItemEffect(item, unit);
  }
  unit.hp = keepHpRatio ? Math.max(1, Math.min(unit.maxHp, Math.round(unit.maxHp * hpRatio))) : unit.maxHp;
  unit.mana = Math.min(unit.mana, unit.maxMana);
}

function recalcAllPlayerStats(state: GameState, keepHpRatio = true): void {
  state.traitCounts = calculateTraitCounts(state.units, state.board);
  for (const unit of state.units) {
    if (unit.owner === Owner.PlayerCtrl && !unit.removedFromGame && !unit.isShopUnit && state.board.containsUnit(unit)) {
      rebuildUnitStats(unit, state.traitCounts, keepHpRatio);
    }
  }
}

// ===== Trait System =====
export function calculateTraitCounts(
  units: UnitInstance[],
  board: BoardInterface
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const u of board.getAllUnits()) {
    if (u.owner === Owner.PlayerCtrl && u.hp > 0 && !u.isShopUnit && !u.removedFromGame) {
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
): {
  skillDamageMultiplier: number;
  doubleAttackChance: number;
  manaGainMultiplier: number;
  lifeSteal: number;
  critChance: number;
  shieldOnStart: number;
} {
  const result = {
    skillDamageMultiplier: 1.0,
    doubleAttackChance: 0.0,
    manaGainMultiplier: 1.0,
    lifeSteal: 0.0,
    critChance: 0.0,
    shieldOnStart: 0,
  };

  for (const trait of traits) {
    const mechanics = TRAIT_MECHANICS[trait];
    if (!mechanics) continue;
    const currentCount = counts.get(trait) ?? 0;
    for (const m of mechanics) {
      if (currentCount >= m.requiredCount) {
        switch (m.mechanic) {
          case TraitMechanic.SkillDamageMultiplier:
            result.skillDamageMultiplier = Math.max(result.skillDamageMultiplier, m.value);
            break;
          case TraitMechanic.DoubleAttackChance:
            result.doubleAttackChance = Math.max(result.doubleAttackChance, m.value);
            break;
          case TraitMechanic.ManaGainMultiplier:
            result.manaGainMultiplier = Math.max(result.manaGainMultiplier, m.value);
            break;
          case TraitMechanic.LifeSteal:
            result.lifeSteal = Math.max(result.lifeSteal, m.value);
            break;
          case TraitMechanic.CritChance:
            result.critChance = Math.max(result.critChance, m.value);
            break;
          case TraitMechanic.ShieldOnStart:
            result.shieldOnStart = Math.max(result.shieldOnStart, m.value);
            break;
        }
      }
    }
  }

  return result;
}

export function recalcUnitStats(unit: UnitInstance, counts: Map<string, number>): void {
  rebuildUnitStats(unit, counts, true);
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
      !u.removedFromGame &&
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

function maybeDropEquipment(unit: UnitInstance, state: GameState): void {
  const modifiers = getContractModifiers(state.selectedContracts);
  const baseChance = unit.starLevel >= 3 ? 0.95 : unit.starLevel >= 2 ? 0.75 : 0.40;
  const bossBonus = state.round % 4 === 0 ? 0.10 : 0;
  const chance = Math.min(0.95, (baseChance + bossBonus) * modifiers.itemDropMultiplier);
  if (Math.random() < chance) {
    const allTypes = [
      ItemType.IronSword,
      ItemType.ChainMail,
      ItemType.Bow,
      ItemType.BlueCrystal,
      ItemType.GiantBelt,
      ItemType.MysticOrb,
      ItemType.BloodCharm,
    ];
    const dropType = allTypes[Math.floor(Math.random() * allTypes.length)];
    if (ITEMS[dropType]) {
      state.equipmentInventory = [...state.equipmentInventory, ITEMS[dropType]];
    }
  }
}

function healFromDamage(unit: UnitInstance, damage: number, state: GameState, ratio: number): void {
  if (ratio <= 0 || damage <= 0 || unit.hp <= 0) return;
  const heal = Math.max(1, Math.floor(damage * ratio));
  unit.hp = Math.min(unit.maxHp, unit.hp + heal);
  addFloating(state, unit.smoothPos.x, unit.smoothPos.y, `+${heal}`, '#64ff64');
}

function performBasicAttack(
  unit: UnitInstance,
  target: UnitInstance,
  state: GameState,
  isDouble = false
): void {
  if (target.hp <= 0) return;
  const bonuses = getMechanicBonusesForUnit(unit, state);
  const itemLifeSteal = unit.items.some((i) => i.type === ItemType.BloodCharm) ? 0.08 : 0;
  const crit = Math.random() < bonuses.critChance;
  const rawDamage = Math.max(1, Math.floor(unit.atk * (crit ? 1.75 : 1)));
  const dmg = takeDamage(target, rawDamage, false);
  const manaGain = Math.max(5, Math.round(15 * bonuses.manaGainMultiplier));
  unit.mana = Math.min(unit.maxMana, unit.mana + manaGain);
  addFloating(
    state,
    target.smoothPos.x,
    target.smoothPos.y,
    `-${dmg}${crit ? ' Crit' : isDouble ? ' Double' : ''}`,
    crit ? '#facc15' : isDouble ? '#ff8800' : '#ff4444'
  );
  healFromDamage(unit, dmg, state, bonuses.lifeSteal + itemLifeSteal);
  if (target.state === UnitState.Dead) {
    handleUnitDeath(target, state);
  }
}

export function tickBattle(state: GameState): void {
  const board = state.board;
  const alive = state.units.filter(
    (u) =>
      u.state !== UnitState.Dead &&
      !u.removedFromGame &&
      board.containsUnit(u)
  );

  for (const unit of alive) {
    if (unit.stunRemaining > 0) {
      unit.stunRemaining--;
      if (unit.stunRemaining <= 0) {
        unit.state = UnitState.Idle;
      }
      continue;
    }
    if (unit.state === UnitState.Dead) continue;

    if (unit.attackCooldown > 0) unit.attackCooldown--;
    if (unit.moveCooldown > 0) unit.moveCooldown--;

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

    if (!unit.target || unit.target.state === UnitState.Dead || !board.containsUnit(unit.target)) {
      unit.target = findTargetForUnit(unit, state.units, board);
    }
    if (!unit.target) {
      unit.state = UnitState.Idle;
      continue;
    }

    if (unit.skill && unit.mana >= unit.maxMana && unit.skill.canCast(unit, unit.target)) {
      unit.state = UnitState.Casting;
      unit.skill.cast(unit, unit.target, board, state);
      unit.mana = 0;
      continue;
    }

    const myWorld = gridToWorld(unit.position.row, unit.position.col);
    const tw = gridToWorld(unit.target.position.row, unit.target.position.col);
    const pixelDist = Math.hypot(tw.x - myWorld.x, tw.y - myWorld.y);
    const effectiveRange = unit.range * HEX_COL_SPACING + 5;

    if (pixelDist <= effectiveRange) {
      if (unit.attackCooldown <= 0) {
        unit.state = UnitState.Attacking;
        performBasicAttack(unit, unit.target, state);
        unit.attackCooldown = unit.attackSpeed;

        const doubleChance = getDoubleChance(unit, state);
        if (
          doubleChance > 0 &&
          Math.random() < doubleChance &&
          unit.target &&
          unit.target.hp > 0
        ) {
          performBasicAttack(unit, unit.target, state, true);
        }
      }
      continue;
    }

    if (unit.moveCooldown <= 0) {
      const path = findPath(unit.position, unit.target.position, board);
      if (path.length > 0) {
        const next = path[0];
        if (!board.hasUnitAt(next) || board.getUnitAt(next)?.id === unit.id) {
          const from = { ...unit.position };
          board.removeUnit(unit);
          board.addUnit(unit, next);
          unit.moveTarget = { ...next };
          unit.smoothPos = gridToWorld(from.row, from.col);
          unit.moving = true;
          unit.state = UnitState.Moving;
        }
      }
      unit.moveCooldown = unit.moveSpeed;
    }
  }

  const playerAlive = state.units.some(
    (u) =>
      u.owner === Owner.PlayerCtrl &&
      u.state !== UnitState.Dead &&
      !u.removedFromGame &&
      board.containsUnit(u)
  );
  const enemyAlive = state.units.some(
    (u) =>
      u.owner === Owner.EnemyCtrl &&
      u.state !== UnitState.Dead &&
      !u.removedFromGame &&
      board.containsUnit(u)
  );

  if (!playerAlive || !enemyAlive) {
    state.phase = GamePhase.Settlement;
    state.gameOver = false;
    state.victory = playerAlive && !enemyAlive;
    state.lastBattleSurvivors = state.units.filter(
      (u) =>
        u.owner === Owner.PlayerCtrl &&
        u.state !== UnitState.Dead &&
        !u.removedFromGame &&
        board.containsUnit(u)
    ).length;
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

// ===== Contract & Economy Helpers =====
export function getRiskScore(selectedContracts: string[]): number {
  const selected = new Set(selectedContracts);
  return CONTRACT_TAGS.reduce((sum, tag) => (selected.has(tag.id) ? sum + tag.risk : sum), 0);
}

export function getContractModifiers(selectedContracts: string[]): ContractModifiers {
  const selected = new Set(selectedContracts);
  const result: ContractModifiers = { ...DEFAULT_CONTRACT_MODIFIERS };
  for (const tag of CONTRACT_TAGS) {
    if (!selected.has(tag.id)) continue;
    const m = tag.modifiers;
    if (m.enemyHpMultiplier !== undefined) result.enemyHpMultiplier *= m.enemyHpMultiplier;
    if (m.enemyAtkMultiplier !== undefined) result.enemyAtkMultiplier *= m.enemyAtkMultiplier;
    if (m.enemyArmorBonus !== undefined) result.enemyArmorBonus += m.enemyArmorBonus;
    if (m.enemyMagicResBonus !== undefined) result.enemyMagicResBonus += m.enemyMagicResBonus;
    if (m.enemyAttackSpeedMultiplier !== undefined) result.enemyAttackSpeedMultiplier *= m.enemyAttackSpeedMultiplier;
    if (m.enemyStartingManaBonus !== undefined) result.enemyStartingManaBonus += m.enemyStartingManaBonus;
    if (m.enemyCountBonus !== undefined) result.enemyCountBonus += m.enemyCountBonus;
    if (m.playerHpMultiplier !== undefined) result.playerHpMultiplier *= m.playerHpMultiplier;
    if (m.playerAtkMultiplier !== undefined) result.playerAtkMultiplier *= m.playerAtkMultiplier;
    if (m.playerArmorPenalty !== undefined) result.playerArmorPenalty += m.playerArmorPenalty;
    if (m.playerManaCostMultiplier !== undefined) result.playerManaCostMultiplier *= m.playerManaCostMultiplier;
    if (m.deploymentLimitPenalty !== undefined) result.deploymentLimitPenalty += m.deploymentLimitPenalty;
    if (m.interestDisabled !== undefined) result.interestDisabled = result.interestDisabled || m.interestDisabled;
    if (m.itemDropMultiplier !== undefined) result.itemDropMultiplier *= m.itemDropMultiplier;
    if (m.refreshCostBonus !== undefined) result.refreshCostBonus += m.refreshCostBonus;
    if (m.interestCapReduction !== undefined) result.interestCapReduction += m.interestCapReduction;
    if (m.buyCostBonus !== undefined) result.buyCostBonus += m.buyCostBonus;
    if (m.sellPriceMultiplier !== undefined) result.sellPriceMultiplier *= m.sellPriceMultiplier;
  }
  return result;
}

export function getEffectivePopulationCap(state: GameState): number {
  const modifiers = getContractModifiers(state.selectedContracts);
  return Math.max(1, state.populationCap - modifiers.deploymentLimitPenalty);
}

export function getRoundStageName(round: number): string {
  if (round >= MAX_ROUNDS) return '终局危机';
  if (round % 4 === 0) return '精英首领';
  if (round >= 9) return '高压后期';
  if (round >= 5) return '中期推进';
  return '前期侦察';
}

export function getRefreshCost(state?: GameState): number {
  const bonus = state ? getContractModifiers(state.selectedContracts).refreshCostBonus : 0;
  return BASE_REFRESH_COST + bonus;
}

function getRoundBaseIncome(round: number): number {
  return Math.min(11, 7 + Math.floor(round / 2));
}

function getInterestGold(state: GameState): number {
  const modifiers = getContractModifiers(state.selectedContracts);
  if (modifiers.interestDisabled) return 0;
  const cap = Math.max(0, 5 - modifiers.interestCapReduction);
  return Math.min(cap, Math.floor(state.gold / 10));
}

function getStreakBonus(streak: number): number {
  if (streak >= 5) return 5;
  if (streak >= 3) return 3;
  if (streak >= 2) return 2;
  return 0;
}

function getRiskRewardBonus(state: GameState): number {
  return Math.floor(getRiskScore(state.selectedContracts) * 1.5);
}

function applyBattleStartBonuses(state: GameState): void {
  const modifiers = getContractModifiers(state.selectedContracts);
  state.traitCounts = calculateTraitCounts(state.units, state.board);
  for (const unit of state.board.getAllUnits()) {
    if (unit.owner !== Owner.PlayerCtrl || unit.removedFromGame) continue;
    rebuildUnitStats(unit, state.traitCounts, false);
    unit.maxHp = Math.max(1, Math.floor(unit.maxHp * modifiers.playerHpMultiplier));
    unit.hp = unit.maxHp;
    unit.atk = Math.max(1, Math.floor(unit.atk * modifiers.playerAtkMultiplier));
    unit.armor = Math.max(0, unit.armor - modifiers.playerArmorPenalty);
    unit.maxMana = Math.max(10, Math.floor(unit.maxMana * modifiers.playerManaCostMultiplier));
    unit.mana = Math.min(unit.mana, unit.maxMana);
    unit.target = null;
    unit.attackCooldown = 0;
    unit.moveCooldown = 0;
    unit.stunRemaining = 0;
    unit.moving = false;
    const mechanics = getMechanicBonusesForUnit(unit, state);
    if (mechanics.shieldOnStart > 0) {
      unit.shield += mechanics.shieldOnStart;
      addFloating(state, unit.smoothPos.x, unit.smoothPos.y, `+${mechanics.shieldOnStart}盾`, '#7dd3fc');
    }
  }
}

// ===== Shop System =====
function weightedHeroPool(heroPool: HeroTemplate[], level: number, round: number): HeroTemplate[] {
  const priceCap = Math.min(5, 1 + Math.floor(level / 2) + Math.floor(round / 5));
  const candidates = heroPool.filter((tpl) => tpl.price <= priceCap || heroPool.length <= SHOP_SLOTS);
  const source = candidates.length > 0 ? candidates : heroPool;
  const weighted: HeroTemplate[] = [];
  for (const tpl of source) {
    const rarityPenalty = Math.max(1, tpl.price);
    const copies = Math.max(1, 7 - rarityPenalty + Math.floor(level / 3));
    for (let i = 0; i < copies; i++) weighted.push(tpl);
  }
  return weighted.length > 0 ? weighted : heroPool;
}

export function generateShopUnits(
  heroPool: HeroTemplate[],
  level = 1,
  round = 1
): UnitInstance[] {
  const pool = weightedHeroPool(heroPool, level, round);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const units: UnitInstance[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    const tpl = shuffled[i % shuffled.length] ?? heroPool[i % heroPool.length];
    if (!tpl) continue;
    const unit = createUnitFromTemplate(tpl, Owner.PlayerCtrl);
    unit.isShopUnit = true;
    units.push(unit);
  }
  return units;
}

// ===== Enemy Wave Generation =====
export function generateEnemyWave(
  round: number,
  heroPool: HeroTemplate[],
  selectedContracts: string[] = []
): UnitInstance[] {
  const enemies: UnitInstance[] = [];
  if (heroPool.length === 0) return enemies;

  const modifiers = getContractModifiers(selectedContracts);
  const risk = getRiskScore(selectedContracts);
  const isBossRound = round % 4 === 0 || round >= MAX_ROUNDS;
  const priceCap = Math.min(5, 1 + Math.floor(round / 3));
  const candidates = heroPool.filter((tpl) => tpl.price <= priceCap);
  const source = candidates.length > 0 ? candidates : heroPool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const baseCount = isBossRound ? 3 + Math.floor(round / 4) : 2 + Math.ceil(round * 0.55);
  const count = Math.min(8, baseCount + modifiers.enemyCountBonus);

  for (let i = 0; i < count; i++) {
    const tpl = shuffled[i % shuffled.length];
    const enemy = createUnitFromTemplate(tpl, Owner.EnemyCtrl);
    enemy.isShopUnit = false;
    enemy.removedFromGame = false;
    enemy.starLevel = round >= 9 && i < 2 ? 2 : round >= 6 && Math.random() < 0.28 ? 2 : 1;
    if (isBossRound && i === 0) enemy.starLevel = Math.min(3, enemy.starLevel + 1);
    rebuildUnitStats(enemy, new Map(), false);

    let scale = 0.82 + round * 0.21 + risk * 0.045;
    if (isBossRound && i === 0) scale *= 1.65;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * scale * modifiers.enemyHpMultiplier));
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.max(1, Math.floor(enemy.atk * scale * modifiers.enemyAtkMultiplier));
    enemy.armor += modifiers.enemyArmorBonus + Math.floor(round / 2);
    enemy.magicRes += modifiers.enemyMagicResBonus + Math.floor(round / 3);
    enemy.attackSpeed = Math.max(14, Math.floor(enemy.attackSpeed / modifiers.enemyAttackSpeedMultiplier));
    enemy.mana = Math.min(
      enemy.maxMana,
      enemy.startingMana + modifiers.enemyStartingManaBonus + (isBossRound && i === 0 ? 20 : 0)
    );
    enemies.push(enemy);
  }

  return enemies;
}

// ===== Combine System =====
function isOwnedPlayerUnit(unit: UnitInstance, state: GameState): boolean {
  if (unit.owner !== Owner.PlayerCtrl || unit.isShopUnit || unit.removedFromGame) return false;
  if (state.board.containsUnit(unit)) return true;
  return state.bench.some((b) => b?.id === unit.id);
}

export function tryCombineUnits(
  justAddedUnit: UnitInstance,
  state: GameState
): UnitInstance | null {
  if (!isOwnedPlayerUnit(justAddedUnit, state)) return null;
  const same = state.units.filter(
    (u) =>
      u.id !== justAddedUnit.id &&
      u.name === justAddedUnit.name &&
      u.starLevel === justAddedUnit.starLevel &&
      u.owner === Owner.PlayerCtrl &&
      u.state !== UnitState.Dead &&
      isOwnedPlayerUnit(u, state)
  );

  if (same.length < 2) return null;

  const toRemove = same.slice(0, 2);
  const keepUnit = justAddedUnit;

  for (const u of toRemove) {
    if (state.board.containsUnit(u)) {
      state.board.removeUnit(u);
    }
    for (let i = 0; i < state.bench.length; i++) {
      if (state.bench[i]?.id === u.id) {
        state.bench[i] = null;
      }
    }
    u.items.forEach((item) => {
      state.equipmentInventory = [...state.equipmentInventory, item];
    });
    u.items = [];
    u.state = UnitState.Dead;
    u.removedFromGame = true;
  }

  combineUnits(keepUnit, state);
  return keepUnit;
}

export function combineUnits(
  unit: UnitInstance,
  state: GameState
): void {
  unit.starLevel = Math.min(3, unit.starLevel + 1);
  unit.maxEquipSlots = Math.min(3, unit.maxEquipSlots + 1);
  rebuildUnitStats(unit, calculateTraitCounts(state.units, state.board), false);
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
  const shopUnits = generateShopUnits(heroPool, 1, 1);

  // Initial equipment inventory: 2 random items
  const allTypes = [ItemType.IronSword, ItemType.ChainMail, ItemType.Bow, ItemType.BlueCrystal, ItemType.GiantBelt, ItemType.MysticOrb, ItemType.BloodCharm];
  const equipmentInventory = [ITEMS[allTypes[0]], ITEMS[allTypes[1]]];

  const state: GameState = {
    phase: GamePhase.ContractSelection,
    round: 1,
    maxRound: MAX_ROUNDS,
    playerHP: 100,
    gold: 65,
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
    statusMessage: '拖拽单位到棋盘上布阵；可选危机合约后按空格开战',
    combatTickAcc: 0,
    settlementResolved: false,
    winStreak: 0,
    loseStreak: 0,
    lastBattleSurvivors: 0,
    selectedContracts: [],
    contractLocked: false,
    bestRisk: 0,
    currentRisk: 0,
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
  return 8 + level * 6;
}

// ===== Unit price =====
export function getUnitSellPrice(unit: UnitInstance, state?: GameState): number {
  const base = unit.starLevel === 1 ? unit.price : unit.starLevel === 2 ? unit.price * 3 : unit.price * 8;
  const mult = state ? getContractModifiers(state.selectedContracts).sellPriceMultiplier : 1;
  return Math.max(0, Math.floor(base * mult));
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

function cloneBoardForReducer(board: BoardInterface): BoardInterface {
  return board instanceof Board ? board.cloneForBattle() : board;
}

function removeUnitFromBenchSlots(bench: (UnitInstance | null)[], unitId: number): void {
  for (let i = 0; i < bench.length; i++) {
    if (bench[i]?.id === unitId) bench[i] = null;
  }
}

function removeUnitFromPlay(next: GameState, unit: UnitInstance): void {
  next.board.removeUnit(unit);
  removeUnitFromBenchSlots(next.bench, unit.id);
}

function resolveBattleSettlement(next: GameState, prev: GameState): void {
  if (prev.settlementResolved) return;
  const risk = getRiskScore(prev.selectedContracts);
  const interest = getInterestGold(prev);
  const baseIncome = getRoundBaseIncome(prev.round);
  const isFinalRound = prev.round >= prev.maxRound;

  if (prev.victory) {
    const winStreak = prev.winStreak + 1;
    const streakBonus = getStreakBonus(winStreak);
    const riskBonus = getRiskRewardBonus(prev);
    const totalGold = baseIncome + interest + streakBonus + riskBonus;
    next.gold = prev.gold + totalGold;
    next.winStreak = winStreak;
    next.loseStreak = 0;
    next.bestRisk = Math.max(prev.bestRisk, risk);
    next.currentRisk = risk;
    next.statusMessage = `第 ${prev.round} 轮胜利！基础 ${baseIncome} + 利息 ${interest} + 连胜 ${streakBonus} + 危机 ${riskBonus} = +${totalGold} 金币`;
    if (isFinalRound) {
      next.gameOver = true;
      next.victory = true;
      next.statusMessage = `终局危机突破！最高 Risk ${next.bestRisk}`;
    }
  } else {
    const loseStreak = prev.loseStreak + 1;
    const streakBonus = getStreakBonus(loseStreak);
    const consolation = Math.max(3, Math.floor(baseIncome * 0.7)) + Math.floor(interest / 2) + streakBonus;
    const hpLoss = Math.max(6, 8 + Math.floor(prev.round * 1.8) + Math.floor(risk * 0.9) - prev.lastBattleSurvivors);
    next.gold = prev.gold + consolation;
    next.playerHP = Math.max(0, prev.playerHP - hpLoss);
    next.winStreak = 0;
    next.loseStreak = loseStreak;
    next.currentRisk = risk;
    next.statusMessage = `战斗失败：失去 ${hpLoss} 生命，补给 +${consolation} 金币`;
    if (next.playerHP <= 0) {
      next.gameOver = true;
      next.victory = false;
      next.statusMessage = '生命值耗尽，游戏结束...';
    }
  }
  next.settlementResolved = true;
}

// ===== gameReducer =====
export function gameReducer(
  state: GameState,
  action: GameAction,
  heroPool: HeroTemplate[]
): GameState {
  const next: GameState = {
    ...state,
    board: cloneBoardForReducer(state.board),
  };

  switch (action.type) {
    case 'DRAG_START': {
      const unit = state.units.find((u) => u.id === action.unitId);
      if (
        !unit ||
        unit.owner !== Owner.PlayerCtrl ||
        unit.isShopUnit ||
        unit.removedFromGame ||
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
      next.bench = [...state.bench];
      next.units = [...state.units];

      const unit = state.units.find((u) => u.id === drag.unitId);
      if (!unit || unit.isShopUnit || unit.removedFromGame) return next;

      const gridTarget = action.gridTarget !== undefined ? action.gridTarget : worldToGrid(mousePos.x, mousePos.y);
      const benchTarget = action.benchTarget !== undefined ? action.benchTarget : -1;

      const finishMove = (): void => {
        unit.state = UnitState.Idle;
        unit.moving = false;
        unit.attackCooldown = 0;
        unit.moveCooldown = 0;
        next.traitCounts = calculateTraitCounts(next.units, next.board);
        recalcAllPlayerStats(next as GameState, true);
        next.units = [...next.units];
      };

      const tryCombineAfterDrop = (): boolean => {
        const combined = tryCombineUnits(unit, next as GameState);
        if (!combined) return false;
        for (const u of next.units) {
          if (u.removedFromGame) {
            removeUnitFromBenchSlots(next.bench, u.id);
          }
        }
        if (next.selectedUnitId !== null) {
          const sel = next.units.find((u) => u.id === next.selectedUnitId);
          if (!sel || sel.removedFromGame) next.selectedUnitId = null;
        }
        next.statusMessage = `${combined.name} 升级为 ${'★'.repeat(combined.starLevel)}!`;
        return true;
      };

      // Drop to bench. Always remove the dragged unit from every previous board / bench
      // reference first, so the source slot cannot keep a stale copy.
      if (benchTarget >= 0 && benchTarget < BENCH_SLOTS) {
        const existing = next.bench[benchTarget];

        if (!existing || existing.id === unit.id) {
          removeUnitFromPlay(next as GameState, unit);
          next.bench[benchTarget] = unit;
          unit.position = { col: 0, row: 0 };
          unit.smoothPos = gridToWorld(0, 0);
          next.statusMessage = '';
          if (tryCombineAfterDrop()) {
            next.traitCounts = calculateTraitCounts(next.units, next.board);
            recalcAllPlayerStats(next as GameState, true);
            next.units = [...next.units];
          } else {
            finishMove();
          }
          return next;
        }

        if (existing.owner === Owner.PlayerCtrl && !existing.isShopUnit && !existing.removedFromGame) {
          removeUnitFromPlay(next as GameState, unit);
          removeUnitFromBenchSlots(next.bench, existing.id);

          if (drag.sourceGrid) {
            next.bench[benchTarget] = unit;
            next.board.addUnit(existing, drag.sourceGrid);
            existing.smoothPos = gridToWorld(drag.sourceGrid.row, drag.sourceGrid.col);
          } else if (drag.sourceBenchSlot !== null) {
            next.bench[drag.sourceBenchSlot] = existing;
            next.bench[benchTarget] = unit;
          }

          unit.position = { col: 0, row: 0 };
          unit.smoothPos = gridToWorld(0, 0);
          next.statusMessage = '';
          if (tryCombineAfterDrop()) {
            next.traitCounts = calculateTraitCounts(next.units, next.board);
            recalcAllPlayerStats(next as GameState, true);
            next.units = [...next.units];
          } else {
            finishMove();
          }
          return next;
        }
      }

      // Drop to board. The same defensive cleanup prevents duplicated pieces even
      // if a stale bench icon remains clickable in an older browser frame.
      if (gridTarget && next.board.isPlayerHalf(gridTarget)) {
        const existing = next.board.getUnitAt(gridTarget);

        if (!existing) {
          const onBoard = next.units.filter(
            (u) =>
              u.owner === Owner.PlayerCtrl &&
              u.state !== UnitState.Dead &&
              !u.isShopUnit &&
              !u.removedFromGame &&
              next.board.containsUnit(u)
          ).length;
          const fromBoard = drag.sourceGrid ? 1 : 0;
          const effectiveCap = getEffectivePopulationCap(next as GameState);
          if (onBoard - fromBoard + 1 > effectiveCap) {
            next.statusMessage = `人口已满！当前合约下上限为 ${effectiveCap}`;
            return next;
          }

          removeUnitFromPlay(next as GameState, unit);
          next.board.addUnit(unit, gridTarget);
          unit.smoothPos = gridToWorld(gridTarget.row, gridTarget.col);
          next.statusMessage = '';
          finishMove();
          return next;
        }

        if (existing.owner === Owner.PlayerCtrl && !existing.isShopUnit && !existing.removedFromGame) {
          next.board.removeUnit(existing);
          removeUnitFromPlay(next as GameState, unit);

          if (drag.sourceGrid) {
            next.board.addUnit(existing, drag.sourceGrid);
            existing.smoothPos = gridToWorld(drag.sourceGrid.row, drag.sourceGrid.col);
          } else if (drag.sourceBenchSlot !== null) {
            next.bench[drag.sourceBenchSlot] = existing;
            existing.position = { col: 0, row: 0 };
            existing.smoothPos = gridToWorld(0, 0);
          }

          next.board.addUnit(unit, gridTarget);
          unit.smoothPos = gridToWorld(gridTarget.row, gridTarget.col);
          next.statusMessage = '';
          finishMove();
          return next;
        }
      }

      return next;
    }

    case 'DRAG_CANCEL': {
      next.dragging = null;
      next.dragMousePos = null;
      return next;
    }

    case 'START_BATTLE': {
      if (state.phase !== GamePhase.Preparation) return state;
      const onBoard = state.units.filter(
        (u) =>
          u.owner === Owner.PlayerCtrl &&
          u.state !== UnitState.Dead &&
          !u.isShopUnit &&
          !u.removedFromGame &&
          state.board.containsUnit(u)
      );
      if (onBoard.length === 0) {
        next.statusMessage = '请先在棋盘上放置单位';
        return next;
      }
      const effectiveCap = getEffectivePopulationCap(state);
      if (onBoard.length > effectiveCap) {
        next.statusMessage = `当前危机合约限制上阵 ${effectiveCap} 人，请先调整阵容`;
        return next;
      }

      next.phase = GamePhase.Battle;
      next.currentRisk = getRiskScore(state.selectedContracts);
      next.bestRisk = Math.max(state.bestRisk, next.currentRisk);
      next.statusMessage = `战斗进行中 · ${getRoundStageName(state.round)} · Risk ${next.currentRisk}`;
      next.floatingTexts = [];
      next.vfxEffects = [];

      applyBattleStartBonuses(next as GameState);

      next.units = state.units.filter((u) => u.owner !== Owner.EnemyCtrl && !u.removedFromGame);
      const enemies = generateEnemyWave(state.round, heroPool, state.selectedContracts);
      next.units = [...next.units, ...enemies];

      const enemyPositions: Position[] = [];
      for (let row = 0; row < BOARD_ROWS / 2; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          enemyPositions.push({ col, row });
        }
      }
      enemyPositions.sort((a, b) => {
        const centerA = Math.abs(a.col - (BOARD_COLS - 1) / 2) + a.row * 0.2;
        const centerB = Math.abs(b.col - (BOARD_COLS - 1) / 2) + b.row * 0.2;
        return centerA - centerB;
      });
      for (const enemy of enemies) {
        const emptyPos = enemyPositions.find((p) => !next.board.hasUnitAt(p));
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
      next.units = [...state.units];
      next.floatingTexts = [...state.floatingTexts];
      next.vfxEffects = [...state.vfxEffects];
      next.equipmentInventory = [...state.equipmentInventory];
      next.combatTickAcc = state.combatTickAcc + action.dt;
      while (next.combatTickAcc >= COMBAT_TICK_MS && next.phase === GamePhase.Battle) {
        tickBattle(next as GameState);
        next.combatTickAcc -= COMBAT_TICK_MS;
      }
      cleanupEffects(next as GameState, performance.now());
      return next;
    }

    case 'END_BATTLE': {
      if (state.phase !== GamePhase.Settlement) return state;
      resolveBattleSettlement(next as GameState, state);
      return next;
    }

    case 'NEXT_ROUND': {
      if (state.phase !== GamePhase.Settlement) return state;
      if (state.gameOver) {
        return getInitialState(heroPool);
      }

      if (!state.settlementResolved) {
        resolveBattleSettlement(next as GameState, state);
        if (next.gameOver) return next;
      }

      next.phase = GamePhase.Preparation;
      next.round = state.round + 1;
      next.statusMessage = '拖拽单位到棋盘上布阵；本局危机合约已锁定';

      next.units = next.units.filter(
        (u) => u.owner === Owner.PlayerCtrl && !u.removedFromGame && !u.isShopUnit
      );
      next.board.clear();
      next.bench = new Array(BENCH_SLOTS).fill(null);

      let benchIdx = 0;
      let overflowGold = 0;
      for (const u of next.units) {
        u.state = UnitState.Idle;
        u.mana = u.startingMana;
        u.target = null;
        u.moving = false;
        u.stunRemaining = 0;
        u.shield = 0;
        u.attackCooldown = 0;
        u.moveCooldown = 0;
        u.position = { col: 0, row: 0 };
        rebuildUnitStats(u, new Map(), false);
        if (benchIdx < BENCH_SLOTS) {
          next.bench[benchIdx] = u;
          benchIdx++;
        } else {
          overflowGold += Math.floor(u.price * 0.8);
          u.state = UnitState.Dead;
          u.removedFromGame = true;
        }
      }
      if (overflowGold > 0) {
        next.gold += overflowGold;
        next.statusMessage = `备战栏已满，溢出单位自动售出，获得 ${overflowGold} 金币`;
      }

      const newShop = generateShopUnits(heroPool, next.populationLevel, next.round);
      next.shopUnits = newShop;
      next.floatingTexts = [];
      next.vfxEffects = [];
      next.traitCounts = calculateTraitCounts(next.units, next.board);
      next.selectedUnitId = null;
      return next;
    }

    case 'BUY_UNIT': {
      if (state.phase !== GamePhase.Preparation) return state;
      const shopUnit = state.shopUnits[action.shopIndex];
      if (!shopUnit || shopUnit.state === UnitState.Dead || shopUnit.removedFromGame) return state;
      const modifiers = getContractModifiers(state.selectedContracts);
      const effectivePrice = shopUnit.price + modifiers.buyCostBonus;
      if (state.gold < effectivePrice) {
        next.statusMessage = `金币不足！需要 ${effectivePrice} 金`;
        return next;
      }

      next.bench = [...state.bench];
      let emptySlot = next.bench.findIndex((b) => b === null);

      // If bench is full, try to place directly on the board
      if (emptySlot === -1) {
        const onBoard = state.units.filter(
          (u) =>
            u.owner === Owner.PlayerCtrl &&
            u.state !== UnitState.Dead &&
            !u.isShopUnit &&
            !u.removedFromGame &&
            state.board.containsUnit(u)
        ).length;
        const effectiveCap = getEffectivePopulationCap(next as GameState);
        if (onBoard < effectiveCap) {
          // Find an empty hex on player's half
          let boardTarget: Position | null = null;
          for (let row = 4; row < BOARD_ROWS && !boardTarget; row++) {
            for (let col = 0; col < BOARD_COLS && !boardTarget; col++) {
              const pos = { col, row };
              if (next.board.isValidPosition(pos) && !next.board.hasUnitAt(pos)) {
                boardTarget = pos;
              }
            }
          }
          if (boardTarget) {
            next.gold = state.gold - effectivePrice;
            shopUnit.isShopUnit = false;
            shopUnit.state = UnitState.Idle;
            shopUnit.removedFromGame = false;
            shopUnit.owner = Owner.PlayerCtrl;
            shopUnit.position = { ...boardTarget };
            shopUnit.smoothPos = gridToWorld(boardTarget.row, boardTarget.col);
            rebuildUnitStats(shopUnit, next.traitCounts, false);
            next.board.addUnit(shopUnit, boardTarget);
            next.shopUnits = state.shopUnits.map((u, i) => (i === action.shopIndex ? null : u));
            next.units = [...state.units.filter((u) => u.id !== shopUnit.id), shopUnit];
            next.statusMessage = `已购买 ${shopUnit.name} 并部署到棋盘`;
            next.traitCounts = calculateTraitCounts(next.units, next.board);
            recalcAllPlayerStats(next as GameState, true);
            return next;
          }
        }
        next.statusMessage = '备战席已满！请先出售单位或部署到棋盘腾出空间';
        return next;
      }

      next.gold = state.gold - effectivePrice;
      shopUnit.isShopUnit = false;
      shopUnit.state = UnitState.Idle;
      shopUnit.removedFromGame = false;
      shopUnit.owner = Owner.PlayerCtrl;
      rebuildUnitStats(shopUnit, next.traitCounts, false);

      next.bench[emptySlot] = shopUnit;
      next.shopUnits = state.shopUnits.map((u, i) => (i === action.shopIndex ? null : u));
      next.units = [...state.units.filter((u) => u.id !== shopUnit.id), shopUnit];
      next.statusMessage = '';
      next.traitCounts = calculateTraitCounts(next.units, next.board);

      const combined = tryCombineUnits(shopUnit, next as GameState);
      if (combined) {
        // Defensive cleanup: ensure all removed-from-game units have their bench slots cleared
        for (const u of next.units) {
          if (u.removedFromGame) {
            removeUnitFromBenchSlots(next.bench, u.id);
          }
        }
        if (next.selectedUnitId !== null) {
          const sel = next.units.find((u) => u.id === next.selectedUnitId);
          if (!sel || sel.removedFromGame) next.selectedUnitId = null;
        }
        next.statusMessage = `${combined.name} 升级为 ${'★'.repeat(combined.starLevel)}!`;
        next.traitCounts = calculateTraitCounts(next.units, next.board);
        recalcAllPlayerStats(next as GameState, true);
      }
      return next;
    }

    case 'SELL_UNIT': {
      if (state.phase !== GamePhase.Preparation) {
        next.statusMessage = '只能在准备阶段出售';
        return next;
      }
      const unitIdx = state.units.findIndex((u) => u.id === action.unitId);
      if (unitIdx === -1) return state;
      const unit = state.units[unitIdx];
      if (unit.owner !== Owner.PlayerCtrl || unit.isShopUnit || unit.removedFromGame) {
        next.statusMessage = '无法出售此单位';
        return next;
      }
      const price = getUnitSellPrice(unit, state);
      next.gold = state.gold + price;
      next.statusMessage = `出售 ${unit.name}，获得 ${price} 金币`;

      if (next.board.containsUnit(unit)) {
        next.board.removeUnit(unit);
      }
      next.bench = [...state.bench];
      for (let i = 0; i < next.bench.length; i++) {
        if (next.bench[i]?.id === unit.id) {
          next.bench[i] = null;
        }
      }
      for (const item of unit.items) {
        next.equipmentInventory = [...next.equipmentInventory, item];
      }
      const soldUnit = { ...unit, items: [] };
      soldUnit.state = UnitState.Dead;
      soldUnit.removedFromGame = true;
      next.units = state.units.map((u, i) => (i === unitIdx ? soldUnit : u));
      next.traitCounts = calculateTraitCounts(next.units, next.board);
      recalcAllPlayerStats(next as GameState, true);
      next.selectedUnitId = null;
      return next;
    }

    case 'REFRESH_SHOP': {
      if (state.phase !== GamePhase.Preparation) return state;
      const cost = getRefreshCost(state);
      if (state.gold < cost) {
        next.statusMessage = `金币不足！需要 ${cost} 金币刷新`;
        return next;
      }
      next.gold = state.gold - cost;
      for (const u of state.shopUnits) {
        if (u && u.isShopUnit) {
          u.state = UnitState.Dead;
          u.removedFromGame = true;
        }
      }
      const activeUnits = state.units.filter((u) => !u.isShopUnit && !u.removedFromGame);
      const newShop = generateShopUnits(heroPool, state.populationLevel, state.round);
      next.units = activeUnits;
      next.shopUnits = newShop;
      next.statusMessage = '';
      return next;
    }

    case 'UPGRADE_POPULATION': {
      if (state.phase !== GamePhase.Preparation) return state;
      if (state.populationCap >= 8) {
        next.statusMessage = '人口已达到上限';
        return next;
      }
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
      if (state.phase !== GamePhase.Preparation) return state;
      const unitIdx = state.units.findIndex((u) => u.id === action.targetUnitId);
      if (unitIdx === -1) return state;
      const unit = state.units[unitIdx];
      if (unit.owner !== Owner.PlayerCtrl) return state;
      const itemIdx = state.equipmentInventory.findIndex(
        (i) => i.type === action.itemType
      );
      if (itemIdx === -1) return state;
      const item = state.equipmentInventory[itemIdx];
      const clonedUnit = { ...unit, items: [...unit.items] };
      if (!tryEquipItemToUnit(item, clonedUnit)) {
        next.statusMessage = '装备栏已满！';
        return next;
      }
      next.units = state.units.map((u, i) => (i === unitIdx ? clonedUnit : u));
      next.equipmentInventory = state.equipmentInventory.filter(
        (_, i) => i !== itemIdx
      );
      next.statusMessage = `装备 ${item.name} 已给予 ${clonedUnit.name}`;
      return next;
    }

    case 'UNEQUIP_ITEM': {
      if (state.phase !== GamePhase.Preparation) return state;
      const targetUnit = state.units.find((u) => u.id === action.unitId);
      if (!targetUnit || targetUnit.owner !== Owner.PlayerCtrl) return state;
      if (action.itemIndex < 0 || action.itemIndex >= targetUnit.items.length) return state;
      const removedItem = targetUnit.items[action.itemIndex];
      targetUnit.items = targetUnit.items.filter((_, i) => i !== action.itemIndex);
      next.equipmentInventory = [...state.equipmentInventory, removedItem];
      rebuildUnitStats(targetUnit, next.traitCounts, true);
      next.units = state.units.map((u) => (u.id === targetUnit.id ? targetUnit : u));
      next.statusMessage = `已取下 ${removedItem.name}`;
      return next;
    }

    case 'TOGGLE_CONTRACT': {
      if (state.phase !== GamePhase.ContractSelection || state.contractLocked) return state;
      const tag = CONTRACT_TAGS.find((c) => c.id === action.contractId);
      if (!tag) return state;
      const selected = new Set(state.selectedContracts);
      if (selected.has(tag.id)) {
        selected.delete(tag.id);
      } else {
        if (tag.exclusiveGroup) {
          for (const other of CONTRACT_TAGS) {
            if (other.exclusiveGroup === tag.exclusiveGroup) selected.delete(other.id);
          }
        }
        selected.add(tag.id);
      }
      next.selectedContracts = [...selected];
      next.currentRisk = getRiskScore(next.selectedContracts);
      next.statusMessage = `已选择危机合约：Risk ${next.currentRisk}`;
      const effectiveCap = getEffectivePopulationCap(next as GameState);
      const onBoard = next.units.filter(
        (u) =>
          u.owner === Owner.PlayerCtrl &&
          u.state !== UnitState.Dead &&
          !u.isShopUnit &&
          !u.removedFromGame &&
          next.board.containsUnit(u)
      ).length;
      if (onBoard > effectiveCap) {
        next.statusMessage = `Risk ${next.currentRisk} 已生效：请将上阵人数降至 ${effectiveCap}`;
      }
      return next;
    }

    case 'CLEAR_CONTRACTS': {
      if (state.phase !== GamePhase.ContractSelection || state.contractLocked) return state;
      next.selectedContracts = [];
      next.currentRisk = 0;
      next.statusMessage = '已清空危机合约';
      return next;
    }


    case 'CONFIRM_CONTRACTS': {
      if (state.phase !== GamePhase.ContractSelection) return state;
      next.phase = GamePhase.Preparation;
      next.contractLocked = true;
      next.currentRisk = getRiskScore(state.selectedContracts);
      next.bestRisk = Math.max(state.bestRisk, next.currentRisk);
      next.statusMessage = next.currentRisk > 0
        ? `合约已确认：Risk ${next.currentRisk}。拖拽单位到棋盘上布阵，按空格开始战斗`
        : '普通难度已确认。拖拽单位到棋盘上布阵，按空格开始战斗';
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


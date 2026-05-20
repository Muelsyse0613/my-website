// ===== Enums =====
export const enum Owner {
  PlayerCtrl,
  EnemyCtrl,
}

export const enum UnitState {
  Idle,
  Moving,
  Attacking,
  Casting,
  Dead,
  Stunned,
}

export const enum GamePhase {
  Preparation,
  Battle,
  Settlement,
}

export const enum ItemType {
  IronSword,
  ChainMail,
  Bow,
  BlueCrystal,
}

export const enum TraitBonusType {
  HpPercent,
  HpFlat,
  Armor,
  MagicRes,
  AtkPercent,
  AtkFlat,
}

export const enum TraitMechanic {
  SkillDamageMultiplier,
  DoubleAttackChance,
}

// ===== Grid =====
export interface Position {
  col: number;
  row: number;
}

export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;
export const BENCH_SLOTS = 8;
export const SHOP_SLOTS = 5;

// Hex layout constants
export const HEX_RADIUS = 46;
export const HEX_ROW_SPACING = 69;
export const HEX_COL_SPACING = HEX_RADIUS * Math.sqrt(3);
export const SPRITE_SIZE = 40;

// ===== Hero Template =====
export interface HeroTemplate {
  name: string;
  sprite: string;
  hp: number;
  atk: number;
  range: number;
  maxMana: number;
  startingMana: number;
  armor: number;
  magicRes: number;
  price: number;
  skillType: 'Stun' | 'LineAOE' | 'HealAura';
  traits: string[];
}

// ===== Item =====
export interface Item {
  type: ItemType;
  name: string;
  description: string;
}

// ===== Unit Instance =====
export interface UnitInstance {
  id: number;
  name: string;
  owner: Owner;
  position: Position;
  state: UnitState;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  maxMana: number;
  mana: number;
  armor: number;
  magicRes: number;
  price: number;
  starLevel: number;
  traits: Set<string>;
  baseMaxHp: number;
  baseAtk: number;
  baseArmor: number;
  baseMagicRes: number;
  target: UnitInstance | null;
  attackSpeed: number;
  attackCooldown: number;
  moveSpeed: number;
  moveCooldown: number;
  skill: Skill | null;
  startingMana: number;
  stunRemaining: number;
  moving: boolean;
  smoothPos: { x: number; y: number };
  moveTarget: Position;
  items: Item[];
  maxEquipSlots: number;
}

// ===== Skill =====
export interface Skill {
  type: 'Stun' | 'LineAOE' | 'HealAura';
  manaCost: number;
  canCast(caster: UnitInstance, target: UnitInstance | null): boolean;
  cast(
    caster: UnitInstance,
    target: UnitInstance,
    board: BoardInterface,
    state: GameState
  ): void;
}

// ===== Board =====
export interface BoardInterface {
  addUnit(unit: UnitInstance, pos: Position): void;
  removeUnit(unit: UnitInstance): void;
  getUnitAt(pos: Position): UnitInstance | null;
  hasUnitAt(pos: Position): boolean;
  containsUnit(unit: UnitInstance): boolean;
  isValidPosition(pos: Position): boolean;
  isPlayerHalf(pos: Position): boolean;
  clear(): void;
  getAllUnits(): UnitInstance[];
}

// ===== Trait System =====
export interface TraitBonusDef {
  requiredCount: number;
  type: TraitBonusType;
  value: number;
}

export interface TraitMechanicDef {
  requiredCount: number;
  mechanic: TraitMechanic;
  value: number;
}

export const TRAIT_BONUSES: Record<string, TraitBonusDef[]> = {
  战士: [
    { requiredCount: 2, type: TraitBonusType.HpPercent, value: 0.15 },
    { requiredCount: 4, type: TraitBonusType.Armor, value: 20 },
  ],
  法师: [
    { requiredCount: 2, type: TraitBonusType.AtkPercent, value: 0.2 },
    { requiredCount: 4, type: TraitBonusType.MagicRes, value: 20 },
  ],
  神盾: [
    { requiredCount: 2, type: TraitBonusType.Armor, value: 10 },
    { requiredCount: 4, type: TraitBonusType.HpPercent, value: 0.1 },
  ],
  枪手: [
    { requiredCount: 2, type: TraitBonusType.AtkFlat, value: 10 },
    { requiredCount: 4, type: TraitBonusType.AtkPercent, value: 0.15 },
  ],
  斗士: [
    { requiredCount: 2, type: TraitBonusType.HpPercent, value: 0.15 },
    { requiredCount: 4, type: TraitBonusType.HpPercent, value: 0.4 },
  ],
};

export const TRAIT_MECHANICS: Record<string, TraitMechanicDef[]> = {
  法师: [
    { requiredCount: 3, mechanic: TraitMechanic.SkillDamageMultiplier, value: 2.0 },
  ],
  狙神: [
    { requiredCount: 2, mechanic: TraitMechanic.DoubleAttackChance, value: 0.3 },
    { requiredCount: 4, mechanic: TraitMechanic.DoubleAttackChance, value: 0.6 },
  ],
};

export const TRAIT_NAMES_CN: Record<string, string> = {
  神盾使: '神盾使',
  神谕: '神谕',
};

// ===== Floating Text =====
export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  duration: number;
}

// ===== VFX Effect =====
export interface VFXEffect {
  id: number;
  type: 'lineAoe' | 'healAura';
  startPos?: { x: number; y: number };
  endPos?: { x: number; y: number };
  centerPos?: { x: number; y: number };
  radius?: number;
  createdAt: number;
  duration: number;
}

// ===== Drag State =====
export interface DragState {
  unitId: number;
  sourceGrid: Position | null;
  sourceBenchSlot: number | null;
}

// ===== Game State =====
export interface GameState {
  phase: GamePhase;
  round: number;
  playerHP: number;
  gold: number;
  populationCap: number;
  populationLevel: number;
  gameOver: boolean;
  victory: boolean;
  board: BoardInterface;
  units: UnitInstance[];
  bench: (UnitInstance | null)[];
  shopUnits: (UnitInstance | null)[];
  equipmentInventory: Item[];
  traitCounts: Map<string, number>;
  dragging: DragState | null;
  dragMousePos: { x: number; y: number } | null;
  selectedUnitId: number | null;
  floatingTexts: FloatingText[];
  vfxEffects: VFXEffect[];
  statusMessage: string;
  // Combat tick accumulator (tracks partial frame time)
  combatTickAcc: number;
  // Whether END_BATTLE has processed the settlement (gold/HP/gameOver)
  settlementResolved: boolean;
}

// ===== Game Actions =====
export type GameAction =
  | { type: 'DRAG_START'; unitId: number; sourceGrid: Position | null; sourceBenchSlot: number | null; mousePos: { x: number; y: number } }
  | { type: 'DRAG_MOVE'; mousePos: { x: number; y: number } }
  | { type: 'DRAG_DROP'; mousePos: { x: number; y: number }; gridTarget?: Position | null; benchTarget?: number }
  | { type: 'DRAG_CANCEL' }
  | { type: 'START_BATTLE' }
  | { type: 'BATTLE_TICK'; dt: number }
  | { type: 'END_BATTLE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'BUY_UNIT'; shopIndex: number }
  | { type: 'SELL_UNIT'; unitId: number }
  | { type: 'REFRESH_SHOP' }
  | { type: 'UPGRADE_POPULATION' }
  | { type: 'EQUIP_ITEM'; itemType: ItemType; targetUnitId: number }
  | { type: 'SELECT_UNIT'; unitId: number | null }
  | { type: 'NEW_GAME' };

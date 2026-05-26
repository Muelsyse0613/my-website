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
  ContractSelection,
  Preparation,
  Battle,
  Settlement,
}

export const enum ItemType {
  IronSword,
  ChainMail,
  Bow,
  BlueCrystal,
  GiantBelt,
  MysticOrb,
  BloodCharm,
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
  ManaGainMultiplier,
  LifeSteal,
  CritChance,
  ShieldOnStart,
}

export type SkillType =
  | 'Stun'
  | 'LineAOE'
  | 'HealAura'
  | 'Fireball'
  | 'ChainLightning'
  | 'ShieldWall'
  | 'Execute'
  | 'ManaBurn'
  | 'PoisonNova'
  | 'DashStrike';

export type ContractCategory = 'enemy' | 'player' | 'rule' | 'economy';

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
  skillType: SkillType;
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
  baseMaxMana: number;
  baseRange: number;
  baseAttackSpeed: number;
  baseMoveSpeed: number;
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
  shield: number;
  isShopUnit: boolean;
  removedFromGame: boolean;
}

// ===== Skill =====
export interface Skill {
  type: SkillType;
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
    { requiredCount: 6, type: TraitBonusType.HpPercent, value: 0.25 },
  ],
  法师: [
    { requiredCount: 2, type: TraitBonusType.AtkPercent, value: 0.12 },
    { requiredCount: 4, type: TraitBonusType.MagicRes, value: 20 },
    { requiredCount: 6, type: TraitBonusType.AtkPercent, value: 0.25 },
  ],
  神盾: [
    { requiredCount: 2, type: TraitBonusType.Armor, value: 10 },
    { requiredCount: 4, type: TraitBonusType.HpPercent, value: 0.1 },
    { requiredCount: 6, type: TraitBonusType.Armor, value: 25 },
  ],
  神盾使: [
    { requiredCount: 2, type: TraitBonusType.Armor, value: 10 },
    { requiredCount: 4, type: TraitBonusType.HpPercent, value: 0.12 },
  ],
  枪手: [
    { requiredCount: 2, type: TraitBonusType.AtkFlat, value: 10 },
    { requiredCount: 4, type: TraitBonusType.AtkPercent, value: 0.15 },
    { requiredCount: 6, type: TraitBonusType.AtkFlat, value: 25 },
  ],
  狙神: [
    { requiredCount: 2, type: TraitBonusType.AtkFlat, value: 12 },
    { requiredCount: 4, type: TraitBonusType.AtkPercent, value: 0.22 },
  ],
  斗士: [
    { requiredCount: 2, type: TraitBonusType.HpPercent, value: 0.15 },
    { requiredCount: 4, type: TraitBonusType.HpPercent, value: 0.4 },
    { requiredCount: 6, type: TraitBonusType.HpFlat, value: 300 },
  ],
  刺客: [
    { requiredCount: 2, type: TraitBonusType.AtkPercent, value: 0.12 },
    { requiredCount: 4, type: TraitBonusType.AtkPercent, value: 0.25 },
  ],
  神谕: [
    { requiredCount: 2, type: TraitBonusType.MagicRes, value: 10 },
    { requiredCount: 4, type: TraitBonusType.MagicRes, value: 28 },
  ],
  秘术: [
    { requiredCount: 2, type: TraitBonusType.MagicRes, value: 18 },
    { requiredCount: 4, type: TraitBonusType.MagicRes, value: 42 },
  ],
  先锋: [
    { requiredCount: 2, type: TraitBonusType.Armor, value: 18 },
    { requiredCount: 4, type: TraitBonusType.Armor, value: 42 },
  ],
};

export const TRAIT_MECHANICS: Record<string, TraitMechanicDef[]> = {
  法师: [
    { requiredCount: 3, mechanic: TraitMechanic.SkillDamageMultiplier, value: 1.55 },
    { requiredCount: 5, mechanic: TraitMechanic.SkillDamageMultiplier, value: 2.1 },
  ],
  狙神: [
    { requiredCount: 2, mechanic: TraitMechanic.DoubleAttackChance, value: 0.25 },
    { requiredCount: 4, mechanic: TraitMechanic.DoubleAttackChance, value: 0.5 },
  ],
  枪手: [
    { requiredCount: 4, mechanic: TraitMechanic.DoubleAttackChance, value: 0.25 },
  ],
  神谕: [
    { requiredCount: 2, mechanic: TraitMechanic.ManaGainMultiplier, value: 1.25 },
    { requiredCount: 4, mechanic: TraitMechanic.ManaGainMultiplier, value: 1.65 },
  ],
  刺客: [
    { requiredCount: 2, mechanic: TraitMechanic.CritChance, value: 0.2 },
    { requiredCount: 4, mechanic: TraitMechanic.CritChance, value: 0.38 },
  ],
  斗士: [
    { requiredCount: 4, mechanic: TraitMechanic.LifeSteal, value: 0.12 },
  ],
  神盾: [
    { requiredCount: 2, mechanic: TraitMechanic.ShieldOnStart, value: 80 },
    { requiredCount: 4, mechanic: TraitMechanic.ShieldOnStart, value: 180 },
  ],
  神盾使: [
    { requiredCount: 2, mechanic: TraitMechanic.ShieldOnStart, value: 80 },
    { requiredCount: 4, mechanic: TraitMechanic.ShieldOnStart, value: 180 },
  ],
};

export const TRAIT_NAMES_CN: Record<string, string> = {
  神盾使: '神盾使',
  神谕: '神谕',
  法师: '法师',
  战士: '战士',
  枪手: '枪手',
  狙神: '狙神',
  斗士: '斗士',
  刺客: '刺客',
  秘术: '秘术',
  先锋: '先锋',
};

// ===== Contract System =====
export interface ContractModifiers {
  enemyHpMultiplier: number;
  enemyAtkMultiplier: number;
  enemyArmorBonus: number;
  enemyMagicResBonus: number;
  enemyAttackSpeedMultiplier: number;
  enemyStartingManaBonus: number;
  enemyCountBonus: number;
  playerHpMultiplier: number;
  playerAtkMultiplier: number;
  playerArmorPenalty: number;
  playerManaCostMultiplier: number;
  deploymentLimitPenalty: number;
  interestDisabled: boolean;
  itemDropMultiplier: number;
  refreshCostBonus: number;
  interestCapReduction: number;
  buyCostBonus: number;
  sellPriceMultiplier: number;
}

export interface ContractTag {
  id: string;
  name: string;
  description: string;
  risk: number;
  category: ContractCategory;
  exclusiveGroup?: string;
  modifiers: Partial<ContractModifiers>;
}

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
  type: 'lineAoe' | 'healAura' | 'explosion' | 'shield' | 'chain' | 'poison' | 'slash';
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
  maxRound: number;
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
  combatTickAcc: number;
  settlementResolved: boolean;
  winStreak: number;
  loseStreak: number;
  lastBattleSurvivors: number;
  selectedContracts: string[];
  contractLocked: boolean;
  bestRisk: number;
  currentRisk: number;
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
  | { type: 'UNEQUIP_ITEM'; unitId: number; itemIndex: number }
  | { type: 'TOGGLE_CONTRACT'; contractId: string }
  | { type: 'CLEAR_CONTRACTS' }
  | { type: 'CONFIRM_CONTRACTS' }
  | { type: 'SELECT_UNIT'; unitId: number | null }
  | { type: 'NEW_GAME' };

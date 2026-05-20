'use client';

import {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import Link from 'next/link';
import type { GameState, HeroTemplate } from './types';
import {
  GamePhase,
  Owner,
  UnitState,
} from './types';
import {
  gameReducer,
  getInitialState,
  getUpgradeCost,
  getUnitSellPrice,
} from './game-logic';
import {
  renderAll,
  preloadSprite,
  preloadItemIcons,
  canvasToGrid,
  canvasToBenchSlot,
  canvasToShopSlot,
  canvasToEquipSlot,
} from './hex-renderer';
import { BattleLoop } from './battle-loop';
import './auto-chess.css';

let heroPoolCache: HeroTemplate[] | null = null;

async function loadHeroPool(): Promise<HeroTemplate[]> {
  if (heroPoolCache) return heroPoolCache;
  const res = await fetch('/auto-chess/heroes.json');
  heroPoolCache = await res.json();
  return heroPoolCache!;
}

function Game({ heroPool }: { heroPool: HeroTemplate[] }) {
  const [state, dispatch] = useReducer(
    (s: GameState, a: Parameters<typeof gameReducer>[1]) =>
      gameReducer(s, a, heroPool),
    heroPool,
    (pool) => getInitialState(pool)
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const battleLoopRef = useRef<BattleLoop | null>(null);
  const stateRef = useRef<GameState>(state);

  useEffect(() => {
    stateRef.current = state;
  });

  // Preload sprites
  useEffect(() => {
    for (const u of state.units) {
      const tpl = heroPool.find((h) => h.name === u.name);
      if (tpl) preloadSprite(tpl.sprite, tpl.name);
    }
    for (const u of state.shopUnits) {
      if (u) {
        const tpl = heroPool.find((h) => h.name === u.name);
        if (tpl) preloadSprite(tpl.sprite, tpl.name);
      }
    }
    preloadItemIcons();
  }, [heroPool]);

  // Battle loop management
  useEffect(() => {
    if (state.phase === GamePhase.Battle && !battleLoopRef.current) {
      const loop = new BattleLoop(dispatch, () => stateRef.current);
      battleLoopRef.current = loop;
      loop.start();
    }
    if (state.phase !== GamePhase.Battle && battleLoopRef.current) {
      battleLoopRef.current.stop();
      battleLoopRef.current = null;
    }
    if (state.phase === GamePhase.Settlement && !state.gameOver) {
      const timer = setTimeout(() => dispatch({ type: 'END_BATTLE' }), 1200);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [state.phase, state.gameOver]);

  // Canvas rendering
  const [displaySize, setDisplaySize] = useState({ width: 880, height: 680 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rawWidth = Math.floor(el.getBoundingClientRect().width || window.innerWidth);
      const isMobile = rawWidth < 700 || window.innerWidth < 700;
      const width = isMobile
        ? Math.max(300, Math.min(rawWidth, window.innerWidth - 16))
        : Math.min(880, Math.max(600, rawWidth));
      const height = isMobile
        ? Math.round(Math.min(560, Math.max(430, width * 1.28)))
        : 680;

      setDisplaySize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(el);
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    renderAll(ctx, state, displaySize.width, displaySize.height);
  }, [state, displaySize]);

  // Mouse handlers
  const handlePointerDown = useCallback(
    (cx: number, cy: number) => {
      const s = stateRef.current;
      if (!s) return;

      if (s.phase !== GamePhase.Preparation) {
        // Click to select unit for info
        const benchIdx = canvasToBenchSlot(cx, cy);
        if (benchIdx >= 0 && s.bench[benchIdx]) {
          dispatch({ type: 'SELECT_UNIT', unitId: s.bench[benchIdx]!.id });
          return;
        }
        const gridPos = canvasToGrid(cx, cy);
        if (gridPos) {
          const u = s.board.getUnitAt(gridPos);
          if (u && u.state !== UnitState.Dead) {
            dispatch({ type: 'SELECT_UNIT', unitId: u.id });
            return;
          }
        }
        dispatch({ type: 'SELECT_UNIT', unitId: null });
        return;
      }

      // Preparation phase: check shop first, then equip, then drag start
      const shopIdx = canvasToShopSlot(cx, cy);
      if (shopIdx >= 0 && s.shopUnits[shopIdx]) {
        dispatch({ type: 'BUY_UNIT', shopIndex: shopIdx });
        return;
      }

      const equipIdx = canvasToEquipSlot(cx, cy);
      if (equipIdx >= 0 && equipIdx < s.equipmentInventory.length && s.selectedUnitId !== null) {
        dispatch({ type: 'EQUIP_ITEM', itemType: s.equipmentInventory[equipIdx].type, targetUnitId: s.selectedUnitId });
        return;
      }

      // Bench units — select or drag
      const benchIdx2 = canvasToBenchSlot(cx, cy);
      if (benchIdx2 >= 0 && s.bench[benchIdx2]) {
        const u = s.bench[benchIdx2]!;
        if (u.owner === Owner.PlayerCtrl) {
          dispatch({ type: 'DRAG_START', unitId: u.id, sourceGrid: null, sourceBenchSlot: benchIdx2, mousePos: { x: cx, y: cy } });
        } else {
          dispatch({ type: 'SELECT_UNIT', unitId: u.id });
        }
        return;
      }

      // Board units — drag or select
      const gridPos2 = canvasToGrid(cx, cy);
      if (gridPos2) {
        const u = s.board.getUnitAt(gridPos2);
        if (u && u.state !== UnitState.Dead) {
          if (u.owner === Owner.PlayerCtrl) {
            dispatch({ type: 'DRAG_START', unitId: u.id, sourceGrid: gridPos2, sourceBenchSlot: null, mousePos: { x: cx, y: cy } });
          } else {
            dispatch({ type: 'SELECT_UNIT', unitId: u.id });
          }
          return;
        }
      }

      // Click on empty area
      dispatch({ type: 'SELECT_UNIT', unitId: null });
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      handlePointerDown(e.clientX - rect.left, e.clientY - rect.top);
    },
    [handlePointerDown]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!stateRef.current?.dragging) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      dispatch({ type: 'DRAG_MOVE', mousePos: { x: e.clientX - rect.left, y: e.clientY - rect.top } });
    },
    []
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!stateRef.current?.dragging) return;
      const s = stateRef.current;
      const mp = s.dragMousePos;
      if (!mp) return;
      dispatch({
        type: 'DRAG_DROP',
        mousePos: mp,
        gridTarget: canvasToGrid(mp.x, mp.y),
        benchTarget: canvasToBenchSlot(mp.x, mp.y),
      });
    },
    []
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      handlePointerDown(touch.clientX - rect.left, touch.clientY - rect.top);
    },
    [handlePointerDown]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!stateRef.current?.dragging) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      dispatch({ type: 'DRAG_MOVE', mousePos: { x: touch.clientX - rect.left, y: touch.clientY - rect.top } });
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!stateRef.current?.dragging) return;
      const s = stateRef.current;
      const mp = s.dragMousePos;
      if (!mp) return;
      dispatch({
        type: 'DRAG_DROP',
        mousePos: mp,
        gridTarget: canvasToGrid(mp.x, mp.y),
        benchTarget: canvasToBenchSlot(mp.x, mp.y),
      });
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (s.phase === GamePhase.Preparation) {
          dispatch({ type: 'START_BATTLE' });
        } else if (s.phase === GamePhase.Settlement && !s.gameOver) {
          dispatch({ type: 'NEXT_ROUND' });
        } else if (s.phase === GamePhase.Settlement && s.gameOver) {
          dispatch({ type: 'NEW_GAME' });
        }
      }
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'REFRESH_SHOP' });
      if (e.key === 'p' || e.key === 'P') dispatch({ type: 'UPGRADE_POPULATION' });
      if (e.key === 'Escape') {
        dispatch({ type: 'DRAG_CANCEL' });
        dispatch({ type: 'SELECT_UNIT', unitId: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedUnit =
    state.selectedUnitId
      ? state.units.find((u) => u.id === state.selectedUnitId)
      : null;

  return (
    <div className="auto-chess-shell">
      {/* Top Bar */}
      <div className="auto-chess-topbar">
        <Link href="/" className="auto-chess-back-link">
          ← 返回
        </Link>
        <div className="auto-chess-stats">
          <span className="auto-chess-stat auto-chess-stat-hp">❤ {state.playerHP}</span>
          <span className="auto-chess-stat auto-chess-stat-gold">💰 {state.gold}</span>
          <span className="auto-chess-stat auto-chess-stat-pop">
            👥 {state.units.filter((u) => u.owner === Owner.PlayerCtrl && u.state !== UnitState.Dead && state.board.containsUnit(u)).length}/{state.populationCap}
          </span>
        </div>
        <div className="auto-chess-round-badge">
          {state.phase === GamePhase.Preparation && `第 ${state.round} 轮 · 准备`}
          {state.phase === GamePhase.Battle && `第 ${state.round} 轮 · 战斗中`}
          {state.phase === GamePhase.Settlement && (state.victory ? `第 ${state.round} 轮 · 胜利！` : `第 ${state.round} 轮 · 失败`)}
        </div>
      </div>

      {/* Main Layout */}
      <div className="auto-chess-layout">
        <div className="auto-chess-bench-col">
          <span className="auto-chess-bench-col-label">备战席</span>
        </div>

        <div className="auto-chess-board-col" ref={containerRef} style={{ position: 'relative' }}>
          <div className="auto-chess-canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="auto-chess-canvas"
              width={displaySize.width}
              height={displaySize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Game Over Overlay */}
          {state.gameOver && (
            <div className="auto-chess-game-over">
              <div className="auto-chess-game-over-content">
                <h2 className={state.victory ? 'auto-chess-victory' : 'auto-chess-defeat'}>
                  {state.victory ? '🏆 Victory!' : '💀 Game Over'}
                </h2>
                <p>{state.statusMessage}</p>
                <button className="auto-chess-btn auto-chess-btn-primary" onClick={() => dispatch({ type: 'NEW_GAME' })}>
                  再来一局
                </button>
              </div>
            </div>
          )}

          {/* Unit Info Panel */}
          {selectedUnit && !state.gameOver && (
            <div
              className="auto-chess-info-panel"
              style={
                displaySize.width < 700
                  ? { left: 12, right: 12, top: 72 }
                  : { left: Math.min(displaySize.width - 220, 480), top: 80 }
              }
            >
              <h4>
                {selectedUnit.name}{' '}
                <span style={{ color: '#ffd700', fontSize: 14 }}>
                  {'★'.repeat(selectedUnit.starLevel)}
                </span>
              </h4>
              <div className="stat-row">
                <span>❤ HP: {selectedUnit.hp}/{selectedUnit.maxHp}</span>
                <span>⚔ ATK: {selectedUnit.atk}</span>
              </div>
              <div className="stat-row">
                <span>🛡 Armor: {selectedUnit.armor}</span>
                <span>✨ MR: {selectedUnit.magicRes}</span>
              </div>
              <div className="stat-row">
                <span>🔵 Mana: {selectedUnit.mana}/{selectedUnit.maxMana}</span>
                <span>🎯 Range: {selectedUnit.range}</span>
              </div>
              <div className="traits-row">
                {[...selectedUnit.traits].map((t) => (
                  <span key={t} className="auto-chess-trait-tag">{t}</span>
                ))}
              </div>
              {selectedUnit.items.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>装备: </span>
                  {selectedUnit.items.map((it) => (
                    <span key={it.type} className="auto-chess-trait-tag" style={{ color: '#ffd700', borderColor: 'rgba(255,215,0,0.3)' }}>
                      {it.name}
                    </span>
                  ))}
                </div>
              )}
              {selectedUnit.owner === Owner.PlayerCtrl && (
                <button
                  className="auto-chess-btn auto-chess-btn-danger"
                  style={{ marginTop: 10, fontSize: 11, padding: '4px 12px' }}
                  onClick={() => dispatch({ type: 'SELL_UNIT', unitId: selectedUnit.id })}
                >
                  出售 (${getUnitSellPrice(selectedUnit)})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="auto-chess-side-col">
          {state.phase === GamePhase.Preparation && (
            <div className="auto-chess-glass auto-chess-shop-panel">
              <h5>商店</h5>
              {state.shopUnits.map((unit, i) => (
                <div key={unit ? unit.id : `empty-${i}`} className="auto-chess-shop-row">
                  {unit ? (
                    <>
                      <span className="auto-chess-shop-name">{unit.name}</span>
                      <button
                        className="auto-chess-btn auto-chess-shop-buy"
                        disabled={state.gold < unit.price}
                        onClick={() => dispatch({ type: 'BUY_UNIT', shopIndex: i })}
                      >
                        ${unit.price}
                      </button>
                    </>
                  ) : (
                    <span className="auto-chess-shop-empty">已购买</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {state.phase === GamePhase.Preparation && (
            <div className="auto-chess-glass auto-chess-trait-panel">
              <h5>羁绊</h5>
              {(() => {
                const entries = [...state.traitCounts.entries()].sort(([, a], [, b]) => b - a);
                if (entries.length === 0) return <div className="auto-chess-trait-row" style={{ color: 'rgba(255,255,255,0.3)' }}>暂无激活羁绊</div>;
                return entries.map(([name, count]) => (
                  <div key={name} className={`auto-chess-trait-row ${count >= 2 ? 'active' : ''}`}>
                    <span>{name}</span>
                    <span>{count}</span>
                  </div>
                ));
              })()}
            </div>
          )}

          {state.phase === GamePhase.Preparation && state.equipmentInventory.length > 0 && (
            <div className="auto-chess-glass auto-chess-equipment-panel">
              <h5>装备栏</h5>
              {state.equipmentInventory.map((item, idx) => (
                <button
                  key={`${item.type}-${idx}`}
                  className="auto-chess-equipment-row"
                  disabled={selectedUnit === null}
                  onClick={() => {
                    if (selectedUnit) {
                      dispatch({ type: 'EQUIP_ITEM', itemType: item.type, targetUnitId: selectedUnit.id });
                    }
                  }}
                >
                  <span>{item.name}</span>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="auto-chess-bottom-bar">
        {state.phase === GamePhase.Preparation && (
          <>
            <button className="auto-chess-btn" onClick={() => dispatch({ type: 'REFRESH_SHOP' })} disabled={state.gold < 2}>
              🔄 刷新商店 ($2)
            </button>
            <button className="auto-chess-btn" onClick={() => dispatch({ type: 'UPGRADE_POPULATION' })} disabled={state.gold < getUpgradeCost(state.populationLevel)}>
              ⬆ 升级人口 (${getUpgradeCost(state.populationLevel)})
            </button>
            <button className="auto-chess-btn auto-chess-btn-primary" onClick={() => dispatch({ type: 'START_BATTLE' })}>
              ⚔ 开始战斗 (空格)
            </button>
          </>
        )}
        {state.phase === GamePhase.Settlement && !state.gameOver && (
          <button className="auto-chess-btn auto-chess-btn-primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
            ➡ 下一回合 (空格)
          </button>
        )}
        {state.gameOver && (
          <button className="auto-chess-btn auto-chess-btn-primary" onClick={() => dispatch({ type: 'NEW_GAME' })}>
            🔄 再来一局
          </button>
        )}
      </div>

      {!state.gameOver && (
        <div className="auto-chess-status">
          <div className="auto-chess-status-text">{state.statusMessage}</div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, padding: '0 0 16px' }}>
        拖拽单位布阵 | 空格开始战斗 | R 刷新商店 | P 升级人口 | 点击单位查看详情 + 出售
      </div>
    </div>
  );
}

export default function AutoChessPage() {
  const [heroPool, setHeroPool] = useState<HeroTemplate[] | null>(null);

  useEffect(() => {
    loadHeroPool().then(setHeroPool);
  }, []);

  if (!heroPool) {
    return (
      <div className="auto-chess-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return <Game heroPool={heroPool} />;
}

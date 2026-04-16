'use client';

import { useEffect, useRef, useState } from 'react';

export default function SplashScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'init' | 'animate' | 'done'>('init');

  useEffect(() => {
    if (sessionStorage.getItem('splash_played')) {
      setPhase('done');
      return;
    }

    setPhase('animate');

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = Math.round(vw * dpr);
    const H = Math.round(vh * dpr);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // ===== 颜色 =====
    // 主粒子（汇聚成字的）：蓝紫色系
    const MAIN_COLORS: [number, number, number][] = [
      [147, 197, 253], // 淡蓝
      [165, 180, 252], // 蓝紫
      [196, 181, 253], // 淡紫
      [186, 193, 252], // 蓝紫过渡
    ];
    // 背景粒子：低饱和度的柔和色彩
    const BG_COLORS: [number, number, number][] = [
      [186, 220, 248], // 雾蓝
      [210, 195, 240], // 薰衣草
      [248, 200, 210], // 玫瑰粉
      [200, 230, 215], // 薄荷绿
      [240, 215, 185], // 暖杏
      [215, 210, 235], // 灰紫
      [195, 225, 235], // 天青
      [235, 200, 220], // 樱花
    ];

    // ===== 采样文字像素 =====
    const FONT_SIZE = 36;
    const canvasFontPx = FONT_SIZE * dpr;
    const fontStr = `bold ${canvasFontPx}px Arial, Helvetica, sans-serif`;

    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.font = fontStr;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#000';
    try { (offCtx as any).letterSpacing = `${canvasFontPx * 0.05}px`; } catch {}
    offCtx.fillText('我的个人宇宙', W / 2, H / 2);

    const imgData = offCtx.getImageData(0, 0, W, H).data;
    const targets: { x: number; y: number }[] = [];
    const sampleStep = Math.max(3, Math.round(canvasFontPx / 10));
    for (let y = 0; y < H; y += sampleStep) {
      for (let x = 0; x < W; x += sampleStep) {
        if (imgData[(y * W + x) * 4 + 3] > 128) {
          targets.push({ x, y });
        }
      }
    }

    // ===== 主粒子：一开始就散布在屏幕上，后续飞去组字 =====
    const MAIN_COUNT = Math.min(targets.length, 450);
    const pStep = Math.max(1, Math.floor(targets.length / MAIN_COUNT));

    const mainParticles = Array.from({ length: MAIN_COUNT }, (_, i) => {
      const t = targets[Math.min(i * pStep, targets.length - 1)];
      return {
        // 初始位置：随机散布在屏幕各处
        sx: Math.random() * W,
        sy: Math.random() * H,
        // 目标位置：文字轮廓上的点
        tx: t.x,
        ty: t.y,
        r: (Math.random() * 1.5 + 1) * dpr,
        color: MAIN_COLORS[Math.floor(Math.random() * MAIN_COLORS.length)],
        alpha: Math.random() * 0.3 + 0.55,
        // 初始阶段的轻微漂浮速度
        vx: (Math.random() - 0.5) * 0.4 * dpr,
        vy: (Math.random() - 0.5) * 0.3 * dpr,
      };
    });

    // ===== 背景粒子：始终自由飘浮，不参与汇聚 =====
    const BG_COUNT = 550;
    const bgParticles = Array.from({ length: BG_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5 * dpr,
      vy: (Math.random() - 0.5) * 0.4 * dpr,
      r: (Math.random() * 1.5 + 1) * dpr,
      color: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)],
      alpha: Math.random() * 0.38 + 0.22,
    }));

    // ===== 测量 header 标题位置 =====
    const headerEl = document.getElementById('header-title');
    let targetCSSY = vh * 0.22;
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      targetCSSY = rect.top + rect.height / 2;
    }
    const canvasOffsetY = (targetCSSY - vh / 2) * dpr;

    const domTitle = document.getElementById('splash-title');
    const domSub = document.getElementById('splash-sub');

    // ===== 时间轴 =====
    const T_DRIFT    = 400;  // 0→400ms：所有粒子自由飘浮，营造初始氛围
    const T_CONVERGE = 1600; // 400→1600ms：主粒子开始汇聚成字
    const T_HOLD     = 2100; // 1600→2100ms：停留
    const T_MOVE     = 2900; // 2100→2900ms：文字上移 + 交叉淡入
    const T_FADE     = 3300; // 2900→3300ms：遮罩淡出

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    let startTime = 0;
    let frameId = 0;
    const ov = overlay;

    function render(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, W, H);

      // ===== 汇聚进度（T_DRIFT 之后才开始） =====
      let converge = 0;
      if (elapsed > T_DRIFT && elapsed < T_CONVERGE) {
        converge = easeInOutCubic((elapsed - T_DRIFT) / (T_CONVERGE - T_DRIFT));
      } else if (elapsed >= T_CONVERGE) {
        converge = 1;
      }

      // ===== 上移进度 =====
      let moveP = 0;
      if (elapsed > T_HOLD && elapsed < T_MOVE) {
        moveP = easeInOutCubic((elapsed - T_HOLD) / (T_MOVE - T_HOLD));
      } else if (elapsed >= T_MOVE) {
        moveP = 1;
      }

      const particleFade = 1 - moveP;
      const currentOffsetY = canvasOffsetY * moveP;

      // ===== 遮罩淡出系数 =====
      const fadeFactor = elapsed > T_MOVE
        ? Math.max(0, 1 - (elapsed - T_MOVE) / (T_FADE - T_MOVE))
        : 1;

      // ===== 绘制背景粒子 =====
      bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const [cr, cg, cb] = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.alpha * fadeFactor})`;
        ctx.fill();
      });

      // ===== 绘制主粒子 =====
      mainParticles.forEach(p => {
        // 汇聚前：在初始位置附近轻微漂浮
        // 汇聚中/后：从初始位置飞向目标位置
        let px: number, py: number;

        if (elapsed <= T_DRIFT) {
          // 自由漂浮阶段
          p.sx += p.vx;
          p.sy += p.vy;
          if (p.sx < 0 || p.sx > W) p.vx *= -1;
          if (p.sy < 0 || p.sy > H) p.vy *= -1;
          px = p.sx;
          py = p.sy;
        } else {
          // 汇聚阶段：从当前位置插值到目标
          px = p.sx + (p.tx - p.sx) * converge;
          py = p.sy + (p.ty - p.sy) * converge + currentOffsetY;
        }

        const [cr, cg, cb] = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.alpha * particleFade * fadeFactor})`;
        ctx.fill();
      });

      // ===== 同步 DOM 标题 =====
      if (domTitle) {
        const startPct = 50;
        const endPct = (targetCSSY / vh) * 100;
        const currentPct = startPct + (endPct - startPct) * moveP;
        domTitle.style.top = `${currentPct}%`;
        domTitle.style.opacity = `${moveP}`;
      }

      // ===== 副标题延迟淡入 =====
      if (domSub) {
        const subDelay = 0.3;
        const subP = Math.max(0, Math.min(1, (moveP - subDelay) / (1 - subDelay)));
        const startPct = 50;
        const endPct = (targetCSSY / vh) * 100;
        const titlePct = startPct + (endPct - startPct) * moveP;
        domSub.style.top = `${titlePct + (36 / vh) * 100}%`;
        domSub.style.opacity = `${subP}`;
      }

      // ===== 遮罩淡出 =====
      if (elapsed > T_MOVE && elapsed < T_FADE) {
        ov.style.opacity = `${fadeFactor}`;
      } else if (elapsed >= T_FADE) {
        ov.style.opacity = '0';
        cancelAnimationFrame(frameId);
        sessionStorage.setItem('splash_played', '1');
        setTimeout(() => setPhase('done'), 50);
        return;
      }

      frameId = requestAnimationFrame(render);
    }

    const delay = setTimeout(() => {
      frameId = requestAnimationFrame(render);
    }, 50);

    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frameId);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(to right, #dbeafe, #f3e8ff)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <div
        id="splash-title"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#1f2937',
          letterSpacing: '0.05em',
          opacity: 0,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        我的个人宇宙
      </div>

      <div
        id="splash-sub"
        style={{
          position: 'absolute',
          left: '50%',
          top: '55%',
          transform: 'translate(-50%, -50%)',
          fontSize: '16px',
          color: '#4b5563',
          opacity: 0,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        生活、学习与碎碎念
      </div>
    </div>
  );
}


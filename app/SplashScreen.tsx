'use client';

import { useEffect, useState } from 'react';

type SplashPhase = 'animate' | 'done';

const SPLASH_STORAGE_KEY = 'splash_played_v5';
const SPLASH_DURATION = 3600;

const PRECHECK_SCRIPT = `
  try {
    if (window.sessionStorage && window.sessionStorage.getItem('${SPLASH_STORAGE_KEY}')) {
      var style = document.createElement('style');
      style.setAttribute('data-hsy-splash-prehide', 'true');
      style.textContent = '#hsy-splash-root{display:none!important}';
      document.head.appendChild(style);
    }
  } catch (error) {}
`;

const SPLASH_STYLE = `
  .splash-shell {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: hidden;
    color: #172033;
    background:
      radial-gradient(circle at 18% 18%, rgba(90, 167, 255, 0.24), transparent 34%),
      radial-gradient(circle at 82% 14%, rgba(167, 139, 250, 0.20), transparent 32%),
      radial-gradient(circle at 50% 82%, rgba(45, 212, 191, 0.13), transparent 36%),
      linear-gradient(135deg, #fbfcff 0%, #edf6ff 46%, #f5f0ff 100%);
    animation: splashExit 3400ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .splash-shell::before {
    content: "";
    position: absolute;
    inset: -22%;
    background:
      radial-gradient(circle at 22% 24%, rgba(90, 167, 255, 0.17), transparent 28%),
      radial-gradient(circle at 78% 16%, rgba(167, 139, 250, 0.16), transparent 30%),
      radial-gradient(circle at 44% 78%, rgba(251, 113, 133, 0.08), transparent 34%);
    filter: blur(42px);
    animation: splashNebula 3400ms ease-in-out forwards;
  }

  .splash-shell::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.48;
    background-image:
      linear-gradient(rgba(23, 32, 51, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 32, 51, 0.035) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(circle at center, black 0%, transparent 74%);
    animation: splashGrid 3400ms ease forwards;
  }

  .splash-noise {
    position: absolute;
    inset: 0;
    opacity: 0.075;
    mix-blend-mode: overlay;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .splash-center {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }

  .splash-panel {
    position: relative;
    width: min(42rem, 100%);
    overflow: hidden;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.68);
    background: rgba(255, 255, 255, 0.42);
    box-shadow:
      0 28px 90px rgba(31, 41, 55, 0.10),
      inset 0 1px 0 rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(24px);
    animation: splashPanelIn 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .splash-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(90, 167, 255, 0.12), transparent 34%, transparent 68%, rgba(167, 139, 250, 0.10)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.58), transparent 42%);
  }

  .splash-scan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(90, 167, 255, 0.24), transparent);
    width: 36%;
    transform: skewX(-18deg) translateX(-150%);
    animation: splashScan 1550ms ease 430ms both;
  }

  .splash-inner {
    position: relative;
    z-index: 1;
    padding: 1.35rem;
  }

  @media (min-width: 640px) {
    .splash-inner {
      padding: 1.75rem;
    }
  }

  .splash-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .splash-status {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: #64748b;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .splash-dot {
    width: 0.58rem;
    height: 0.58rem;
    border-radius: 999px;
    background: #2dd4bf;
    box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.12), 0 0 18px rgba(45, 212, 191, 0.58);
    animation: splashDotPulse 820ms ease-in-out infinite;
  }

  .splash-version {
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(255, 255, 255, 0.56);
    color: #94a3b8;
    border-radius: 999px;
    padding: 0.32rem 0.58rem;
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .splash-body {
    position: relative;
    display: grid;
    gap: 1.2rem;
    padding-top: 1.35rem;
  }

  @media (min-width: 768px) {
    .splash-body {
      grid-template-columns: 1fr 12rem;
      align-items: center;
    }
  }

  .splash-terminal {
    min-width: 0;
    font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: #475569;
    font-size: 0.88rem;
    font-weight: 700;
    line-height: 1.85;
  }

  @media (min-width: 640px) {
    .splash-terminal {
      font-size: 1rem;
      line-height: 1.95;
    }
  }

  .splash-line {
    display: block;
    min-height: 1.75em;
    white-space: nowrap;
  }

  .splash-prefix {
    color: #94a3b8;
    user-select: none;
  }

  .splash-type {
    display: inline-block;
    max-width: 0;
    overflow: hidden;
    vertical-align: bottom;
    white-space: nowrap;
  }

  .splash-line-1 .splash-type {
    animation: splashType 340ms steps(20, end) 160ms forwards;
  }

  .splash-line-2 .splash-type {
    animation: splashType 440ms steps(26, end) 560ms forwards;
  }

  .splash-line-3 .splash-type {
    color: #0369a1;
    animation: splashType 260ms steps(15, end) 1280ms forwards;
  }

  .splash-line-4 .splash-type {
    color: #7e22ce;
    animation: splashType 280ms steps(16, end) 1660ms forwards;
  }

  .splash-line-3,
  .splash-line-4 {
    opacity: 0;
    animation: splashLineIn 160ms ease forwards;
  }

  .splash-line-3 {
    animation-delay: 1220ms;
  }

  .splash-line-4 {
    animation-delay: 1600ms;
  }

  .splash-cursor {
    display: inline-block;
    width: 0.55em;
    height: 1.05em;
    margin-left: 0.08em;
    border-radius: 0.14em;
    transform: translateY(0.16em);
    background: #38bdf8;
    box-shadow: 0 0 14px rgba(56, 189, 248, 0.75);
    animation:
      splashCursorBlink 620ms steps(2, start) infinite,
      splashCursorOut 160ms ease 1220ms forwards;
  }

  .splash-map {
    position: relative;
    height: 11.5rem;
    min-height: 11.5rem;
    overflow: hidden;
    border-radius: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.56);
    background:
      radial-gradient(circle at 48% 46%, rgba(90, 167, 255, 0.11), transparent 36%),
      radial-gradient(circle at 70% 28%, rgba(167, 139, 250, 0.09), transparent 34%),
      rgba(255, 255, 255, 0.30);
  }

  .splash-map svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .splash-orbit {
    fill: none;
    stroke: rgba(90, 167, 255, 0.26);
    stroke-width: 1;
    stroke-dasharray: 320;
    stroke-dashoffset: 320;
    vector-effect: non-scaling-stroke;
    animation: splashOrbit 820ms ease 480ms forwards;
  }

  .splash-link {
    stroke: rgba(90, 167, 255, 0.28);
    stroke-width: 1.05;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    opacity: 0;
    animation: splashLinkIn 520ms ease forwards;
  }

  .splash-link:nth-of-type(3) { animation-delay: 760ms; }
  .splash-link:nth-of-type(4) { animation-delay: 860ms; }
  .splash-link:nth-of-type(5) { animation-delay: 960ms; }
  .splash-link:nth-of-type(6) { animation-delay: 1060ms; }
  .splash-link:nth-of-type(7) { animation-delay: 1160ms; }

  .splash-pulse-ring {
    fill: none;
    stroke: rgba(167, 139, 250, 0.18);
    stroke-width: 1;
    opacity: 0;
    transform-origin: center;
    vector-effect: non-scaling-stroke;
    animation: splashPulseRing 1200ms ease 1120ms forwards;
  }

  .splash-node {
    fill: rgba(90, 167, 255, 0.72);
    opacity: 0;
    transform-origin: center;
    animation: splashNode 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .splash-node-core {
    fill: rgba(167, 139, 250, 0.72);
  }

  .splash-node:nth-of-type(1) { animation-delay: 540ms; }
  .splash-node:nth-of-type(2) { animation-delay: 660ms; }
  .splash-node:nth-of-type(3) { animation-delay: 780ms; }
  .splash-node:nth-of-type(4) { animation-delay: 900ms; }
  .splash-node:nth-of-type(5) { animation-delay: 1020ms; }
  .splash-node:nth-of-type(6) { animation-delay: 1140ms; }

  .splash-progress {
    height: 0.25rem;
    margin-top: 1.35rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.06);
  }

  .splash-progress span {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #93c5fd, #c4b5fd, #5eead4);
    box-shadow: 0 0 18px rgba(90, 167, 255, 0.35);
    transform: translateX(-100%);
    animation: splashProgress 2350ms cubic-bezier(0.22, 1, 0.36, 1) 220ms forwards;
  }

  .splash-foot {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    color: #94a3b8;
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  @keyframes splashExit {
    0%, 80% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes splashNebula {
    from { transform: translate3d(-1.5%, -1%, 0) scale(1); }
    to { transform: translate3d(1.5%, 1%, 0) scale(1.04); }
  }

  @keyframes splashGrid {
    0% { opacity: 0; transform: scale(1.02); }
    22%, 80% { opacity: 0.48; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.015); }
  }

  @keyframes splashPanelIn {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes splashScan {
    from { transform: skewX(-18deg) translateX(-160%); opacity: 0; }
    22% { opacity: 1; }
    to { transform: skewX(-18deg) translateX(330%); opacity: 0; }
  }

  @keyframes splashDotPulse {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.18); opacity: 1; }
  }

  @keyframes splashType {
    from { max-width: 0; }
    to { max-width: 32ch; }
  }

  @keyframes splashCursorBlink {
    0%, 48% { opacity: 1; }
    49%, 100% { opacity: 0.18; }
  }

  @keyframes splashCursorOut {
    to { opacity: 0; transform: translateY(0.16em) scaleY(0.2); }
  }

  @keyframes splashLineIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes splashOrbit {
    to { stroke-dashoffset: 0; }
  }

  @keyframes splashLinkIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes splashNode {
    from { opacity: 0; transform: scale(0.2); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes splashPulseRing {
    0% { opacity: 0; transform: scale(0.65); }
    34% { opacity: 1; }
    100% { opacity: 0; transform: scale(1.55); }
  }

  @keyframes splashProgress {
    to { transform: translateX(0); }
  }

  @media (max-width: 640px) {
    .splash-panel {
      border-radius: 1.55rem;
    }

    .splash-body {
      gap: 1rem;
    }

    .splash-map {
      height: 8rem;
      min-height: 8rem;
    }

    .splash-foot {
      flex-direction: column;
      gap: 0.35rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .splash-shell,
    .splash-shell::before,
    .splash-shell::after,
    .splash-panel,
    .splash-scan,
    .splash-type,
    .splash-line-3,
    .splash-line-4,
    .splash-cursor,
    .splash-orbit,
    .splash-link,
    .splash-pulse-ring,
    .splash-node,
    .splash-progress span {
      animation: none !important;
    }

    .splash-type {
      max-width: 32ch;
    }

    .splash-line-3,
    .splash-line-4,
    .splash-link,
    .splash-node {
      opacity: 1;
    }
  }
`;

export default function SplashScreen() {
  const [phase, setPhase] = useState<SplashPhase>(() => {
    if (typeof window === 'undefined') return 'animate';
    try {
      return sessionStorage.getItem(SPLASH_STORAGE_KEY) ? 'done' : 'animate';
    } catch {
      return 'animate';
    }
  });

  useEffect(() => {
    const prehideStyle = document.querySelector('style[data-hsy-splash-prehide="true"]');

    if (sessionStorage.getItem(SPLASH_STORAGE_KEY)) {
      setPhase('done');
      return;
    }

    prehideStyle?.remove();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
      setPhase('done');
      return;
    }

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
      setPhase('done');
    }, SPLASH_DURATION);

    return () => window.clearTimeout(timer);
  }, []);

  if (phase === 'done') return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRECHECK_SCRIPT }} />
      <style dangerouslySetInnerHTML={{ __html: SPLASH_STYLE }} />

      <div id="hsy-splash-root" className="splash-shell" aria-label="正在接入个人宇宙观测站">
        <div className="splash-noise" aria-hidden="true" />

        <div className="splash-center">
          <div className="splash-panel">
            <div className="splash-scan" aria-hidden="true" />

            <div className="splash-inner">
              <div className="splash-top">
                <div className="splash-status">
                  <span className="splash-dot" />
                  Signal Handshake
                </div>
                <div className="splash-version">v2.3</div>
              </div>

              <div className="splash-body">
                <div className="splash-terminal">
                  <span className="splash-line splash-line-1">
                    <span className="splash-prefix">&gt; </span>
                    <span className="splash-type">PERSONAL OBSERVATORY</span>
                  </span>

                  <span className="splash-line splash-line-2">
                    <span className="splash-prefix">&gt; </span>
                    <span className="splash-type">CONNECTING TO HSY UNIVERSE</span>
                    <span className="splash-cursor" />
                  </span>

                  <span className="splash-line splash-line-3">
                    <span className="splash-prefix">✓ </span>
                    <span className="splash-type">SIGNAL ACQUIRED</span>
                  </span>

                  <span className="splash-line splash-line-4">
                    <span className="splash-prefix">✓ </span>
                    <span className="splash-type">ORBIT STABILIZED</span>
                  </span>
                </div>

                <div className="splash-map" aria-hidden="true">
                  <svg viewBox="0 0 220 160" role="presentation">
                    <ellipse className="splash-orbit" cx="110" cy="80" rx="70" ry="42" />
                    <ellipse className="splash-orbit" cx="110" cy="80" rx="42" ry="25" />

                    <circle className="splash-node" cx="67" cy="82" r="3.2" />
                    <circle className="splash-node" cx="91" cy="58" r="2.8" />
                    <circle className="splash-node splash-node-core" cx="123" cy="55" r="3.4" />
                    <circle className="splash-node" cx="153" cy="78" r="2.9" />
                    <circle className="splash-node" cx="140" cy="104" r="3.1" />
                    <circle className="splash-node" cx="84" cy="108" r="2.8" />

                    <line className="splash-link" x1="67" y1="82" x2="91" y2="58" />
                    <line className="splash-link" x1="91" y1="58" x2="123" y2="55" />
                    <line className="splash-link" x1="123" y1="55" x2="153" y2="78" />
                    <line className="splash-link" x1="153" y1="78" x2="140" y2="104" />
                    <line className="splash-link" x1="140" y1="104" x2="84" y2="108" />
                    <line className="splash-link" x1="84" y1="108" x2="67" y2="82" />
                    <line className="splash-link" x1="84" y1="108" x2="123" y2="55" />

                    <circle className="splash-pulse-ring" cx="123" cy="55" r="12" />
                  </svg>
                </div>
              </div>

              <div className="splash-progress" aria-hidden="true">
                <span />
              </div>

              <div className="splash-foot">
                <span>diary / timeline / moments / signals</span>
                <span>orbit sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

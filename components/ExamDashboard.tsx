'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ================================================================
   Types
   ================================================================ */

interface Exam {
  name: string;
  date: string;            // YYYY-MM-DD
  time: string;            // HH:MM-HH:MM
}

interface TimeBlock {
  start: [number, number]; // [hour, minute]
  end:   [number, number];
}

interface BlockStatus {
  state:       'before-all' | 'studying' | 'between' | 'after-all';
  blocks:      TimeBlock[];
  activeIdx:   number;     // index of current / next block
  progress:    number;     // 0–100 within active block (only when studying)
  remainingMs: number;     // ms remaining in active block / until next block
  totalHours:  number;
}

/* ================================================================
   Data
   ================================================================ */

const EXAMS: Exam[] = [
  { name: '微积分II（第一层次）', date: '2026-06-22', time: '10:30-12:30' },
  { name: '模拟电路',              date: '2026-06-24', time: '08:00-10:00' },
  { name: '大学物理II',            date: '2026-06-28', time: '08:00-10:00' },
  { name: '数据结构与算法',        date: '2026-06-29', time: '08:00-10:00' },
  { name: '大学进阶英语',          date: '2026-06-30', time: '10:30-12:30' },
  { name: '军事理论（开卷）',      date: '2026-07-03', time: '14:00-16:00' },
];

const EXAM_WEEK_START = '2026-06-22';
const PREP_START = '2026-05-30';

// Mon=0 … Sun=6
const WEEKLY_SCHEDULE: TimeBlock[][] = [
  /* Mon */ [
    { start: [8, 40], end: [9, 40] },
    { start: [14, 30], end: [18, 0] },
    { start: [19, 0], end: [22, 0] },
  ],
  /* Tue */ [
    { start: [9, 0], end: [12, 0] },
    { start: [14, 30], end: [17, 30] },
  ],
  /* Wed */ [
    { start: [8, 30], end: [12, 0] },
    { start: [16, 30], end: [18, 0] },
    { start: [19, 0], end: [22, 0] },
  ],
  /* Thu */ [
    { start: [10, 0], end: [11, 30] },
    { start: [19, 0], end: [22, 0] },
  ],
  /* Fri */ [
    { start: [9, 0], end: [12, 0] },
    { start: [14, 30], end: [18, 0] },
    { start: [19, 0], end: [22, 30] },
  ],
  /* Sat */ [
    { start: [9, 0], end: [12, 0] },
    { start: [14, 30], end: [18, 0] },
    { start: [19, 0], end: [22, 30] },
  ],
  /* Sun */ [
    { start: [9, 0], end: [12, 0] },
    { start: [14, 30], end: [18, 0] },
    { start: [19, 0], end: [22, 30] },
  ],
];

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/* ================================================================
   Pure helpers
   ================================================================ */

function dayIdx(d: Date): number {
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function parseExamDateTime(exam: Exam): Date {
  const [y, mo, d] = exam.date.split('-').map(Number);
  const [h, m]     = exam.time.split('-')[0].split(':').map(Number);
  return new Date(y, mo - 1, d, h, m, 0);
}

function parseDateOnly(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function blockMinutes(b: TimeBlock): number {
  return (b.end[0] * 60 + b.end[1]) - (b.start[0] * 60 + b.start[1]);
}

function dayTotalHours(blocks: TimeBlock[]): number {
  return blocks.reduce((s, b) => s + blockMinutes(b) / 60, 0);
}

function calcAvailableHours(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate());
  let total = 0;
  const cur = new Date(start);
  while (cur < end) {
    total += dayTotalHours(WEEKLY_SCHEDULE[dayIdx(cur)] || []);
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

function getUrgency(days: number): 'low' | 'mid' | 'high' {
  if (days <= 7) return 'high';
  if (days <= 14) return 'mid';
  return 'low';
}

function fmtMD(dateStr: string) {
  const [_, mo, d] = dateStr.split('-').map(Number);
  return `${mo}月${d}日`;
}

function getTodayBlockStatus(now: Date): BlockStatus {
  const blocks = WEEKLY_SCHEDULE[dayIdx(now)] || [];
  const totalHours = dayTotalHours(blocks);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < blocks.length; i++) {
    const startMin = blocks[i].start[0] * 60 + blocks[i].start[1];
    const endMin   = blocks[i].end[0]   * 60 + blocks[i].end[1];

    if (nowMin < startMin) {
      const remainingMs = (startMin - nowMin) * 60 * 1000;
      return {
        state: i === 0 ? 'before-all' : 'between',
        blocks, activeIdx: i, progress: 0,
        remainingMs, totalHours,
      };
    }

    if (nowMin >= startMin && nowMin < endMin) {
      const total   = endMin - startMin;
      const elapsed = nowMin - startMin;
      return {
        state: 'studying', blocks, activeIdx: i,
        progress: Math.min(100, (elapsed / total) * 100),
        remainingMs: (endMin - nowMin) * 60 * 1000,
        totalHours,
      };
    }
  }

  return { state: 'after-all', blocks, activeIdx: blocks.length, progress: 100, remainingMs: 0, totalHours };
}

/** Hours of study time remaining today (real-time). */
function calcRemainingToday(now: Date): number {
  const blocks = WEEKLY_SCHEDULE[dayIdx(now)] || [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let remaining = 0;
  for (const b of blocks) {
    const endMin = b.end[0] * 60 + b.end[1];
    if (endMin <= nowMin) continue;
    const startMin = b.start[0] * 60 + b.start[1];
    remaining += (endMin - Math.max(startMin, nowMin)) / 60;
  }
  return remaining;
}

/* ================================================================
   Tiny sub-components
   ================================================================ */

function Countdown({ ms }: { ms: number }) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (
    <span className="exam-countdown">
      <span className="exam-countdown-num">{d}</span>天{' '}
      <span className="exam-countdown-num">{String(h).padStart(2, '0')}</span>:
      <span className="exam-countdown-num">{String(m).padStart(2, '0')}</span>:
      <span className="exam-countdown-num">{String(s).padStart(2, '0')}</span>
    </span>
  );
}

function ProgressRing({
  progress,
  color,
  size = 44,
  strokeWidth = 4,
}: {
  progress: number;  // 0–100
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashOffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="exam-ring"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(23,32,51,0.07)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease',
        }}
      />
    </svg>
  );
}

/* ================================================================
   Skeleton (SSR / first-paint fallback)
   ================================================================ */

function Skeleton() {
  return (
    <div className="exam-dashboard" aria-hidden="true">
      <div className="exam-status glass-panel rounded-[2rem] p-6 sm:p-7" style={{ minHeight: 140 }} />
      <div className="mt-6 glass-panel rounded-[2rem] p-6" style={{ minHeight: 100 }} />
    </div>
  );
}

/* ================================================================
   Main export
   ================================================================ */

export default function ExamDashboard({ showCards = false }: { showCards?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <Skeleton />;

  /* ------ derived data ------ */
  const enriched = EXAMS
    .map((e) => ({ ...e, dt: parseExamDateTime(e) }))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  const upcoming     = enriched.filter((e) => e.dt > now);
  const nearest      = upcoming[0] ?? enriched[enriched.length - 1];
  const nearestDiff  = Math.max(0, nearest.dt.getTime() - now.getTime());

  const lastDt       = enriched[enriched.length - 1].dt;
  const totalHours   = calcAvailableHours(now, lastDt);
  const blockStatus  = getTodayBlockStatus(now);

  const today        = DAY_NAMES[now.getDay()];
  const examWeekDate = parseDateOnly(EXAM_WEEK_START);

  /* ring gauge next to "今日可用时间" */
  const remainingToday = calcRemainingToday(now);
  const ringProgress   = blockStatus.totalHours > 0
    ? (remainingToday / blockStatus.totalHours) * 100
    : 100;
  const ringColor      = remainingToday < 1
    ? 'var(--exam-warn)'
    : blockStatus.state === 'studying'
      ? '#5aa7ff'
      : '#cbd5e1';

  /* progress bar: 5/30 midnight → last exam end time */
  const periodStart  = parseDateOnly(PREP_START);
  const lastExam     = enriched[enriched.length - 1];
  const [eh, em]     = lastExam.time.split('-')[1].split(':').map(Number);
  const periodEnd    = new Date(lastExam.dt.getFullYear(), lastExam.dt.getMonth(), lastExam.dt.getDate(), eh, em, 0);
  const periodTotal  = periodEnd.getTime() - periodStart.getTime();
  const periodDays   = Math.round(periodTotal / 86400000);
  const periodElap   = now.getTime() - periodStart.getTime();
  const periodPct    = periodTotal > 0 ? Math.min(100, Math.max(0, (periodElap / periodTotal) * 100)) : 0;

  /* exam-week zone position on the progress bar */
  const examWeekPct  = periodTotal > 0
    ? Math.max(0, Math.min(100, ((examWeekDate.getTime() - periodStart.getTime()) / periodTotal) * 100))
    : 100;

  return (
    <div className="exam-dashboard">
      {/* ============================================================
          Status bar
          ============================================================ */}
      <div className="exam-status glass-panel rounded-[2rem] p-6 sm:p-7">
        <div className="panel-inner grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="exam-stat">
            <p className="exam-stat-label">最近考试</p>
            <p className="exam-stat-subject">{nearest.name}</p>
            <Countdown ms={nearestDiff} />
          </div>
          <div className="exam-stat">
            <p className="exam-stat-label">可用学习时间</p>
            <p className="exam-stat-big">
              {totalHours.toFixed(0)}
              <span className="exam-stat-unit"> 小时</span>
            </p>
            <p className="exam-stat-desc">截止 {fmtMD(enriched[enriched.length - 1].date)}</p>
          </div>
          <div className="exam-stat">
            <p className="exam-stat-label">考试科目</p>
            <p className="exam-stat-big">
              {EXAMS.length}
              <span className="exam-stat-unit"> 门</span>
            </p>
            <p className="exam-stat-desc">
              {fmtMD(enriched[0].date)} — {fmtMD(enriched[enriched.length - 1].date)}
            </p>
          </div>
          <div className="exam-stat">
            <p className="exam-stat-label">今日可用时间</p>
            <div className="exam-stat-ring-row">
              <ProgressRing progress={ringProgress} color={ringColor} size={40} strokeWidth={3.5} />
              <div>
                <p className="exam-stat-big">
                  {blockStatus.totalHours}
                  <span className="exam-stat-unit"> 小时</span>
                </p>
                <p className="exam-stat-desc">{today}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Progress bar with exam-week break ---- */}
        <div className="panel-inner mt-5">
          <div className="exam-progress">
            <div className="exam-progress-track">
              <div
                className="exam-progress-fill"
                style={{ width: `${periodPct}%` }}
              />
              {/* Zone after 6/22 — subtly different background */}
              <div
                className="exam-progress-zone"
                style={{
                  left: `${examWeekPct}%`,
                  width: `${100 - examWeekPct}%`,
                }}
              />
              {/* Break line at 6/22 */}
              <div
                className="exam-progress-break"
                style={{ left: `${examWeekPct}%` }}
              />
            </div>
            <span className="exam-progress-label">
              {periodPct.toFixed(0)}% 已过去 · 共 {periodDays} 天备考周期
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          Exam cards (only on /tminus page)
          ============================================================ */}
      {showCards && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((exam) => {
            const diff       = exam.dt.getTime() - now.getTime();
            const days       = Math.max(0, Math.floor(diff / 86400000));
            const hoursAvail = calcAvailableHours(now, exam.dt);
            const isPast     = diff <= 0;
            const urgency    = isPast ? null : getUrgency(days);

            const accent = isPast
              ? 'var(--exam-past)'
              : urgency === 'high' ? 'var(--exam-urgent)'
              : urgency === 'mid'  ? 'var(--exam-warn)'
              : 'var(--exam-calm)';

            const glow = isPast
              ? 'none'
              : urgency === 'high' ? '0 0 10px rgba(239,68,68,0.45)'
              : urgency === 'mid'  ? '0 0 8px rgba(245,158,11,0.4)'
              : '0 0 8px rgba(90,167,255,0.4)';

            return (
              <div
                key={exam.name}
                className={`exam-card glass-panel rounded-[1.7rem] p-5 sm:p-6${isPast ? ' exam-card--past' : ''}`}
              >
                <div className="panel-inner">
                  <div className="exam-card-header">
                    <span className="exam-urgency-dot" style={{ backgroundColor: accent, boxShadow: glow }} />
                    <span className="exam-card-date">
                      {DAY_NAMES[exam.dt.getDay()]} · {fmtMD(exam.date)}
                    </span>
                  </div>
                  <h3 className="exam-card-name">{exam.name}</h3>
                  <p className="exam-card-time">{exam.time}</p>
                  <div className="exam-card-countdown">
                    {isPast ? (
                      <span className="exam-card-past-label">已结束</span>
                    ) : (
                      <div className="exam-card-days">
                        <span className="exam-days-num">{days}</span>
                        <span className="exam-days-unit">天后考试</span>
                        {urgency === 'high' && <span className="exam-urgent-tag">临近</span>}
                      </div>
                    )}
                  </div>
                  {!isPast && (
                    <p className="exam-card-hours">
                      预计可用 <strong>{hoursAvail.toFixed(0)}</strong> 小时
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          Link to full page (only on homepage compact mode)
          ============================================================ */}
      {!showCards && (
        <div className="mt-6 text-center">
          <Link href="/tminus" className="home-button home-button-secondary">
            查看全部考试安排
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

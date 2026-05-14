import type { CSSProperties } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@supabase/supabase-js';
import VisitorHeatmap from './VisitorHeatMap';
import DiaryList from './DiaryList';
import SplashScreen from './SplashScreen';
import CheckinCard from './CheckinCard';
import ScrollRestore from './ScrollRestore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

type Category = {
  id: string | number;
  name: string;
  sort_order?: number | null;
};

type Diary = {
  id: string | number;
  title: string;
  summary?: string | null;
  date?: string | null;
  cover_image_url?: string | null;
  category_id?: string | number | null;
  categories?: { name?: string | null } | { name?: string | null }[] | null;
};

type TimelineItem = {
  id: string | number;
  date?: string | null;
  title?: string | null;
  description?: string | null;
  link_url?: string | null;
  type?: string | null;
  icon?: string | null;
  image_url?: string | null;
};

type Moment = {
  id: string | number;
  image_url?: string | null;
  caption?: string | null;
  created_at?: string | null;
  taken_at?: string | null;
  location?: string | null;
  mood?: string | null;
  tags?: string | null | string[];
};

type HomeProfile = {
  hero_kicker?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  status_text?: string | null;
  current_location?: string | null;
  current_focus?: string | null;
  current_mood?: string | null;
  current_learning?: string | null;
  current_writing?: string | null;
  current_playing?: string | null;
  quote?: string | null;
  quote_author?: string | null;
  site_started_at?: string | null;
};

type NowStatus = {
  id: string;
  label: string;
  value: string;
  emoji?: string | null;
  sort_order?: number | null;
};

const DEFAULT_PROFILE: HomeProfile = {
  hero_kicker: 'PERSONAL OBSERVATORY',
  hero_title: '我的个人宇宙',
  hero_subtitle: '生活、学习、随笔、瞬间与一些缓慢发光的日常。',
  status_text: '稳定运行中',
  current_location: '地球 · 某处',
  current_focus: '整理生活与知识的轨道',
  current_mood: '温和、清醒、缓慢推进',
  current_learning: '高数 / 电路 / 代码',
  current_writing: '个人网站重构记录',
  current_playing: '明日方舟',
  quote: '把日常保存成一颗颗可以重新抵达的星。',
  quote_author: 'hsy',
  site_started_at: null,
};

const HOME_STYLE = `
  .home-shell {
    --home-bg: #f7f8fb;
    --home-text: #172033;
    --home-muted: #738198;
    --home-line: rgba(23, 32, 51, 0.09);
    --home-blue: #5aa7ff;
    --home-purple: #a78bfa;
    --home-rose: #fb7185;
    --home-teal: #2dd4bf;
    color: var(--home-text);
    background:
      radial-gradient(circle at 12% 10%, rgba(90, 167, 255, 0.18), transparent 32%),
      radial-gradient(circle at 88% 8%, rgba(167, 139, 250, 0.14), transparent 30%),
      radial-gradient(circle at 50% 94%, rgba(45, 212, 191, 0.12), transparent 34%),
      linear-gradient(180deg, #fbfcff 0%, #f7f8fb 42%, #f4f6fb 100%);
  }

  .home-shell {
    scroll-behavior: smooth;
  }

  .cosmic-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .cosmic-bg::before {
    content: "";
    position: absolute;
    inset: -24%;
    background:
      radial-gradient(circle at 20% 22%, rgba(90, 167, 255, 0.2), transparent 30%),
      radial-gradient(circle at 82% 16%, rgba(167, 139, 250, 0.18), transparent 30%),
      radial-gradient(circle at 42% 78%, rgba(251, 113, 133, 0.1), transparent 34%),
      radial-gradient(circle at 76% 84%, rgba(45, 212, 191, 0.11), transparent 30%);
    filter: blur(44px);
    animation: nebulaDrift 28s ease-in-out infinite alternate;
  }

  .cosmic-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(23, 32, 51, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 32, 51, 0.035) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
    opacity: 0.65;
  }

  .glass-panel {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.72);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.58));
    box-shadow:
      0 24px 80px rgba(31, 41, 55, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(22px);
  }

  .glass-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(90, 167, 255, 0.13), transparent 28%, transparent 72%, rgba(167, 139, 250, 0.11)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.58), transparent 38%);
    opacity: 0.72;
  }

  .panel-inner {
    position: relative;
    z-index: 1;
  }

  .ak-card::after {
    content: "";
    position: absolute;
    top: 0;
    left: -48%;
    width: 42%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(90, 167, 255, 0.18),
      transparent
    );
    transform: skewX(-18deg);
    opacity: 0;
    pointer-events: none;
  }

  .ak-card:hover::after {
    animation: scanLine 0.9s ease;
    opacity: 1;
  }

  .ak-corner {
    position: absolute;
    width: 22px;
    height: 22px;
    opacity: 0.72;
    pointer-events: none;
    z-index: 2;
  }

  .ak-corner-tl {
    left: 14px;
    top: 14px;
    border-left: 1px solid rgba(90, 167, 255, 0.56);
    border-top: 1px solid rgba(90, 167, 255, 0.56);
  }

  .ak-corner-br {
    right: 14px;
    bottom: 14px;
    border-right: 1px solid rgba(167, 139, 250, 0.5);
    border-bottom: 1px solid rgba(167, 139, 250, 0.5);
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid rgba(23, 32, 51, 0.08);
    background: rgba(255, 255, 255, 0.72);
    color: #506078;
    border-radius: 999px;
    padding: 0.45rem 0.75rem;
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    backdrop-filter: blur(14px);
  }

  .status-dot {
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 999px;
    background: #2dd4bf;
    box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.12), 0 0 18px rgba(45, 212, 191, 0.55);
  }

  .home-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 44px;
    border-radius: 999px;
    padding: 0.75rem 1rem;
    font-size: 0.92rem;
    font-weight: 700;
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  }

  .home-button:hover {
    transform: translateY(-2px);
  }

  .home-button-primary {
    color: white;
    background: linear-gradient(135deg, #172033, #263855);
    box-shadow: 0 18px 38px rgba(23, 32, 51, 0.18);
  }

  .home-button-secondary {
    color: #1d2a3d;
    border: 1px solid rgba(23, 32, 51, 0.1);
    background: rgba(255, 255, 255, 0.68);
    backdrop-filter: blur(16px);
  }

  .home-button-secondary:hover {
    border-color: rgba(90, 167, 255, 0.4);
    box-shadow: 0 16px 32px rgba(90, 167, 255, 0.12);
  }

  .section-shell {
    position: relative;
    z-index: 1;
    padding: 5.5rem 0;
  }

  /* ===== Safari-friendly Scroll Reveal / 兼容 Safari 的滚动浮现 =====
     这里不再依赖 animation-timeline: view()。
     JS 会给 .home-shell 添加 .reveal-ready，再由 IntersectionObserver
     给进入视口的元素添加 .is-visible。
     当前效果：轻微上浮 + 淡入 + 小幅缩放，不使用模糊。
  */
  .scroll-float,
  .scroll-float-item {
    opacity: 1;
    transform: none;
    transition:
      opacity 720ms ease,
      transform 720ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform;
  }

  .reveal-ready .scroll-float:not(.is-visible),
  .reveal-ready .scroll-float-item:not(.is-visible) {
    opacity: 0;
    transform: translate3d(0, 26px, 0) scale(0.98);
  }

  .reveal-ready .scroll-float.is-visible,
  .reveal-ready .scroll-float-item.is-visible {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }

  .scroll-float-soft {
    transition-duration: 640ms;
  }

  .scroll-stagger > .scroll-float-item:nth-child(2) {
    transition-delay: 80ms;
  }

  .scroll-stagger > .scroll-float-item:nth-child(3) {
    transition-delay: 160ms;
  }

  .scroll-stagger > .scroll-float-item:nth-child(4) {
    transition-delay: 240ms;
  }

  .scroll-stagger > .scroll-float-item:nth-child(n + 5) {
    transition-delay: 320ms;
  }

  .section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: #5f6f88;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .section-kicker::before {
    content: "";
    width: 32px;
    height: 1px;
    background: linear-gradient(90deg, rgba(90, 167, 255, 0.85), transparent);
  }

  .mini-stat {
    border: 1px solid rgba(23, 32, 51, 0.07);
    background: rgba(255, 255, 255, 0.58);
    border-radius: 1.25rem;
    padding: 0.95rem;
  }

  .article-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(90, 167, 255, 0.24);
    background: rgba(90, 167, 255, 0.08);
    color: #386491;
    border-radius: 999px;
    padding: 0.28rem 0.62rem;
    font-size: 0.76rem;
    font-weight: 700;
  }

  /* ===== 错位时间线 ===== */
  .timeline-track {
    position: relative;
  }

  .timeline-line {
    position: absolute;
    left: 50%;
    top: 0.5rem;
    bottom: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(90, 167, 255, 0.5),
      rgba(167, 139, 250, 0.32) 60%,
      transparent
    );
  }

  .timeline-dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 999px;
    border: 2px solid rgba(90, 167, 255, 0.55);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 6px rgba(90, 167, 255, 0.07), 0 0 18px rgba(90, 167, 255, 0.18);
  }

  .timeline-dot-featured {
    width: 0.85rem;
    height: 0.85rem;
    background: #5aa7ff;
    border-color: #5aa7ff;
    box-shadow: 0 0 0 8px rgba(90, 167, 255, 0.12), 0 0 24px rgba(90, 167, 255, 0.32);
  }

  .timeline-m-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: #5aa7ff;
    box-shadow: 0 0 0 5px rgba(90, 167, 255, 0.1);
  }

  @media (min-width: 1024px) {
    .timeline-card-half {
      width: 47%;
    }
  }

  .memory-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr 1fr;
    grid-auto-rows: 13rem;
    gap: 1rem;
  }

  .memory-card {
    position: relative;
    overflow: hidden;
    border-radius: 1.75rem;
    min-height: 13rem;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 20px 56px rgba(31, 41, 55, 0.08);
  }

  .memory-card:nth-child(1) {
    grid-row: span 2;
  }

  .memory-card:nth-child(4) {
    grid-column: span 2;
  }

  .memory-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 600ms ease;
  }

  .memory-card:hover img {
    transform: scale(1.055);
  }

  .memory-overlay {
    position: absolute;
    inset: auto 0 0 0;
    padding: 1rem;
    color: white;
    background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.76));
  }

  .soft-appear {
    animation: softAppear 0.72s ease both;
  }

  .delay-1 { animation-delay: 80ms; }
  .delay-2 { animation-delay: 160ms; }
  .delay-3 { animation-delay: 240ms; }

  @keyframes nebulaDrift {
    from {
      transform: translate3d(-2%, -1%, 0) scale(1);
    }
    to {
      transform: translate3d(2%, 1%, 0) scale(1.06);
    }
  }

  @keyframes scanLine {
    from {
      left: -48%;
    }
    to {
      left: 118%;
    }
  }

  @keyframes softAppear {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .section-shell {
      padding: 4.25rem 0;
    }

    .mobile-snap {
      display: flex;
      overflow-x: auto;
      gap: 1rem;
      padding: 0.25rem 1.25rem 1rem;
      margin-left: -1.25rem;
      margin-right: -1.25rem;
      scroll-snap-type: x mandatory;
    }

    .mobile-snap > * {
      min-width: 82%;
      scroll-snap-align: start;
    }

    .timeline-line {
      display: none;
    }

    .timeline-m-row {
      padding-left: 1.5rem;
      border-left: 1px solid rgba(90, 167, 255, 0.25);
    }

    .memory-grid {
      display: flex;
      overflow-x: auto;
      gap: 1rem;
      padding-bottom: 1rem;
      scroll-snap-type: x mandatory;
    }

    .memory-card {
      min-width: 82%;
      height: 20rem;
      scroll-snap-align: start;
    }

    .memory-card:nth-child(1),
    .memory-card:nth-child(4) {
      grid-row: auto;
      grid-column: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cosmic-bg::before,
    .ak-card:hover::after,
    .soft-appear {
      animation: none;
    }

    .scroll-float,
    .scroll-float-item {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }

    .home-button:hover {
      transform: none;
    }
  }
`;

export default async function Home() {
  const [
    profileRes,
    nowRes,
    diariesRes,
    timelinesRes,
    categoriesRes,
    momentsRes,
  ] = await Promise.all([
    supabase
      .from('home_profile')
      .select('*')
      .eq('id', 1)
      .maybeSingle(),

    supabase
      .from('now_status')
      .select('id,label,value,emoji,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('diaries')
      .select('id,title,summary,date,cover_image_url,category_id,categories(name)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('timeline')
      .select('id,date,title,description,link_url,type,icon,image_url')
      .order('date', { ascending: false })
      .limit(20),

    supabase
      .from('categories')
      .select('id,name,sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),

    supabase
      .from('moments')
      .select('id,image_url,caption,created_at,taken_at,location,mood,tags')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const profile: HomeProfile = {
    ...DEFAULT_PROFILE,
    ...(profileRes.data ?? {}),
  };

  const nowItems: NowStatus[] =
    nowRes.data && nowRes.data.length > 0
      ? nowRes.data
      : [
          {
            id: 'learning',
            label: '最近在学',
            value: profile.current_learning || '高数 / 电路 / 代码',
            emoji: '📘',
          },
          {
            id: 'writing',
            label: '最近在写',
            value: profile.current_writing || '个人网站重构记录',
            emoji: '✍️',
          },
          {
            id: 'playing',
            label: '最近在玩',
            value: profile.current_playing || '明日方舟',
            emoji: '🎮',
          },
          {
            id: 'mood',
            label: '当前状态',
            value: profile.current_mood || '稳定运行中',
            emoji: '🌙',
          },
        ];

  const diaries = (diariesRes.data ?? []) as Diary[];
  const timelines = (timelinesRes.data ?? []) as TimelineItem[];
  const categories = (categoriesRes.data ?? []) as Category[];
  const moments = (momentsRes.data ?? []) as Moment[];

  const mainDiary = diaries[0];
  const sideDiaries = diaries.slice(1, 4);
  const runDays = getRunDays(profile.site_started_at);

  const randomMemoryHref =
    moments.length > 0
      ? '/moments'
      : mainDiary
        ? getDiaryHref(mainDiary)
        : '#featured-stories';

  return (
    <div className="home-shell min-h-screen font-sans text-gray-800">
      <SplashScreen />
      <ScrollRestore />

      <style dangerouslySetInnerHTML={{ __html: HOME_STYLE }} />

      <Script
        id="home-scroll-reveal"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const shell = document.querySelector('.home-shell');
              if (!shell) return;

              const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              const revealTargets = Array.from(document.querySelectorAll('.scroll-float, .scroll-float-item'));

              if (prefersReducedMotion || !('IntersectionObserver' in window)) {
                revealTargets.forEach((target) => target.classList.add('is-visible'));
                return;
              }

              shell.classList.add('reveal-ready');

              const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                  }
                });
              }, {
                root: null,
                threshold: 0.12,
                rootMargin: '0px 0px -8% 0px'
              });

              revealTargets.forEach((target) => {
                const rect = target.getBoundingClientRect();
                const alreadyInView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

                if (alreadyInView) {
                  target.classList.add('is-visible');
                } else {
                  observer.observe(target);
                }
              });
            })();
          `,
        }}
      />

      <div className="cosmic-bg" aria-hidden="true" />

      <header className="relative z-10 overflow-hidden px-5 pb-20 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:min-h-[72vh] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="soft-appear">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="status-pill">
                <span className="status-dot" />
                {profile.hero_kicker || 'PERSONAL OBSERVATORY'}
              </span>
              <span className="status-pill">
                STATUS / {profile.status_text || 'ONLINE'}
              </span>
            </div>

            <h1
              id="header-title"
              className="max-w-4xl text-5xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl"
            >
              {profile.hero_title || '我的个人宇宙'}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {profile.hero_subtitle ||
                '生活、学习、随笔、瞬间与一些缓慢发光的日常。'}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="home-button home-button-primary"
                href={mainDiary ? getDiaryHref(mainDiary) : '#featured-stories'}
              >
                进入最新随笔
                <span aria-hidden="true">↗</span>
              </Link>

              <Link
                className="home-button home-button-secondary"
                href="/timeline"
              >
                查看时间轨迹
              </Link>

              <Link
                className="home-button home-button-secondary"
                href={randomMemoryHref}
              >
                打开一个瞬间
              </Link>
            </div>
          </div>

          <aside className="glass-panel ak-card soft-appear delay-1 relative rounded-[2rem] p-5 sm:p-6">
            <span className="ak-corner ak-corner-tl" />
            <span className="ak-corner ak-corner-br" />

            <div className="panel-inner">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    Observatory Panel
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    最近状态
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-bold text-slate-500">
                  LIVE
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="当前位置"
                  value={profile.current_location || '地球 · 某处'}
                />
                <MiniStat
                  label="当前状态"
                  value={profile.current_mood || '稳定运行中'}
                />
                <MiniStat
                  label="最近在学"
                  value={profile.current_learning || '高数 / 电路 / 代码'}
                />
                <MiniStat
                  label="最近在写"
                  value={profile.current_writing || '个人网站'}
                />
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200/70 bg-white/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Current Focus
                </p>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-700">
                  {profile.current_focus || '整理生活与知识的轨道'}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniStat label="随笔" value={`${diaries.length}`} compact />
                <MiniStat label="轨迹" value={`${timelines.length}`} compact />
                <MiniStat
                  label="运行"
                  value={runDays > 0 ? `${runDays}天` : '启动中'}
                  compact
                />
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main className="relative z-10">
        <section className="section-shell scroll-float px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="NOW / 今日观测"
              title="这个宇宙此刻正在发生什么"
              description="这里是关于近况的观测窗"
            />

            <div className="mobile-snap scroll-stagger mt-8 grid gap-4 md:grid-cols-4">
              {nowItems.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="glass-panel ak-card scroll-float-item rounded-[1.7rem] p-5"
                >
                  <div className="panel-inner">
                    <div className="text-3xl">{item.emoji || '•'}</div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">
                      {item.value}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="featured-stories"
          className="section-shell scroll-float px-5 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="Featured Stories / 精选随笔"
              title="最近的想法、故事和记录"
              description="这里展示最新几篇随笔，点击卡片可以进入阅读。"
            />

            {mainDiary ? (
              <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <Link
                  href={getDiaryHref(mainDiary)}
                  className="glass-panel ak-card group relative min-h-[31rem] overflow-hidden rounded-[2rem]"
                >
                  <span className="ak-corner ak-corner-tl" />
                  <span className="ak-corner ak-corner-br" />

                  <div className="panel-inner flex h-full min-h-[31rem] flex-col">
                    {mainDiary.cover_image_url ? (
                      <div className="relative mx-7 mt-5 h-56 overflow-hidden rounded-[1.6rem] border border-white/75 bg-slate-100 shadow-[0_20px_54px_rgba(31,41,55,0.12)] sm:mx-8 sm:mt-6 sm:h-64 lg:mx-9 lg:h-72 xl:h-80">
                        <img
                          src={mainDiary.cover_image_url}
                          alt={mainDiary.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-slate-950/20" />
                        <div className="absolute left-4 top-4 rounded-full border border-white/65 bg-white/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur-md">
                          LATEST
                        </div>
                      </div>
                    ) : (
                      <div className="relative mx-7 mt-5 h-56 overflow-hidden rounded-[1.6rem] border border-white/75 bg-gradient-to-br from-sky-100 via-white to-purple-100 shadow-[0_20px_54px_rgba(31,41,55,0.08)] sm:mx-8 sm:mt-6 sm:h-64 lg:mx-9 lg:h-72 xl:h-80">
                        <div className="absolute left-4 top-4 rounded-full border border-white/65 bg-white/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur-md">
                          LATEST
                        </div>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-end px-7 pb-7 pt-4 sm:px-8 sm:pb-8 sm:pt-5 lg:px-9">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {getCategoryName(mainDiary) && (
                          <span className="article-chip">
                            {getCategoryName(mainDiary)}
                          </span>
                        )}
                        <span className="article-chip">
                          {formatDate(mainDiary.date)}
                        </span>
                      </div>

                      <h3 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                        {mainDiary.title}
                      </h3>

                      <p className="mt-4 line-clamp-3 text-base leading-8 text-slate-600">
                        {mainDiary.summary ||
                          '这篇随笔还没有摘要，但它已经被放进了这个小宇宙。'}
                      </p>

                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                        阅读全文
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="grid gap-4">
                  {sideDiaries.map((diary) => (
                    <Link
                      key={diary.id}
                      href={getDiaryHref(diary)}
                      className="glass-panel ak-card group scroll-float-item rounded-[1.7rem] p-5"
                    >
                      <div className="panel-inner">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            {formatDate(diary.date)}
                          </span>
                          {getCategoryName(diary) && (
                            <span className="article-chip">
                              {getCategoryName(diary)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-black text-slate-900">
                          {diary.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {diary.summary ||
                            '这篇随笔还没有摘要，但它已经准备好被打开。'}
                        </p>

                        <div className="mt-4 text-sm font-bold text-slate-700">
                          OPEN
                          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyPanel text="还没有公开随笔。发布第一篇后，这里会自动出现内容。" />
            )}

            <div className="glass-panel mt-8 rounded-[2rem] p-5 sm:p-6">
              <div className="panel-inner">
                <DiaryList diaries={diaries || []} categories={categories || []} />
              </div>
            </div>
          </div>
        </section>

        <section
          id="orbit-log"
          className="section-shell scroll-float px-5 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="Orbit Log / 时光轨迹"
              title="把重要节点连成轨道"
              description="首页展示最近 6 个节点，完整轨迹见独立时间线页面。"
            />

            {timelines.length > 0 ? (
              <div className="timeline-track mt-10">
                <div className="timeline-line hidden lg:block" aria-hidden="true" />

                <div className="flex flex-col gap-4 lg:gap-5">
                  {timelines.slice(0, 6).map((item, index) => {
                    const isRight = index % 2 === 1;
                    const isFirst = index === 0;

                    return (
                      <div
                        key={item.id}
                        className={`relative timeline-m-row lg:border-l-0 lg:pl-0 lg:flex ${
                          isRight ? 'lg:justify-end' : 'lg:justify-start'
                        }`}
                      >
                        <div
                          className="timeline-m-dot absolute lg:hidden"
                          style={{ left: '-0.28rem', top: '1.1rem' }}
                        />

                        <div
                          className={`timeline-dot absolute left-1/2 -translate-x-1/2 top-5 z-10 hidden lg:block ${
                            isFirst ? 'timeline-dot-featured' : ''
                          }`}
                        />

                        <div className="glass-panel scroll-float-item timeline-card-half rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(31,41,55,0.1)]">
                          <div className="panel-inner">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                {formatDate(item.date)}
                              </span>
                              <div className="flex items-center gap-2">
                                {item.type && (
                                  <span className="rounded-full border border-blue-100 bg-blue-50/70 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                                    {item.type}
                                  </span>
                                )}
                                <span className="text-sm">{item.icon || '✦'}</span>
                              </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900">
                              {item.title}
                            </h3>
                            {item.image_url && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-white/70">
                                <img src={item.image_url} alt={item.title || ''} className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105" />
                              </div>
                            )}
                            {item.description && (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                {item.description}
                              </p>
                            )}
                            {item.link_url && (
                              <a
                                href={item.link_url}
                                className="mt-3 inline-flex text-sm font-bold text-blue-500 hover:text-blue-600"
                              >
                                阅读这篇随笔 →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {timelines.length > 6 && (
                  <div className="mt-8 text-center lg:mt-10">
                    <Link
                      href="/timeline"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 transition-colors hover:text-purple-800"
                    >
                      查看全部 {timelines.length} 条轨迹
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <EmptyPanel text="时间轴还在构建中..." />
            )}
          </div>
        </section>

        <section
          id="memory-constellation"
          className="section-shell scroll-float px-5 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="Memory Constellation / 瞬间"
              title="散落的记忆星图"
              description="一张图，一段话，拼起日常的碎片"
            />

            {moments.length > 0 ? (
              <>
                <div className="memory-grid scroll-stagger mt-8">
                  {moments.map((moment) => (
                    <Link
                      key={moment.id}
                      href="/moments"
                      className="memory-card scroll-float-item"
                    >
                      {moment.image_url ? (
                        <img
                          src={moment.image_url}
                          alt={moment.caption || 'moment'}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                          No Image
                        </div>
                      )}

                      <div className="memory-overlay">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {moment.location && (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                              {moment.location}
                            </span>
                          )}
                          {moment.mood && (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                              {moment.mood}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                          {formatDate(moment.taken_at || moment.created_at)}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-black">
                          {moment.caption || '一颗没有命名的记忆'}
                        </h3>
                        {moment.tags && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {parseTags(moment.tags).map((tag) => (
                              <span key={tag} className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/70 backdrop-blur-sm">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Link
                    href="/moments"
                    className="home-button home-button-secondary"
                  >
                    查看全部瞬间
                  </Link>
                </div>
              </>
            ) : (
              <div className="glass-panel ak-card mt-8 rounded-[2rem] p-6">
                <div className="panel-inner">
                  <p className="text-sm leading-7 text-slate-500">
                    瞬间功能已经有页面入口，但首页暂时还没有读取到公开图片。
                  </p>
                  <Link
                    href="/moments"
                    className="mt-5 inline-flex text-sm font-bold text-blue-500 hover:text-blue-600"
                  >
                    前往瞬间页面 →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          id="signal-station"
          className="section-shell scroll-float px-5 pb-24 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="Signal Station / 生活信号站"
              title="访客、留言与打卡"
              description="这里是访客的足迹，也是你可以留下信号的地方"
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div id="visitor-footprint" className="glass-panel scroll-float-item rounded-[2rem] p-5 sm:p-6">
                <div className="panel-inner">
                  <VisitorHeatmap />
                </div>
              </div>

              <div className="grid gap-5">
                <div className="glass-panel ak-card scroll-float-item rounded-[2rem] p-6">
                  <div className="panel-inner">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      Guestbook
                    </p>
                    <h3 className="mt-3 text-3xl font-black text-slate-900">
                      访客留言板
                    </h3>
                    <p className="mt-4 leading-8 text-slate-600">
                      这里是访客留下足迹的地方。如果你也想说点什么，欢迎去留言板坐坐
                    </p>
                    <Link
                      href="/guestbook"
                      className="home-button home-button-primary mt-6"
                    >
                      去留言板坐坐
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>

                <div className="glass-panel scroll-float-item rounded-[2rem] p-5 sm:p-6">
                  <div className="panel-inner">
                    <CheckinCard />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel ak-card scroll-float scroll-float-soft mt-6 rounded-[2rem] p-6">
              <div className="panel-inner grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    Quote / Tiny Signal
                  </p>
                  <blockquote className="mt-3 text-2xl font-black leading-snug text-slate-900">
                    {profile.quote || '随缘更新！'}
                  </blockquote>
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    — {profile.quote_author || 'hsy'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    className="home-button home-button-secondary"
                    href="#visitor-footprint"
                  >
                    查看访客足迹
                  </Link>
                  <Link
                    className="home-button home-button-secondary"
                    href="/checkin"
                  >
                    查看打卡详情
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 pb-8 text-center">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between border-t border-slate-200/80 px-6 pt-8 text-sm text-slate-400 md:flex-row">
          <p>© 2026 我的个人宇宙. All rights reserved.</p>

          <Link
            href="/secret"
            className="group mt-4 flex items-center transition-colors hover:text-purple-500 md:mt-0"
          >
            <svg
              className="mr-1 h-4 w-4 opacity-50 group-hover:opacity-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <span>访客止步</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="section-kicker">{kicker}</p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="mini-stat">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p
        className={
          compact
            ? 'mt-1 text-xl font-black text-slate-900'
            : 'mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-700'
        }
      >
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="glass-panel mt-8 rounded-[1.7rem] p-6">
      <div className="panel-inner">
        <p className="text-sm leading-7 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function getDiaryHref(diary: Diary) {
  return `/diary/${diary.id}`;
}

function getCategoryName(diary: Diary) {
  const category = diary.categories;

  if (!category) return '';

  if (Array.isArray(category)) {
    return category[0]?.name || '';
  }

  return category.name || '';
}

function parseTags(tags?: string | null | string[]) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
}

function formatDate(input?: string | null) {
  if (!input) return 'UNKNOWN DATE';

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getRunDays(startDate?: string | null) {
  if (!startDate) return 0;

  const start = new Date(startDate);
  const now = new Date();

  if (Number.isNaN(start.getTime())) return 0;

  const diff = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

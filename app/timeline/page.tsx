import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

const TIMELINE_STYLE = `
  .tl-shell {
    min-height: 100vh;
    color: #172033;
    background:
      radial-gradient(circle at 12% 8%, rgba(90, 167, 255, 0.16), transparent 30%),
      radial-gradient(circle at 86% 12%, rgba(167, 139, 250, 0.15), transparent 30%),
      radial-gradient(circle at 48% 92%, rgba(45, 212, 191, 0.10), transparent 32%),
      linear-gradient(180deg, #fbfcff 0%, #f7f8fb 48%, #f4f6fb 100%);
  }

  .tl-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .tl-bg::before {
    content: "";
    position: absolute;
    inset: -24%;
    background:
      radial-gradient(circle at 22% 24%, rgba(90, 167, 255, 0.18), transparent 30%),
      radial-gradient(circle at 78% 18%, rgba(167, 139, 250, 0.16), transparent 30%),
      radial-gradient(circle at 42% 78%, rgba(251, 113, 133, 0.08), transparent 32%);
    filter: blur(46px);
    animation: tlNebula 28s ease-in-out infinite alternate;
  }

  .tl-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(23, 32, 51, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 32, 51, 0.035) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
    opacity: 0.62;
  }

  .tl-glass {
    position: relative;
    overflow: hidden;
    border-radius: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.72);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.62));
    box-shadow: 0 24px 80px rgba(31, 41, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(22px);
  }

  .tl-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(90, 167, 255, 0.12), transparent 28%, transparent 72%, rgba(167, 139, 250, 0.10)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.62), transparent 38%);
    opacity: 0.72;
  }

  .tl-inner {
    position: relative;
    z-index: 1;
  }

  .tl-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid rgba(90, 167, 255, 0.22);
    background: rgba(90, 167, 255, 0.08);
    color: #386491;
    border-radius: 999px;
    padding: 0.38rem 0.72rem;
    font-size: 0.76rem;
    font-weight: 800;
  }

  .tl-back {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid rgba(23, 32, 51, 0.08);
    background: rgba(255, 255, 255, 0.68);
    color: #64748b;
    border-radius: 999px;
    padding: 0.65rem 0.9rem;
    font-size: 0.88rem;
    font-weight: 800;
    backdrop-filter: blur(16px);
    transition: transform 180ms ease, color 180ms ease, box-shadow 180ms ease;
  }

  .tl-back:hover {
    color: #6d28d9;
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(109, 40, 217, 0.10);
  }

  /* ---------- timeline ---------- */
  .tl-track {
    position: relative;
  }

  .tl-line {
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

  .tl-dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 999px;
    border: 2px solid rgba(90, 167, 255, 0.55);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 6px rgba(90, 167, 255, 0.07), 0 0 18px rgba(90, 167, 255, 0.18);
  }

  .tl-dot-featured {
    width: 0.85rem;
    height: 0.85rem;
    background: #5aa7ff;
    border-color: #5aa7ff;
    box-shadow: 0 0 0 8px rgba(90, 167, 255, 0.12), 0 0 24px rgba(90, 167, 255, 0.32);
  }

  .tl-m-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: #5aa7ff;
    box-shadow: 0 0 0 5px rgba(90, 167, 255, 0.1);
  }

  @keyframes tlNebula {
    from { transform: translate3d(-2%, -1%, 0) scale(1); }
    to   { transform: translate3d(2%, 1%, 0) scale(1.06); }
  }

  @media (max-width: 1023px) {
    .tl-line { display: none; }
    .tl-m-row {
      padding-left: 1.5rem;
      border-left: 1px solid rgba(90, 167, 255, 0.25);
    }
  }

  @media (min-width: 1024px) {
    .tl-card-half {
      width: 47%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tl-bg::before { animation: none; }
    .tl-back:hover { transform: none; }
  }
`;

export default async function TimelinePage() {
  const { data: items } = await supabase
    .from('timeline')
    .select('id,date,title,description,link_url,type,icon,image_url')
    .order('date', { ascending: false });

  const timelines = (items ?? []) as {
    id: string | number;
    date?: string | null;
    title?: string | null;
    description?: string | null;
    link_url?: string | null;
    type?: string | null;
    icon?: string | null;
    image_url?: string | null;
  }[];

  return (
    <div className="tl-shell font-sans selection:bg-purple-200/70">
      <style dangerouslySetInnerHTML={{ __html: TIMELINE_STYLE }} />
      <div className="tl-bg" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-8 sm:px-8">
        <Link href="/" scroll={false} className="tl-back">
          <span aria-hidden="true">←</span>
          返回主页
        </Link>
        <Link
          href="/#orbit-log"
          className="hidden text-sm font-bold text-slate-400 transition-colors hover:text-purple-500 sm:inline-flex"
        >
          首页轨迹预览
        </Link>
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pb-28 sm:px-8 sm:pb-36">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Orbit Log / 完整时间线
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            时光轨迹
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            把重要节点连成轨道，每一条记录都是一个坐标。
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="tl-chip">{timelines.length} 条轨迹</span>
            <span className="tl-chip">
              {timelines.length > 0 && timelines[0].date
                ? `最新 ${formatDate(timelines[0].date)}`
                : '时间线'}
            </span>
          </div>
        </header>

        {timelines.length === 0 ? (
          <div className="tl-glass rounded-[1.5rem] p-8 text-center">
            <div className="tl-inner">
              <p className="text-sm font-semibold text-slate-400">
                时间轴还在构建中，去后台添加第一条轨迹吧。
              </p>
            </div>
          </div>
        ) : (
          <div className="tl-track">
            <div className="tl-line hidden lg:block" aria-hidden="true" />

            <div className="flex flex-col gap-4 lg:gap-5">
              {timelines.map((item, index) => {
                const isRight = index % 2 === 1;
                const isFirst = index === 0;

                return (
                  <div
                    key={item.id}
                    className={`relative tl-m-row lg:border-l-0 lg:pl-0 lg:flex ${
                      isRight ? 'lg:justify-end' : 'lg:justify-start'
                    }`}
                  >
                    <div
                      className="tl-m-dot absolute lg:hidden"
                      style={{ left: '-0.28rem', top: '1.1rem' }}
                    />

                    <div
                      className={`tl-dot absolute left-1/2 -translate-x-1/2 top-5 z-10 hidden lg:block ${
                        isFirst ? 'tl-dot-featured' : ''
                      }`}
                    />

                    <div className="tl-glass tl-card-half rounded-[1.5rem] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(31,41,55,0.1)]">
                      <div className="tl-inner">
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
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(input?: string | null) {
  if (!input) return '未知日期';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

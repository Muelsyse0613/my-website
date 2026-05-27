'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';

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

const PAGE_SIZE = 6;

export default function DiaryList({
  diaries,
  categories,
}: {
  diaries: Diary[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return diaries;

    return diaries.filter((diary) => {
      if (diary.category_id === null || diary.category_id === undefined) {
        return false;
      }

      return String(diary.category_id) === activeCategory;
    });
  }, [activeCategory, diaries]);

  const visibleDiaries = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const hasExpanded = visibleCount > PAGE_SIZE;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory]);

  return (
    <section>
      <div className="mb-10 flex flex-col gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Archive / Article Index
          </p>

          <h2 className="mt-2 flex items-center text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            <span className="mr-3 h-8 w-2 shrink-0 rounded-full bg-gradient-to-b from-purple-400 to-fuchsia-300" style={{ boxShadow: '0 0 24px rgba(168,85,247,0.34)' }} />
            最新随笔
          </h2>

          <p className="mt-4 text-sm font-medium text-slate-400">
            当前 {filtered.length} 篇 / 共 {diaries.length} 篇
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex max-w-full gap-3 overflow-x-auto pb-4 pt-1 sm:flex-wrap sm:overflow-visible">
            <CategoryButton
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            >
              全部
            </CategoryButton>

            {categories.map((cat) => (
              <CategoryButton
                key={cat.id}
                active={activeCategory === String(cat.id)}
                onClick={() => setActiveCategory(String(cat.id))}
              >
                {cat.name}
              </CategoryButton>
            ))}
          </div>
        )}
      </div>

      {visibleDiaries.length > 0 ? (
        <>
          <div className="grid gap-6 sm:gap-8 pt-2">
            {visibleDiaries.map((diary) => (
              <ArticleCard key={diary.id} diary={diary} />
            ))}
          </div>

          {(hasMore || hasExpanded) && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-full px-6 py-2.5 text-sm font-bold text-purple-600 transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(250, 245, 255, 1)',
                    border: '1px solid rgba(233, 213, 255, 0.8)',
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)',
                  }}
                >
                  展开更多
                  <span className="ml-2 text-purple-400">
                    {Math.min(PAGE_SIZE, filtered.length - visibleCount)} 篇
                  </span>
                </button>
              )}

              {hasExpanded && (
                <button
                  type="button"
                  onClick={() => setVisibleCount(PAGE_SIZE)}
                  className="rounded-full px-6 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:text-slate-700 hover:bg-slate-50"
                >
                  收起列表
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div 
          className="rounded-[2rem] p-8 text-center backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.8), 0 8px 30px rgba(0,0,0,0.04)'
          }}
        >
          <p className="text-sm text-slate-400">
            {activeCategory === 'all'
              ? '这里还空空如也，去后台写第一篇随笔吧！'
              : '该分类下还没有随笔'}
          </p>
        </div>
      )}
    </section>
  );
}

// ============== 核心卡片组件：稳定右侧封面版 ==============
function ArticleCard({ diary }: { diary: Diary }) {
  const categoryName = getCategoryName(diary);

  const cardRef = useRef<HTMLAnchorElement>(null);
  const rafRef = useRef<number>(0);
  const pendingPos = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const hasCover = Boolean(diary.cover_image_url);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      pendingPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          setMousePos(pendingPos.current);
        });
      }
    }
  };

  return (
    <Link
      ref={cardRef}
      href={`/diary/${diary.id}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative block min-w-0 max-w-full overflow-hidden rounded-[2rem]"
      style={{
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 24px 48px -12px rgba(168, 85, 247, 0.15)'
          : '0 8px 24px -4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 默认柔和边框 */}
      <div
        className="absolute inset-0 rounded-[2rem] transition-opacity duration-500"
        style={{
          backgroundColor: 'rgba(203, 213, 225, 0.4)',
          opacity: isHovered ? 0 : 1,
        }}
      />

      {/* hover 时的边缘流光 */}
      <div
        className="absolute inset-0 rounded-[2rem] transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.72), rgba(216, 180, 254, 0.28) 42%, transparent 80%)`,
        }}
      />

      {/* 卡片玻璃表面 */}
      <div
        className="absolute transition-colors duration-300 backdrop-blur-xl"
        style={{
          inset: '1px',
          borderRadius: 'calc(2rem - 1px)',
          backgroundColor: isHovered
            ? 'rgba(255, 255, 255, 0.94)'
            : 'rgba(255, 255, 255, 0.66)',
        }}
      />

      {/* 表面极轻的鼠标跟随氛围光 */}
      <div
        className="absolute pointer-events-none transition-opacity duration-500 mix-blend-multiply"
        style={{
          inset: '1px',
          borderRadius: 'calc(2rem - 1px)',
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(520px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.035), transparent 62%)`,
        }}
      />

      <div className="relative z-10 max-w-full p-5 sm:p-6 lg:p-7">
        <div
          className={
            hasCover
              ? 'grid min-w-0 max-w-full gap-5 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_14rem]'
              : 'grid min-w-0 max-w-full'
          }
        >
          <div className="min-w-0">
            <div className="mb-4 flex min-w-0 flex-wrap items-center gap-3">
              <h3
                className="min-w-0 break-words text-[1.45rem] font-black leading-snug transition-colors duration-300 sm:text-3xl"
                style={{ color: isHovered ? '#9333ea' : '#1e293b' }}
              >
                {diary.title}
              </h3>

              {categoryName && (
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(250, 245, 255, 0.8)',
                    color: '#9333ea',
                    boxShadow: 'inset 0 0 0 1px rgba(233, 213, 255, 0.5)',
                  }}
                >
                  {categoryName}
                </span>
              )}
            </div>

            <p className="font-mono text-sm font-medium text-slate-400 sm:text-base">
              {formatDate(diary.date)}
            </p>

            <p className="mt-5 line-clamp-3 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {diary.summary || '这篇随笔还没有摘要，但它已经准备好被打开。'}
            </p>

            <div
              className="mt-6 inline-flex items-center text-sm font-bold transition-all duration-300 sm:text-base"
              style={{ color: isHovered ? '#7e22ce' : '#a855f7' }}
            >
              阅读全文
              <svg
                className="ml-1 h-4 w-4 transition-transform duration-300"
                style={{ transform: isHovered ? 'translateX(6px)' : 'translateX(0)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </div>

          {diary.cover_image_url && (
            <div className="relative order-first aspect-square w-full overflow-hidden rounded-[1.45rem] border border-white/70 bg-slate-100 shadow-[0_18px_42px_rgba(31,41,55,0.10)] md:order-none">
              <Image
                src={diary.cover_image_url}
                alt={diary.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 12rem"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-slate-950/16" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}


// ============== 分类胶囊组件 ==============
function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="shrink-0 rounded-full px-6 py-2.5 text-sm font-bold backdrop-blur-md"
      style={{
        transition: 'all 0.3s ease',
        transform: isHovered && !active ? 'translateY(-2px)' : 'translateY(0)',
        backgroundColor: active ? 'rgba(250, 245, 255, 1)' : (isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)'),
        color: active || isHovered ? '#9333ea' : '#64748b',
        // 彻底告别 border，使用内发光模拟完美的玻璃边线
        boxShadow: active 
          ? 'inset 0 0 0 1px rgba(216, 180, 254, 0.8), 0 4px 12px rgba(168, 85, 247, 0.15)' 
          : (isHovered 
              ? 'inset 0 0 0 1px rgba(233, 213, 255, 0.6), 0 4px 12px rgba(0, 0, 0, 0.05)' 
              : 'inset 0 0 0 1px rgba(203, 213, 225, 0.4), 0 2px 8px rgba(0, 0, 0, 0.02)')
      }}
    >
      {children}
    </button>
  );
}

function getCategoryName(diary: Diary) {
  const category = diary.categories;

  if (!category) return '';

  if (Array.isArray(category)) {
    return category[0]?.name || '';
  }

  return category.name || '';
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
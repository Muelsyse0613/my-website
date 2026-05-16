import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CommentSection from './CommentSection';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 600;

type Diary = {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  date?: string | null;
  cover_image_url?: string | null;
  status?: 'published' | 'draft' | 'hidden' | string | null;
  is_featured?: boolean | null;
  is_pinned?: boolean | null;
  slug?: string | null;
  reading_minutes?: number | null;
  categories?: { name?: string | null } | { name?: string | null }[] | null;
};

const ARTICLE_STYLE = `
  .diary-detail-shell {
    min-height: 100vh;
    color: #172033;
    background:
      radial-gradient(circle at 12% 8%, rgba(90, 167, 255, 0.16), transparent 30%),
      radial-gradient(circle at 86% 12%, rgba(167, 139, 250, 0.15), transparent 30%),
      radial-gradient(circle at 48% 92%, rgba(45, 212, 191, 0.10), transparent 32%),
      linear-gradient(180deg, #fbfcff 0%, #f7f8fb 48%, #f4f6fb 100%);
  }

  .diary-cosmic-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .diary-cosmic-bg::before {
    content: "";
    position: absolute;
    inset: -24%;
    background:
      radial-gradient(circle at 22% 24%, rgba(90, 167, 255, 0.18), transparent 30%),
      radial-gradient(circle at 78% 18%, rgba(167, 139, 250, 0.16), transparent 30%),
      radial-gradient(circle at 42% 78%, rgba(251, 113, 133, 0.08), transparent 32%);
    filter: blur(46px);
    animation: diaryNebulaDrift 28s ease-in-out infinite alternate;
  }

  .diary-cosmic-bg::after {
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

  .diary-glass {
    position: relative;
    overflow: hidden;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.72);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.62));
    box-shadow: 0 24px 80px rgba(31, 41, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(22px);
  }

  .diary-glass::before {
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

  .diary-panel-inner {
    position: relative;
    z-index: 1;
  }

  .diary-chip {
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

  .diary-back-link {
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

  .diary-back-link:hover {
    color: #6d28d9;
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(109, 40, 217, 0.10);
  }

  .diary-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(109, 40, 217, 0.14);
    background: rgba(255, 255, 255, 0.72);
    color: #6d28d9;
    border-radius: 999px;
    padding: 0.72rem 1.1rem;
    font-size: 0.88rem;
    font-weight: 900;
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 30px rgba(109, 40, 217, 0.08);
    transition: transform 180ms ease, color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }

  .diary-action-button:hover {
    color: #581c87;
    background: rgba(255, 255, 255, 0.94);
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(109, 40, 217, 0.14);
  }

  .diary-content {
    color: #475569;
    font-size: 1.06rem;
    line-height: 1.95;
  }

  .diary-content p { margin: 1.1rem 0; }

  .diary-content h1,
  .diary-content h2,
  .diary-content h3 {
    color: #172033;
    font-weight: 900;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .diary-content h1 {
    margin-top: 3rem;
    margin-bottom: 1.1rem;
    font-size: 2rem;
  }

  .diary-content h2 {
    margin-top: 2.6rem;
    margin-bottom: 1rem;
    font-size: 1.65rem;
  }

  .diary-content h3 {
    margin-top: 2.2rem;
    margin-bottom: 0.85rem;
    font-size: 1.32rem;
  }

  .diary-content img {
    max-width: 100%;
    height: auto;
    border-radius: 1.5rem;
    margin: 2rem auto;
    box-shadow: 0 22px 56px rgba(31, 41, 55, 0.14);
  }

  .diary-content ul,
  .diary-content ol {
    margin: 1.2rem 0;
    padding-left: 1.6rem;
  }

  .diary-content ul { list-style-type: disc; }
  .diary-content ol { list-style-type: decimal; }
  .diary-content li { margin: 0.45rem 0; }

  .diary-content a {
    color: #7c3aed;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-thickness: 1px;
  }

  .diary-content strong {
    color: #111827;
    font-weight: 800;
  }

  .diary-content blockquote {
    position: relative;
    margin: 2rem 0;
    border-left: 4px solid #a78bfa;
    border-radius: 1rem;
    background: rgba(250, 245, 255, 0.72);
    padding: 1.1rem 1.25rem;
    color: #64748b;
    font-style: italic;
  }

  .diary-content pre {
    margin: 1.8rem 0;
    overflow-x: auto;
    border-radius: 1.25rem;
    background: #111827;
    padding: 1rem;
    color: #e5e7eb;
  }

  .diary-content code {
    border-radius: 0.45rem;
    background: rgba(124, 58, 237, 0.08);
    padding: 0.15rem 0.35rem;
    color: #6d28d9;
    font-size: 0.92em;
  }

  .diary-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }

  @keyframes diaryNebulaDrift {
    from { transform: translate3d(-2%, -1%, 0) scale(1); }
    to { transform: translate3d(2%, 1%, 0) scale(1.06); }
  }

  @media (max-width: 768px) {
    .diary-content {
      font-size: 1rem;
      line-height: 1.9;
    }

    .diary-content h1 { font-size: 1.72rem; }
    .diary-content h2 { font-size: 1.45rem; }
    .diary-content h3 { font-size: 1.22rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .diary-cosmic-bg::before { animation: none; }
    .diary-back-link:hover { transform: none; }
    .diary-action-button:hover { transform: none; }
  }
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isNumericId(value: string) {
  return /^\d+$/.test(value);
}

async function getDiary(idOrSlug: string) {
  const selectFields = '*, categories(name)';

  if (isUuid(idOrSlug) || isNumericId(idOrSlug)) {
    const { data, error } = await supabase
      .from('diaries')
      .select(selectFields)
      .eq('id', idOrSlug)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch diary by id:', error.message);
      return null;
    }

    return data as Diary | null;
  }

  const { data, error } = await supabase
    .from('diaries')
    .select(selectFields)
    .eq('slug', idOrSlug)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch diary by slug:', error.message);
    return null;
  }

  return data as Diary | null;
}

export default async function DiaryPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diary = await getDiary(id);

  if (!diary || diary.status === 'draft' || diary.status === 'hidden') {
    notFound();
  }

  const categoryName = getCategoryName(diary);
  const publishedDate = formatDate(diary.date);
  const readingMinutes = diary.reading_minutes
    ? `${diary.reading_minutes} min read`
    : getEstimatedReadingTime(diary.content);

  return (
    <div className="diary-detail-shell font-sans selection:bg-purple-200/70">
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_STYLE }} />
      <div className="diary-cosmic-bg" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-8 sm:px-8">
        <Link href="/" scroll={false} className="diary-back-link">
          <span aria-hidden="true">←</span>
          返回主页
        </Link>

        <Link
          href="/#featured-stories"
          className="hidden text-sm font-bold text-slate-400 transition-colors hover:text-purple-500 sm:inline-flex"
        >
          Article Index
        </Link>
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pb-28 sm:px-8 sm:pb-36">
        <article className="diary-glass rounded-[2rem] p-5 sm:p-8 lg:p-10">
          <div className="diary-panel-inner">
            <header className="pb-8">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="diary-chip">{publishedDate}</span>
                <span className="diary-chip">{categoryName || '随笔日记'}</span>
                {readingMinutes && <span className="diary-chip">{readingMinutes}</span>}
                {diary.is_pinned && <span className="diary-chip">PINNED</span>}
                {diary.is_featured && <span className="diary-chip">FEATURED</span>}
              </div>

              <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {diary.title}
              </h1>

              {diary.summary && (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
                  {diary.summary}
                </p>
              )}
            </header>

            {diary.cover_image_url && (
              <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-white/70 bg-slate-100 shadow-[0_22px_56px_rgba(31,41,55,0.14)]">
                <Image
                  src={diary.cover_image_url}
                  alt={diary.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div
              className="diary-content border-t border-slate-200/70 pt-8"
              dangerouslySetInnerHTML={{ __html: diary.content || '' }}
            />

            <footer className="mt-16 border-t border-slate-200/70 pt-8 sm:mt-20">
              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/70 bg-white/55 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    End of Transmission
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    感谢你读到这里。也可以在下方留下一条信号。
                  </p>
                </div>

                <Link href="/#featured-stories" className="diary-action-button">
                  返回随笔索引
                </Link>
              </div>
            </footer>
          </div>
        </article>

        <div style={{ paddingTop: '3rem' }}>
          <CommentSection postId={String(diary.id)} />
        </div>
      </main>
    </div>
  );
}

function getCategoryName(diary: Diary) {
  const category = diary.categories;
  if (!category) return '';
  if (Array.isArray(category)) return category[0]?.name || '';
  return category.name || '';
}

function formatDate(input?: string | null) {
  if (!input) return 'UNKNOWN DATE';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getEstimatedReadingTime(content?: string | null) {
  if (!content) return '';
  const plainText = content.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  const minutes = Math.max(1, Math.ceil(plainText.length / 500));
  return `${minutes} min read`;
}

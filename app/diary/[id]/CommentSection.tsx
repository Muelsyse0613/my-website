'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CommentItem = {
  id: string;
  post_id: string;
  nickname?: string | null;
  content?: string | null;
  author_reply?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const COMMENT_STYLE = `
  .comment-station {
    position: relative;
  }

  .comment-glass {
    position: relative;
    overflow: hidden;
    border-radius: 1.75rem;
    border: 1px solid rgba(255, 255, 255, 0.72);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.62));
    box-shadow: 0 20px 58px rgba(31, 41, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(22px);
  }

  .comment-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(90, 167, 255, 0.10), transparent 28%, transparent 72%, rgba(167, 139, 250, 0.10)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.55), transparent 38%);
    opacity: 0.72;
  }

  .comment-inner {
    position: relative;
    z-index: 1;
  }

  .comment-card {
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  }

  .comment-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 42px rgba(31, 41, 55, 0.09);
  }

  .comment-input {
    width: 100%;
    border-radius: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(248, 250, 252, 0.78);
    padding: 0.95rem 1rem;
    color: #172033;
    outline: none;
    transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }

  .comment-input:focus {
    border-color: rgba(167, 139, 250, 0.72);
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.13);
  }

  .comment-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(109, 40, 217, 0.14);
    background: rgba(255, 255, 255, 0.72);
    color: #6d28d9;
    border-radius: 999px;
    padding: 0.78rem 1.2rem;
    font-size: 0.88rem;
    font-weight: 900;
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 30px rgba(109, 40, 217, 0.08);
    transition: transform 180ms ease, color 180ms ease, box-shadow 180ms ease, background 180ms ease, opacity 180ms ease;
  }

  .comment-action-button:hover {
    color: #581c87;
    background: rgba(255, 255, 255, 0.94);
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(109, 40, 217, 0.14);
  }

  .comment-action-button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
    transform: none;
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .comment-card:hover,
    .comment-action-button:hover {
      transform: none;
    }
  }
`;

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const fetchComments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .or('status.is.null,status.neq.hidden')
      .order('created_at', { ascending: true });

    setLoading(false);

    if (error) {
      console.error('Failed to fetch comments:', error.message);
      return;
    }

    setComments((data || []) as CommentItem[]);
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNickname = nickname.trim();
    const cleanContent = content.trim();

    if (!cleanNickname || !cleanContent || isSubmitting) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('post_comments').insert([
      {
        post_id: postId,
        nickname: cleanNickname,
        content: cleanContent,
        status: 'unread',
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error('Failed to submit comment:', error.message);
      alert('评论发送失败，请稍后再试~');
      return;
    }

    setNickname('');
    setContent('');
    fetchComments();
  };

  return (
    <section className="comment-station">
      <style dangerouslySetInnerHTML={{ __html: COMMENT_STYLE }} />

      <div className="mb-12 sm:mb-14">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
          Guest Signal / Comment
        </p>

        <h2 className="mt-4 flex items-center text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          <span className="mr-3 h-8 w-2 shrink-0 rounded-full bg-gradient-to-b from-purple-400 to-fuchsia-300 shadow-[0_0_24px_rgba(168,85,247,0.34)]" />
          评论区
          <span className="ml-3 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm font-black text-purple-500">
            {comments.length}
          </span>
        </h2>

        <p className="mt-5 text-sm leading-7 text-slate-500">
          在这篇随笔下面留下一条信号。你的评论会进入后台，博主可以统一查看和回复。
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }} className="flex flex-col gap-4 sm:gap-5">
        {loading && (
          <div className="comment-glass rounded-[1.75rem] p-6">
            <div className="comment-inner text-sm font-semibold text-slate-400">
              正在接收评论信号...
            </div>
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="comment-glass rounded-[1.75rem] p-8 text-center">
            <div className="comment-inner">
              <p className="text-sm font-semibold text-slate-400">
                还没有人评论，快来抢沙发吧！
              </p>
            </div>
          </div>
        )}

        {!loading &&
          comments.map((comment) => (
            <article
              key={comment.id}
              className="comment-glass comment-card rounded-[1.75rem] p-6 sm:p-7"
            >
              <div className="comment-inner">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-sky-100 text-sm font-black text-purple-500">
                      {(comment.nickname || '访客').slice(0, 1).toUpperCase()}
                    </div>

                    <div>
                      <p className="font-black text-slate-800">
                        {comment.nickname || '匿名访客'}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Visitor Signal
                      </p>
                    </div>
                  </div>

                  <time className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-bold text-slate-400">
                    {formatDateTime(comment.created_at)}
                  </time>
                </div>

                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {comment.content}
                </p>

                {comment.author_reply && (
                  <div className="mt-7 overflow-hidden rounded-[1.25rem] border border-purple-100 bg-purple-50/70 p-5">
                    <p className="mb-3 flex items-center text-sm font-black text-purple-600">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">
                        H
                      </span>
                      博主回复
                    </p>

                    <p className="whitespace-pre-wrap pl-7 text-sm leading-7 text-slate-700">
                      {comment.author_reply}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
      </div>

      <form onSubmit={handleSubmit} className="comment-glass rounded-[1.75rem] p-6 sm:p-8">
        <div className="comment-inner">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Send Signal
            </p>
            <h3 className="mt-3 text-xl font-black text-slate-900">
              发表你的看法
            </h3>
          </div>

          <div className="grid gap-5">
            <input
              type="text"
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="comment-input text-sm font-semibold"
              maxLength={20}
              required
            />

            <textarea
              placeholder="写下你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="comment-input min-h-[130px] resize-y text-sm leading-7"
              maxLength={500}
              required
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-400">
              昵称最多 20 字，评论最多 500 字。发送后会显示在当前随笔下方。
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim() || !content.trim()}
              className="comment-action-button"
            >
              {isSubmitting ? '发送中...' : '发射评论 🚀'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function formatDateTime(input?: string | null) {
  if (!input) return '刚刚';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

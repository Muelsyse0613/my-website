import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 60;

export default async function MomentsPage() {
  const { data: moments } = await supabase
    .from('moments')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800">
      <nav className="max-w-5xl mx-auto px-6 py-8">
        <a href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          返回主页
        </a>
      </nav>

      <header className="max-w-5xl mx-auto px-6 mb-10">
        <h1 className="text-3xl font-extrabold">📸 瞬间</h1>
        <p className="text-gray-500 mt-2">随手拍下生活里的碎片，给朋友们看看。</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {(!moments || moments.length === 0) ? (
          <div className="text-center py-20 text-gray-400 italic">
            还没有任何瞬间，去后台传一张吧。
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {moments.map((m: any) => (
              <div
                key={m.id}
                className="break-inside-avoid bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
              >
                <a href={m.image_url} target="_blank" rel="noreferrer">
                  <img
                    src={m.image_url}
                    alt={m.caption || '瞬间照片'}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </a>
                {(
                  <div className="p-4">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.location && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                          {m.location}
                        </span>
                      )}
                      {m.mood && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          {m.mood}
                        </span>
                      )}
                    </div>
                    {m.caption && <p className="text-sm text-gray-600 leading-relaxed">{m.caption}</p>}
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                      {new Date(m.taken_at || m.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {m.tags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(Array.isArray(m.tags) ? m.tags : String(m.tags).split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)).map((tag: string) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

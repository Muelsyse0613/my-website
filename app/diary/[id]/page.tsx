import { createClient } from '@supabase/supabase-js';
// ✨ 1. 引入我们刚刚做好的评论区小组件
import CommentSection from './CommentSection';

// 1. 拿出钥匙
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. 告诉系统，这里的 params 需要"稍微等一下"才能拿到
export default async function DiaryPost({ params }: { params: Promise<{ id: string }> }) {
  
  // 3. 加上 await，耐心地把真实 ID 从网址里解包出来
  const { id } = await params;

  // 4. 带着真正的 ID 去云端抓数据（顺带拉取分类名称）
  const { data: diary } = await supabase.from('diaries').select('*, categories(name)').eq('id', id).single();

  if (!diary) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-500">Oops！这篇日记好像飞进黑洞了...</p>
      </div>
    );
  }

  // 5. 完美展示数据
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800 selection:bg-purple-200">
      
      <nav className="max-w-3xl mx-auto px-6 py-8">
        <a href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          返回主页
        </a>
      </nav>

      <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-gray-100">
        <h1 className="text-4xl font-extrabold leading-tight mb-4">{diary.title}</h1>
        <div className="flex items-center text-gray-400 text-sm font-mono">
          <span>{diary.date}</span>
          <span className="mx-3">·</span>
          <span>{diary.categories?.name || '随笔日记'}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        {/* 直接渲染富文本编辑器生成的 HTML 代码，并套用定制样式 */}
        <div 
          className="text-gray-600 leading-relaxed custom-quill-content"
          dangerouslySetInnerHTML={{ __html: diary.content }} 
        />
        
        {/* ✨ 2. 挂载评论区组件，紧贴在文章正文下方 */}
        <CommentSection postId={id} />

      </main>

      {/* 补充魔法：保护富文本编辑器里的图片、列表和标题样式不被屏蔽 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-quill-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .custom-quill-content p {
            margin-bottom: 1rem;
            line-height: 1.8;
          }
          .custom-quill-content h1, 
          .custom-quill-content h2, 
          .custom-quill-content h3 {
            color: #1f2937;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .custom-quill-content h1 { font-size: 1.875rem; }
          .custom-quill-content h2 { font-size: 1.5rem; }
          .custom-quill-content h3 { font-size: 1.25rem; }
          .custom-quill-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }
          .custom-quill-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }
          .custom-quill-content a {
            color: #9333ea;
            text-decoration: underline;
            text-underline-offset: 4px;
          }
          .custom-quill-content strong {
            color: #111827;
            font-weight: 600;
          }
          .custom-quill-content blockquote {
            border-left: 4px solid #d8b4fe;
            padding-left: 1rem;
            color: #6b7280;
            font-style: italic;
            margin: 1.5rem 0;
            background: #fdfaef;
          }
        `
      }} />

    </div>
  );
}


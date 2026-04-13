import { createClient } from '@supabase/supabase-js';
import VisitorHeatmap from './VisitorHeatMap';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 0;

export default async function Home() {
  const { data: diaries } = await supabase
  .from('diaries')
  .select('*')
  .order('date', { ascending: false }) // 第一优先级：按你在表单填写的日期排（新的在前）
  .order('created_at', { ascending: false }); // 第二优先级：如果日期相同，按精确的发布时间排（晚发的在前）

  const { data: timelines } = await supabase
    .from('timeline')
    .select('*')
    .order('date', { ascending: false });

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-800 font-sans flex flex-col">
      <header className="relative h-64 flex items-center justify-center overflow-hidden bg-gradient-to-r from-blue-100 to-purple-100 shrink-0">
        <div className="text-center z-10">
          <h1 className="text-4xl font-bold text-gray-800 tracking-wider mb-2">我的个人宇宙</h1>
          <p className="text-gray-600">生活、学习与碎碎念</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 mt-8 grid md:grid-cols-3 gap-12 flex-grow">
        {/* 左侧栏 */}
        <section className="md:col-span-1">
          {/* 时光轨迹 */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center">
              {/* 全换成div，彻底告别span玄学 */}
              <div className="shrink-0 w-2 h-6 bg-blue-400 rounded-full mr-3"></div>
              时光轨迹
            </h2>

            <div className="max-h-[500px] overflow-y-auto pr-4 space-y-8 ml-2 border-l-2 border-gray-200 pl-6 relative custom-scrollbar">
              {timelines?.map((item) => (
                <div key={item.id} className="relative">
                  <div className={`absolute w-3 h-3 rounded-full -left-[31px] top-1.5 shadow-[0_0_0_4px_white] 
                    ${item.link_url ? 'bg-blue-500' : 'bg-gray-300'} 
                    transition-all duration-500 hover:shadow-purple-100 hover:-translate-y-0.5`}
                  ></div>
                  <p className="text-sm text-gray-400 font-mono">{item.date}</p>
                  {item.title && <p className="font-medium mt-1 text-lg">{item.title}</p>}
                  {item.description && <p className="text-gray-500 text-sm mt-1">{item.description}</p>}
                  {item.link_url && (
                    <a href={item.link_url} className="inline-flex items-center mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 105.656 5.656l-1.1 1.1"></path>
                      </svg>
                      阅读这篇随笔
                    </a>
                  )}
                </div>
              ))}
              {(!timelines || timelines.length === 0) && (
                <p className="text-gray-400 italic text-sm">时间轴还在构建中...</p>
              )}
            </div>
          </div>

          {/* 留言板 */}
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              {/* div+shrink-0，绿条必现！ */}
              <div className="shrink-0 w-2 h-6 bg-green-400 rounded-full mr-3"></div>
              留言板
            </h2>
            <div className="ml-2 pl-6">
              <a href="/guestbook" 
                className="group text-gray-500 hover:text-purple-500 transition-colors text-sm flex items-center">
                <svg className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                来我的留言板坐坐 →
              </a>
            </div>
          </div>

          {/* 访客足迹热力图 */}
          <div className="mt-16">
            <VisitorHeatmap />
          </div>
        </section>

        {/* 右侧：最新随笔 */}
        <section className="md:col-span-2">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            {/* 统一全换div */}
            <div className="shrink-0 w-2 h-6 bg-purple-400 rounded-full mr-3"></div>
            最新随笔
          </h2>

          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
            {diaries?.map((diary) => (
              <a key={diary.id} href={`/diary/${diary.id}`} 
                className="block group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-600 transition-colors">{diary.title}</h3>
                <p className="text-sm text-gray-400 mb-3 font-mono">{diary.date}</p>
                <p className="text-gray-600 line-clamp-2">{diary.summary}</p>
                <div className="mt-4 text-sm font-medium text-purple-500 flex items-center">
                  阅读全文 
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </a>
            ))}
            {(!diaries || diaries.length === 0) && (
              <p className="text-gray-400 italic text-center py-10">这里还空空如也，去后台写第一篇随笔吧！</p>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-16 pb-8 text-center">
        <div className="border-t border-gray-200 max-w-5xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 px-6">
          <p>© 2026 我的个人宇宙. All rights reserved.</p>
          <a href="/secret" className="mt-4 md:mt-0 group flex items-center hover:text-purple-500 transition-colors">
            <svg className="w-4 h-4 mr-1 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
            <span>访客止步</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
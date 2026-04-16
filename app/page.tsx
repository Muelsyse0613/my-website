import { createClient } from '@supabase/supabase-js';
import VisitorHeatmap from './VisitorHeatMap';
import DiaryList from './DiaryList';
import SplashScreen from './SplashScreen';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 0;

export default async function Home() {
  const { data: diaries } = await supabase
  .from('diaries')
  .select('*, categories(name)')
  .order('date', { ascending: false })
  .order('created_at', { ascending: false });

  const { data: timelines } = await supabase
    .from('timeline')
    .select('*')
    .order('date', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // 半圆点的通用样式，直接写 borderRadius 绕过 Tailwind JIT
  const halfDotStyle: React.CSSProperties = {
    width: '6px',
    height: '12px',
    left: '-26px',
    top: '6px',
    borderTopRightRadius: '9999px',
    borderBottomRightRadius: '9999px',
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0',
  };

  return (
  <div className="min-h-screen bg-[#fafafa] text-gray-800 font-sans flex flex-col">
    {/* ✨ 加上入场动画 */}
    <SplashScreen />

    <header className="relative h-64 flex items-center justify-center overflow-hidden bg-gradient-to-r from-blue-100 to-purple-100 shrink-0">
      <div className="text-center z-10">
        {/* ✨ 加上 id，让 SplashScreen 能测量标题位置 */}
        <h1 id="header-title" className="text-4xl font-bold text-gray-800 tracking-wider mb-2">我的个人宇宙</h1>
        <p className="text-gray-600">生活、学习与碎碎念</p>
      </div>
    </header>
    {/* ...后面的代码不用动... */}


      <main className="max-w-5xl mx-auto p-6 mt-8 grid md:grid-cols-3 gap-12 flex-grow">
        {/* 左侧栏 */}
        <section className="md:col-span-1">
          {/* 时光轨迹 */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <div className="shrink-0 w-2 h-6 bg-blue-400 rounded-full mr-3"></div>
              时光轨迹
            </h2>

            <div className="max-h-[500px] overflow-y-auto pr-4 py-2 custom-scrollbar">
              <div className="ml-4 pl-6 space-y-8 relative timeline-container-wave">
                {timelines?.map((item, index) => (
                  <div key={item.id} className="relative">
                    {index === 0 ? (
                      /* 最新节点：右侧真半圆 + 呼吸光晕 */
                      <div
                        className="absolute bg-blue-500 timeline-dot-glow z-10"
                        style={halfDotStyle}
                      ></div>
                    ) : (
                      /* 其余节点：右侧真半圆 */
                      <div
                        className={`absolute z-10 transition-all duration-500 hover:-translate-y-0.5
                          ${item.link_url ? 'bg-blue-500' : 'bg-gray-300'}`}
                        style={halfDotStyle}
                      ></div>
                    )}
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
          </div>

          {/* 留言板 */}
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <div className="shrink-0 w-2 h-6 bg-teal-400 rounded-full mr-3"></div>
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

        {/* 右侧：最新随笔（含分类标签） */}
        <DiaryList diaries={diaries || []} categories={categories || []} />
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

      {/* 时光轨迹最新节点的呼吸发光动画，以及线条脉冲动画 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 1. 圆点纯净呼吸光晕 */
          @keyframes dotGlow {
            0%, 100% { box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.7); }
          }
          .timeline-dot-glow {
            animation: dotGlow 1.5s ease-in-out infinite;
          }

          /* 2. 底层静态渐变线条：从第一个节点顶部开始，末端自然淡出 */
          .timeline-container-wave::before {
            content: '';
            position: absolute;
            top: 6px;
            bottom: 0;
            left: -2px;
            width: 2px;
            background: linear-gradient(to bottom, #3b82f6 0%, #93c5fd 30%, #d1d5db 65%, transparent 100%);
            z-index: 0;
            pointer-events: none;
          }

          /* 3. 上层动态水波脉冲（由上至下衰减） */
          .timeline-container-wave::after {
            content: '';
            position: absolute;
            top: 6px;
            bottom: 0;
            left: -2px;
            width: 2px;
            background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.9), transparent);
            background-size: 100% 20%;
            background-repeat: no-repeat;
            animation: linePulseWave 2s ease-out infinite;
            z-index: 0;
            pointer-events: none;
          }

          /* 4. 脉冲动画逻辑：移动位置 + 透明度衰减 */
          @keyframes linePulseWave {
            0% { background-position: 0 -20%; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 0.1; }
            100% { background-position: 0 120%; opacity: 0; }
          }
        `
      }} />
    </div>
  );
}


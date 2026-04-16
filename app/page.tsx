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
      <SplashScreen />

      {/* ⭐️ 所有 keyframes 提前定义,放在 header 之前 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* ===== Header 光斑：长途漂移、互相穿越 ===== */
          @keyframes headerBlob1 {
            0%   { transform: translate(0px, 0px) scale(1); }
            14%  { transform: translate(180px, 30px) scale(1.1); }
            28%  { transform: translate(380px, 70px) scale(1.05); }
            42%  { transform: translate(560px, 40px) scale(0.95); }
            57%  { transform: translate(650px, -10px) scale(1.12); }
            71%  { transform: translate(450px, -40px) scale(1.08); }
            85%  { transform: translate(180px, -20px) scale(0.92); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes headerBlob2 {
            0%   { transform: translate(0px, 0px) scale(1); }
            14%  { transform: translate(-200px, 50px) scale(1.08); }
            28%  { transform: translate(-420px, 30px) scale(0.9); }
            42%  { transform: translate(-600px, 70px) scale(1.15); }
            57%  { transform: translate(-550px, 120px) scale(1.05); }
            71%  { transform: translate(-320px, 100px) scale(0.95); }
            85%  { transform: translate(-100px, 40px) scale(1.1); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes headerBlob3 {
            0%   { transform: translate(0px, 0px) scale(1); }
            14%  { transform: translate(220px, -40px) scale(0.92); }
            28%  { transform: translate(400px, -100px) scale(1.1); }
            42%  { transform: translate(280px, -150px) scale(1.15); }
            57%  { transform: translate(-50px, -130px) scale(1.05); }
            71%  { transform: translate(-280px, -80px) scale(0.95); }
            85%  { transform: translate(-150px, -20px) scale(1.08); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes headerBlob4 {
            0%   { transform: translate(0px, 0px) scale(1); }
            14%  { transform: translate(-230px, -50px) scale(1.12); }
            28%  { transform: translate(-480px, -90px) scale(0.9); }
            42%  { transform: translate(-680px, -50px) scale(1.1); }
            57%  { transform: translate(-620px, 30px) scale(1.05); }
            71%  { transform: translate(-400px, 70px) scale(0.95); }
            85%  { transform: translate(-150px, 40px) scale(1.08); }
            100% { transform: translate(0px, 0px) scale(1); }
          }

          /* 底层渐变潮汐漂移 */
          @keyframes headerBgShift {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }

          /* 光斑整体"大河"漂移 */
          @keyframes headerBlobGroup {
            0%, 100% { transform: translate(0, 0); }
            25%      { transform: translate(40px, -15px); }
            50%      { transform: translate(-30px, 20px); }
            75%      { transform: translate(-50px, -10px); }
          }

          /* ===== 时光轨迹（保持原样） ===== */
          @keyframes dotGlow {
            0%, 100% { box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.4); }
            50%      { box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.7); }
          }
          .timeline-dot-glow { animation: dotGlow 1.5s ease-in-out infinite; }

          .timeline-container-wave::before {
            content: '';
            position: absolute;
            top: 6px; bottom: 0; left: -2px;
            width: 2px;
            background: linear-gradient(to bottom, #3b82f6 0%, #93c5fd 30%, #d1d5db 65%, transparent 100%);
            z-index: 0;
            pointer-events: none;
          }
          .timeline-container-wave::after {
            content: '';
            position: absolute;
            top: 6px; bottom: 0; left: -2px;
            width: 2px;
            background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.9), transparent);
            background-size: 100% 20%;
            background-repeat: no-repeat;
            animation: linePulseWave 2s ease-out infinite;
            z-index: 0;
            pointer-events: none;
          }
          @keyframes linePulseWave {
            0%   { background-position: 0 -20%; opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 0.1; }
            100% { background-position: 0 120%; opacity: 0; }
          }
        `
      }} />

      {/* ✨ 柔和光斑 header */}
      <header
        className="relative h-64 flex items-center justify-center overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(120deg, #dbeafe 0%, #e9e3ff 50%, #f3e8ff 100%)',
          backgroundSize: '200% 200%',
          animationName: 'headerBgShift',
          animationDuration: '28s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        {/* 光斑容器：整组再做一次大慢速漂移 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            isolation: 'isolate',
            animationName: 'headerBlobGroup',
            animationDuration: '45s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            pointerEvents: 'none',
          }}
        >
          {/* 光斑 1 —— 桃粉，向右长途漂移 */}
          <div
            style={{
              position: 'absolute',
              width: '460px',
              height: '460px',
              top: '-140px',
              left: '-100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,170,170,1) 0%, rgba(255,170,170,0) 70%)',
              filter: 'blur(80px)',
              mixBlendMode: 'screen',
              willChange: 'transform',
              animationName: 'headerBlob1',
              animationDuration: '32s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
          {/* 光斑 2 —— 淡紫，向左长途漂移 */}
          <div
            style={{
              position: 'absolute',
              width: '420px',
              height: '420px',
              top: '-100px',
              right: '-40px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(170,150,255,1) 0%, rgba(170,150,255,0) 70%)',
              filter: 'blur(80px)',
              mixBlendMode: 'screen',
              willChange: 'transform',
              animationName: 'headerBlob2',
              animationDuration: '38s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
          {/* 光斑 3 —— 杏黄，绕中心椭圆漂移 */}
          <div
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              bottom: '-140px',
              left: '35%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,210,150,1) 0%, rgba(255,210,150,0) 70%)',
              filter: 'blur(80px)',
              mixBlendMode: 'screen',
              willChange: 'transform',
              animationName: 'headerBlob3',
              animationDuration: '34s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
          {/* 光斑 4 —— 薄荷青，向左长途漂移 */}
          <div
            style={{
              position: 'absolute',
              width: '360px',
              height: '360px',
              bottom: '-130px',
              right: '-80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(140,220,210,1) 0%, rgba(140,220,210,0) 70%)',
              filter: 'blur(80px)',
              mixBlendMode: 'screen',
              willChange: 'transform',
              animationName: 'headerBlob4',
              animationDuration: '30s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
        </div>

        {/* 噪点纹理 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.09,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="text-center z-10 relative">
          <h1 id="header-title" className="text-4xl font-bold text-gray-800 tracking-wider mb-2">
            我的个人宇宙
          </h1>
          <p className="text-gray-600">生活、学习与碎碎念</p>
        </div>
      </header>

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
                      <div
                        className="absolute bg-blue-500 timeline-dot-glow z-10"
                        style={halfDotStyle}
                      ></div>
                    ) : (
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
    </div>
  );
}

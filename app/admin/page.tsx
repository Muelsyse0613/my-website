import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// 引入我们刚刚写的客户端交互组件
import AdminClient from './AdminClient'; 

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  
  // 采用最新版的 getAll / setAll 写法，对 Next.js 15 兼容性最好
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 忽略 Server Component 中设置 cookie 的报错
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ✨ 魔法在这里：这是一个“服务端动作”(Server Action)，专门用来处理退出登录
  const signOut = async () => {
    'use server';
    const cookieStore = await cookies();
    const supabaseAction = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );
    // 销毁云端 Session 并清除浏览器 Cookie
    await supabaseAction.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* 顶部增加了退出登录按钮 */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">站点控制台</h1>
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              站长在线 ({user.email})
            </span>
            
            {/* 触发退出登录的表单 */}
            <form action={signOut}>
              <button type="submit" className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">
                退出登录
              </button>
            </form>
            
            <span className="text-gray-300">|</span>
            
            <a href="/" className="text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors">
              返回前台 →
            </a>
          </div>
        </header>
        
        {/* 渲染所有的增删改查 UI */}
        <AdminClient />
        
      </div>
    </div>
  );
}
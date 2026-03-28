'use client'; // 核心咒语：告诉框架，这个页面有用户互动操作（输入、点击）

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 拿出钥匙（和之前一样）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Guestbook() {
  // 这叫“状态 (State)”，你可以把它们理解为用来存放用户输入内容的“临时变量”
  const [comments, setComments] = useState<any[]>([]);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 功能1：去云端拉取所有留言
  async function fetchComments() {
    const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
    if (data) setComments(data);
  }

  // 页面刚打开时，自动执行一次抓取
  useEffect(() => {
    fetchComments();
  }, []);

  // 功能2：点击发送按钮时执行的动作
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // 阻止浏览器默认的刷新页面的行为
    
    // 拦截器：如果没填名字或内容，就不让发
    if (!nickname.trim() || !message.trim()) {
      alert('名字和留言都不能为空哦！');
      return;
    }

    setIsSubmitting(true); // 让按钮变成“发送中...”的状态

    // 核心大招：往云端的 comments 表里插入一条新数据！
    const { error } = await supabase.from('comments').insert([{ nickname, message }]);

    if (!error) {
      setNickname(''); // 清空名字输入框
      setMessage('');  // 清空留言输入框
      fetchComments(); // 重新拉取一次留言，让刚才发的内容立刻显示在下面！
    } else {
      alert('留言发送失败，请检查网络~');
    }
    
    setIsSubmitting(false); // 恢复按钮状态
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800">
      
      {/* 顶部导航 */}
      <nav className="max-w-3xl mx-auto px-6 py-8">
        <a href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          返回主页
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold mb-4">公共留言板</h1>
          <p className="text-gray-500">随便说点什么吧，无论是打卡、吐槽还是碎碎念，都欢迎留下你的痕迹。</p>
        </header>

        {/* 留言输入表单 */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="你的昵称" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all"
                maxLength={20}
              />
            </div>
            <div>
              <textarea 
                placeholder="想对我说什么..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all min-h-[120px] resize-y"
                maxLength={500}
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gray-800 text-white font-medium py-3 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '发送中...' : '发射留言 🚀'}
            </button>
          </form>
        </div>

        {/* 留言展示区 */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-6">最新足迹 ({comments.length})</h3>
          
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              {/* 左侧的紫色装饰条 */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-300 to-blue-300 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-gray-800">{comment.nickname}</span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-10 text-gray-400 italic">
              还没有人留言，快来抢沙发吧！
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
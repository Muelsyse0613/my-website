'use client';

import { useState } from 'react';
// 引入我们刚才写好的服务端暗箱操作！
import { fetchQuestions, verifyAndDecrypt } from './actions';

type Stage = 'name' | 'not_found' | 'greeting' | 'q1' | 'q2' | 'q3' | 'success' | 'article';

export default function SecretDoor() {
  const [stage, setStage] = useState<Stage>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  
  // 用于收集用户的 3 个答案
  const [answers, setAnswers] = useState({ a1: '', a2: '', a3: '' });
  
  // 只存放从服务器拿到的安全数据（问题列表）
  const [vipData, setVipData] = useState<any>(null);
  
  // 存放最终解密成功的文章
  const [article, setArticle] = useState<any>(null);
  
  const [animationClass, setAnimationClass] = useState('animate-fade-in');

  const triggerSlide = (nextStage: Stage) => {
    setAnimationClass(''); 
    setTimeout(() => {
      setStage(nextStage);
      setAnimationClass('animate-slide-in-right');
      setCurrentAnswer(''); 
      setError('');
    }, 10);
  };

  // 阶段一：提交姓名，呼叫服务器拿问题
  const checkName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError('');

    // 【安全升级】不再是客户端直连 Supabase，而是请求 Server Action
    const result = await fetchQuestions(name.trim());

    setLoading(false);

    if (!result.success) {
      triggerSlide('not_found');
    } else {
      setVipData(result.vipData);
      triggerSlide('greeting');
    }
  };

  // 阶段二：收集答案并进行最终审判
  const handleAnswerSubmit = async (e: React.FormEvent, qNum: number) => {
    e.preventDefault();
    setError('');
    
    // 暂存当前这道题的答案
    const newAnswers = { ...answers, [`a${qNum}`]: currentAnswer };
    setAnswers(newAnswers);

    // 如果是第一题或第二题，直接进入下一题
    if (qNum === 1) {
      triggerSlide('q2');
    } else if (qNum === 2) {
      triggerSlide('q3');
    } else if (qNum === 3) {
      // ⚠️ 关键时刻：三题全部答完，把收集好的三把钥匙送到服务器进行审判！
      setLoading(true);
      const verifyResult = await verifyAndDecrypt(
        vipData.id, 
        newAnswers.a1, 
        newAnswers.a2, 
        newAnswers.a3
      );
      setLoading(false);

      if (verifyResult.success) {
        // 解密成功！拿到文章
        setArticle(verifyResult.article);
        triggerSlide('success');
      } else {
        // 解密失败！打回原形重新答题
        setError(verifyResult.message || '验证失败');
        // 清空答案，退回第一题重新开始
        setAnswers({ a1: '', a2: '', a3: '' });
        setTimeout(() => triggerSlide('q1'), 1500);
      }
    }
  };

  // --- 渲染部分：解密后的文章正文 ---
  if (stage === 'article' && article) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800 selection:bg-purple-200 animate-fade-in">
        <nav className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => {setStage('name'); setName(''); setArticle(null);}} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            关闭档案并离开
          </button>
        </nav>

        <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-gray-100">
          <div className="mb-4 inline-block px-3 py-1 bg-purple-50 border border-purple-100 text-purple-600 text-xs font-bold rounded-full tracking-wider">
            EXCLUSIVE ARCHIVE
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">{article.title}</h1>
          <div className="flex items-center text-gray-400 text-sm font-mono">
            <span>{article.date}</span>
            <span className="mx-3">·</span>
            <span>致：{vipData.name}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 prose prose-lg prose-purple">
          {article.summary && (
            <p className="text-xl text-gray-500 leading-relaxed mb-8 italic">
              "{article.summary}"
            </p>
          )}
          <div 
            className="text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </main>
      </div>
    );
  }

  // --- 渲染部分：极简验证卡片 ---
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center font-sans overflow-hidden px-4">
      
      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100 max-w-md w-full text-center relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-blue-400"></div>

        <div className="mx-auto w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-6">
          {stage === 'success' ? (
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
          ) : (
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          )}
        </div>

        <div key={stage} className={animationClass}>
          
          {stage === 'name' && (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">访客止步</h1>
              <p className="text-gray-500 text-sm mb-8">
                这里是私人专属的记忆档案馆。<br/>
                如果你认为你在这里，请输入你的真实姓名。
              </p>
              <form onSubmit={checkName} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="你的真实姓名" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-center text-gray-700"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gray-800 text-white font-medium py-3 rounded-xl hover:bg-purple-600 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? '检索中...' : '核对身份'}
                </button>
              </form>
            </>
          )}

          {stage === 'not_found' && (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Oops...</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                这里好像没有你……？<br/>
                也许你可以去拷打开发者，让他把你加上。
              </p>
              <a href="/" className="block w-full bg-gray-100 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors shadow-sm">
                返回主页
              </a>
            </>
          )}

          {stage === 'greeting' && (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{vipData.name}，你好。</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                在查看属于我们的记忆档案之前，<br/>
                请先回答几个问题以证明你是你。
              </p>
              <button 
                onClick={() => triggerSlide('q1')}
                className="w-full bg-gray-800 text-white font-medium py-3 rounded-xl hover:bg-purple-600 transition-colors shadow-sm flex items-center justify-center"
              >
                开始验证
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </button>
            </>
          )}

          {(stage === 'q1' || stage === 'q2' || stage === 'q3') && (
            <>
              <h1 className="text-xl font-bold text-gray-800 mb-6">
                {stage === 'q1' && vipData.q1}
                {stage === 'q2' && vipData.q2}
                {stage === 'q3' && vipData.q3}
              </h1>
              
              <form onSubmit={(e) => handleAnswerSubmit(e, parseInt(stage.charAt(1)))} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="你的答案" 
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-center text-gray-700`}
                  required
                />
                
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-purple-500 text-white font-medium py-3 rounded-xl hover:bg-purple-600 transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? '比对中...' : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>}
                </button>
              </form>
            </>
          )}

          {stage === 'success' && (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{vipData.name}，欢迎。</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                验证通过。<br/>
                这里有一份属于你的故事。
              </p>
              <button 
                onClick={() => setStage('article')}
                className="w-full bg-gray-800 text-white font-medium py-3 rounded-xl hover:bg-purple-600 transition-colors shadow-sm flex items-center justify-center"
              >
                翻开档案
              </button>
            </>
          )}

        </div>

        {stage === 'name' && (
          <div className="mt-8 text-sm">
            <a href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← 返回主页
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
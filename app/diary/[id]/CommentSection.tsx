'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchComments = async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true }); 
    if (data) setComments(data);
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    const { error } = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, nickname: nickname.trim(), content: content.trim() }]);

    setIsSubmitting(false);
    
    if (!error) {
      setNickname('');
      setContent('');
      fetchComments(); 
    } else {
      alert('评论发送失败，请检查网络~');
    }
  };

  return (
    <div className="mt-32 pt-16 border-t border-gray-100">
      <h3 className="text-xl font-bold mb-8 flex items-center text-gray-800">
        <span className="w-2 h-6 bg-purple-400 rounded-full mr-3"></span>
        评论区 ({comments.length})
      </h3>

      <div className="space-y-8 mb-16">
        {comments.map((comment) => (
          /* 【外层卡片】增强阴影 (shadow-md)，使其明显浮在背景上 */
          <div key={comment.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 transition-all hover:shadow-lg">
            
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800 text-base">{comment.nickname}</span>
              <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            
            <p className="text-gray-600 text-base leading-relaxed whitespace-pre-wrap">{comment.content}</p>

            {/* 【内层回复卡片】拉开间距 (mt-6)，使用柔和背景与独立小阴影使其浮在评论内 */}
            {comment.author_reply && (
              <div className="mt-6 bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden">
                {/* 左侧的紫色装饰小彩条，增加精致感 */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-300"></div>
                
                <span className="text-sm font-bold text-purple-600 flex items-center mb-2 pl-2">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                  博主回复：
                </span>
                
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-2">
                  {comment.author_reply}
                </p>
              </div>
            )}
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-12 text-gray-400 italic text-sm bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
            还没有人评论，快来抢沙发吧！
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 space-y-5 relative overflow-hidden">
        {/* 表单顶部的装饰线 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 via-purple-200 to-gray-100"></div>
        
        <h4 className="text-base font-bold text-gray-800 mb-2">发表你的看法</h4>
        <div className="grid grid-cols-1 gap-5">
          <input 
            type="text" 
            placeholder="你的昵称" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all text-sm font-medium"
            maxLength={20}
            required
          />
          <textarea 
            placeholder="写下你的想法..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all min-h-[120px] resize-y text-sm leading-relaxed"
            maxLength={500}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto bg-gray-800 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm shadow-sm"
        >
          {isSubmitting ? '发送中...' : '发射评论 🚀'}
        </button>
      </form>
    </div>
  );
}
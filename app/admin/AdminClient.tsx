'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    // eslint-disable-next-line react/display-name
    return function Comp({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
  { ssr: false, loading: () => <p className="text-gray-400 p-4">编辑器加载中...</p> }
);

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState('diaries');
  const [loading, setLoading] = useState(false);
  
  const [diaries, setDiaries] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [vipList, setVipList] = useState<any[]>([]);
  
  // ✨ 新增：用于存放随笔底部的专属评论
  const [articleComments, setArticleComments] = useState<any[]>([]);

  const [diaryForm, setDiaryForm] = useState({ id: '', title: '', summary: '', content: '', date: '' });
  const [timelineForm, setTimelineForm] = useState({ id: '', date: '', title: '', description: '', link_url: '' });
  const [vipForm, setVipForm] = useState({ id: '', name: '', q1: '', a1: '', q2: '', a2: '', q3: '', a3: '', title: '', summary: '', content: '', date: '' });

  const quillRef = useRef<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'diaries') {
      const { data } = await supabase.from('diaries').select('*').order('created_at', { ascending: false });
      setDiaries(data || []);
    } else if (activeTab === 'timeline') {
      const { data } = await supabase.from('timeline').select('*').order('date', { ascending: false });
      setTimelines(data || []);
      const { data: diariesData } = await supabase.from('diaries').select('id, title, date').order('created_at', { ascending: false });
      setDiaries(diariesData || []);
    } else if (activeTab === 'comments') {
      const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
      setCommentsList(data || []);
    } else if (activeTab === 'article_comments') {
      // ✨ 魔法在这里：不仅拉取评论，还顺带把这篇日记的 title 拉过来！
      const { data } = await supabase.from('post_comments').select('*, diaries(title)').order('created_at', { ascending: false });
      setArticleComments(data || []);
    } else if (activeTab === 'people') {
      const { data } = await supabase.from('vip_files').select('id, name, title, date').order('created_at', { ascending: false });
      setVipList(data || []);
    }
    setLoading(false);
  };

  const saveDiary = async (e: React.FormEvent) => { 
    e.preventDefault();
    setLoading(true);
    const diaryData = { title: diaryForm.title, summary: diaryForm.summary, content: diaryForm.content, date: diaryForm.date };
    if (diaryForm.id) { await supabase.from('diaries').update(diaryData).eq('id', diaryForm.id); alert('更新成功！'); } 
    else { await supabase.from('diaries').insert([diaryData]); alert('发布成功！'); }
    setDiaryForm({ id: '', title: '', summary: '', content: '', date: '' });
    fetchData();
  };

  const deleteDiary = async (id: string) => {
    if (!window.confirm('确定要删除这篇随笔吗？')) return;
    await supabase.from('diaries').delete().eq('id', id);
    fetchData();
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm('确定要删除这条全局留言吗？')) return;
    await supabase.from('comments').delete().eq('id', id);
    alert('已删除');
    fetchData();
  };

  // ✨ 新增：删除随笔评论
  const deleteArticleComment = async (id: string) => {
    if (!window.confirm('确定要删除这条随笔评论吗？恶意内容将彻底被销毁。')) return;
    await supabase.from('post_comments').delete().eq('id', id);
    alert('已粉碎这条评论！');
    fetchData();
  };

  // ✨ 新增：博主回复随笔评论
  const saveAuthorReply = async (id: string, replyContent: string) => {
    if (!replyContent.trim()) {
      if(!window.confirm('回复内容为空，是否清空你之前的回复？')) return;
      replyContent = ''; // 允许通过传空字符串来撤回回复
    }
    setLoading(true);
    await supabase.from('post_comments').update({ author_reply: replyContent === '' ? null : replyContent }).eq('id', id);
    alert('回复成功！');
    fetchData(); 
  };

  const saveTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const timelineData = { title: timelineForm.title, date: timelineForm.date, description: timelineForm.description, link_url: timelineForm.link_url };
    if (timelineForm.id) { await supabase.from('timeline').update(timelineData).eq('id', timelineForm.id); alert('时光轨迹更新成功！'); } 
    else { await supabase.from('timeline').insert([timelineData]); alert('时光轨迹发布成功！'); }
    setTimelineForm({ id: '', date: '', title: '', description: '', link_url: '' });
    fetchData();
  };

  const deleteTimeline = async (id: string) => {
    if (!window.confirm('确定要删除这条轨迹吗？')) return;
    await supabase.from('timeline').delete().eq('id', id);
    fetchData();
  };

  const saveVip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const vipData = { ...vipForm };
    delete (vipData as any).id; 
    vipData.name = vipData.name.trim();

    if (vipForm.id) {
      await supabase.from('vip_files').update(vipData).eq('id', vipForm.id);
      alert('专属档案更新成功！');
    } else {
      await supabase.from('vip_files').insert([vipData]);
      alert('专属档案生成成功！');
    }
    setVipForm({ id: '', name: '', q1: '', a1: '', q2: '', a2: '', q3: '', a3: '', title: '', summary: '', content: '', date: '' });
    fetchData();
  };

  const deleteVip = async (id: string) => {
    if (!window.confirm('确定要销毁这份档案吗？TA 将无法再通过验证。')) return;
    await supabase.from('vip_files').delete().eq('id', id);
    fetchData();
  };

  const uploadImageToSupabase = async (file: File) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `editor/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('blog-images').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(filePath);
    return publicUrl;
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      setLoading(true);
      try {
        const publicUrl = await uploadImageToSupabase(file);
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true) || { index: quill.getLength() };
        quill.insertEmbed(range.index, 'image', publicUrl);
        quill.setSelection(range.index + 1);
      } catch (error) {
        console.error('上传失败:', error);
        alert('上传图片失败，请确认 Supabase Policy 权限已配置。');
      } finally {
        setLoading(false);
      }
    };
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); 
        const file = items[i].getAsFile();
        if (!file) continue;

        setLoading(true);
        try {
          const publicUrl = await uploadImageToSupabase(file);
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true) || { index: quill.getLength() };
          quill.insertEmbed(range.index, 'image', publicUrl);
          quill.setSelection(range.index + 1);
        } catch (error) {
          console.error('粘贴图片上传失败:', error);
          alert('粘贴图片上传失败，请确认权限配置。');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // ✨ 加入了全新的“随笔评论”粉色 Tab
  const tabs = [
    { id: 'diaries', name: '随笔管理', color: 'bg-purple-400' },
    { id: 'timeline', name: '时光轨迹', color: 'bg-blue-400' },
    { id: 'article_comments', name: '随笔评论', color: 'bg-pink-400' },
    { id: 'comments', name: '全局留言板', color: 'bg-green-400' }, 
    { id: 'people', name: '重要人物', color: 'bg-orange-400' },
  ];

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-800 font-sans p-4 md:p-8">
      <style jsx global>{`
        .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #f3f4f6; background: #ffffff; padding: 12px; }
        .ql-container.ql-snow { border: none; min-height: 400px; font-size: 16px; font-family: inherit; }
        .ql-editor { min-height: 400px; padding: 20px; color: #1f2937; }
      `}</style>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8 flex overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap rounded-xl flex items-center justify-center ${activeTab === tab.id ? 'bg-[#fafafa] text-gray-900 shadow-inner' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
            <div className={`shrink-0 w-2 h-5 ${tab.color} rounded-full mr-2 opacity-80`}></div>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto">
        {loading && <p className="text-purple-500 animate-pulse mb-6 text-sm font-medium">正在同步数据...</p>}

        {/* 随笔管理模块 */}
        {activeTab === 'diaries' && (
          <div className="grid lg:grid-cols-5 gap-8">
            <form onSubmit={saveDiary} className="lg:col-span-3 space-y-5">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-purple-400 rounded-full mr-3"></div>{diaryForm.id ? '编辑随笔' : '创作新随笔'}</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <input type="text" placeholder="标题" value={diaryForm.title || ''} onChange={e => setDiaryForm({...diaryForm, title: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-medium" required />
                <input type="date" value={diaryForm.date || ''} onChange={e => setDiaryForm({...diaryForm, date: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-mono text-sm" required />
                <textarea placeholder="摘要 (用于首页展示)" value={diaryForm.summary || ''} onChange={e => setDiaryForm({...diaryForm, summary: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all outline-none h-24 resize-y text-sm" required />
                <div className="bg-[#fafafa] border border-gray-100 rounded-xl overflow-auto resize-y focus-within:ring-4 focus-within:ring-purple-100 focus-within:border-purple-300 focus-within:bg-white transition-all" style={{ minHeight: '450px' }} onPaste={handlePaste}>
                  <ReactQuill forwardedRef={quillRef} theme="snow" value={diaryForm.content || ''} onChange={(content: string) => setDiaryForm({...diaryForm, content})} modules={quillModules} placeholder="在这里尽情排版你的随笔吧...（支持截图后直接 Ctrl+V 粘贴哦！）" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 bg-purple-500 text-white px-6 py-3.5 rounded-xl hover:bg-purple-600 font-medium transition-colors shadow-sm">{diaryForm.id ? '保存修改' : '发布随笔'}</button>
                  {diaryForm.id && <button type="button" onClick={() => setDiaryForm({ id: '', title: '', summary: '', content: '', date: '' })} className="px-6 py-3.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">取消</button>}
                </div>
              </div>
            </form>
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-gray-400 rounded-full mr-3"></div>已发布 ({diaries.length})</h2>
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                {diaries.map(d => (
                  <div key={d.id} className="block group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all">
                    <h3 className="text-lg font-bold mb-1 text-gray-800">{d.title}</h3>
                    <p className="text-sm text-gray-400 mb-4 font-mono">{d.date}</p>
                    <div className="flex gap-3 pt-4 border-t border-gray-50">
                      <button type="button" onClick={() => { setDiaryForm({ id: d.id, title: d.title || '', summary: d.summary || '', content: d.content || '', date: d.date ? d.date.split('T')[0] : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-medium text-purple-500 hover:text-purple-700 transition-colors flex-1 text-left">编辑这篇 →</button>
                      <button type="button" onClick={() => deleteDiary(d.id)} className="text-sm font-medium text-red-400 hover:text-red-600 transition-colors">删除</button>
                    </div>
                  </div>
                ))}
                {diaries.length === 0 && <p className="text-gray-400 italic text-center py-10">这里还空空如也</p>}
              </div>
            </div>
          </div>
        )}

        {/* 时光轨迹模块 */}
        {activeTab === 'timeline' && (
          <div className="grid lg:grid-cols-5 gap-8">
            <form onSubmit={saveTimeline} className="lg:col-span-3 space-y-5">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-blue-400 rounded-full mr-3"></div>{timelineForm.id ? '编辑时光轨迹' : '记录新轨迹'}</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <input type="text" placeholder="事件标题" value={timelineForm.title || ''} onChange={e => setTimelineForm({...timelineForm, title: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-medium" required />
                <input type="date" value={timelineForm.date || ''} onChange={e => setTimelineForm({...timelineForm, date: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono text-sm" required />
                <textarea placeholder="简要描述..." value={timelineForm.description || ''} onChange={e => setTimelineForm({...timelineForm, description: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none h-32 resize-y text-sm" required />
                <div className="space-y-2">
                  <input type="text" placeholder="相关链接 (直接输入网址，或从下方选择本站随笔)" value={timelineForm.link_url || ''} onChange={e => setTimelineForm({...timelineForm, link_url: e.target.value})} className="w-full p-4 bg-[#fafafa] border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm" />
                  {diaries.length > 0 && (
                    <select className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 focus:outline-none focus:border-blue-300 text-sm cursor-pointer transition-colors hover:bg-blue-100" onChange={(e) => { if (e.target.value) { setTimelineForm({...timelineForm, link_url: `/diary/${e.target.value}`}); } }} value="">
                      <option value="">✨ 快速关联本站已发布的随笔...</option>
                      {diaries.map(d => ( <option key={d.id} value={d.id}>{d.title} ({d.date})</option> ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-500 text-white px-6 py-3.5 rounded-xl hover:bg-blue-600 font-medium transition-colors shadow-sm">{timelineForm.id ? '保存修改' : '发布轨迹'}</button>
                  {timelineForm.id && <button type="button" onClick={() => setTimelineForm({ id: '', date: '', title: '', description: '', link_url: '' })} className="px-6 py-3.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">取消</button>}
                </div>
              </div>
            </form>
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-gray-400 rounded-full mr-3"></div>已有轨迹 ({timelines.length})</h2>
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                {timelines.map(t => (
                  <div key={t.id} className="block group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all relative pl-8">
                    <div className="absolute left-4 top-8 bottom-[-16px] w-px bg-blue-100 group-last:hidden"></div>
                    <div className="absolute left-[11px] top-6 w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-white"></div>
                    <h3 className="text-lg font-bold mb-1 text-gray-800">{t.title}</h3>
                    <p className="text-sm text-gray-400 mb-2 font-mono">{t.date}</p>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{t.description}</p>
                    {t.link_url && <p className="text-xs text-blue-500 font-mono truncate mb-2">📎 {t.link_url}</p>}
                    <div className="flex gap-3 pt-4 border-t border-gray-50">
                      <button type="button" onClick={() => { setTimelineForm({ id: t.id, title: t.title || '', description: t.description || '', link_url: t.link_url || '', date: t.date ? t.date.split('T')[0] : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-medium text-blue-500 hover:text-blue-700 transition-colors flex-1 text-left">编辑轨迹 →</button>
                      <button type="button" onClick={() => deleteTimeline(t.id)} className="text-sm font-medium text-red-400 hover:text-red-600 transition-colors">删除</button>
                    </div>
                  </div>
                ))}
                {timelines.length === 0 && <p className="text-gray-400 italic text-center py-10">这里还空空如也</p>}
              </div>
            </div>
          </div>
        )}

        {/* ✨ 新增的随笔评论专属控制台模块 */}
        {activeTab === 'article_comments' && (
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-pink-400 rounded-full mr-3"></div>随笔专属评论管理</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {articleComments.map(msg => (
                <div key={msg.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-bold text-gray-800">{msg.nickname || '匿名访客'}</span>
                        <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                          {msg.diaries?.title || '未知随笔'}
                        </span>
                      </div>
                      <button onClick={() => deleteArticleComment(msg.id)} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors ml-4 shrink-0">粉碎评论</button>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{msg.content}</p>
                    
                    {/* 如果已有博主回复，直接展示出来 */}
                    {msg.author_reply && (
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 mb-4">
                        <span className="text-xs font-bold text-purple-600 block mb-1">我的回复：</span>
                        <p className="text-sm text-gray-700">{msg.author_reply}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* 回复输入框，提交时呼叫 saveAuthorReply */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem('reply') as HTMLInputElement;
                      saveAuthorReply(msg.id, input.value);
                      form.reset(); // 发送完清空输入框
                    }}
                    className="flex gap-2 mt-4 pt-4 border-t border-gray-50"
                  >
                    <input 
                      name="reply" 
                      type="text" 
                      placeholder={msg.author_reply ? "修改回复内容..." : "回复这条评论..."} 
                      className="flex-1 px-4 py-2 bg-[#fafafa] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all" 
                    />
                    <button type="submit" className="px-5 py-2 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-colors shadow-sm shrink-0">
                      {msg.author_reply ? '更新' : '发送'}
                    </button>
                  </form>
                </div>
              ))}
              {articleComments.length === 0 && <p className="text-gray-400 col-span-full py-10">目前还没有人给随笔留言。</p>}
            </div>
          </div>
        )}

        {/* 之前的全局留言板管理保持不变 */}
        {activeTab === 'comments' && (
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-green-400 rounded-full mr-3"></div>全局留言板清理</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {commentsList.map(msg => (
                <div key={msg.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-gray-800">{msg.nickname || '匿名访客'}</span>
                    <button onClick={() => deleteComment(msg.id)} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">删除</button>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{msg.content || msg.message}</p>
                  <p className="text-xs text-gray-400 font-mono">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
              ))}
              {commentsList.length === 0 && <p className="text-gray-400 col-span-full py-10">目前没有留言。</p>}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="grid lg:grid-cols-5 gap-8">
            <form onSubmit={saveVip} className="lg:col-span-3 space-y-5">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-orange-400 rounded-full mr-3"></div>{vipForm.id ? '编辑绝密档案' : '新建绝密档案'}</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="space-y-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                  <h3 className="text-sm font-bold text-orange-600">阶段一：姓名识别</h3>
                  <input type="text" placeholder="对方的真实姓名" value={vipForm.name || ''} onChange={e => setVipForm({...vipForm, name: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none font-medium" required />
                </div>
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-600">阶段二：专属回忆验证 (答案需完全一致)</h3>
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex gap-2">
                      <input type="text" placeholder={`问题 ${num}`} value={(vipForm as any)[`q${num}`] || ''} onChange={e => setVipForm({...vipForm, [`q${num}`]: e.target.value})} className="w-2/3 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none text-sm" required />
                      <input type="text" placeholder={`答案 ${num}`} value={(vipForm as any)[`a${num}`] || ''} onChange={e => setVipForm({...vipForm, [`a${num}`]: e.target.value})} className="w-1/3 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none text-sm" required />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b pb-2">阶段三：解锁的文章内容</h3>
                  <input type="text" placeholder="文章标题" value={vipForm.title || ''} onChange={e => setVipForm({...vipForm, title: e.target.value})} className="w-full p-3 bg-[#fafafa] border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none font-medium" required />
                  <input type="date" value={vipForm.date || ''} onChange={e => setVipForm({...vipForm, date: e.target.value})} className="w-full p-3 bg-[#fafafa] border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none text-sm font-mono" required />
                  <textarea placeholder="文章摘要" value={vipForm.summary || ''} onChange={e => setVipForm({...vipForm, summary: e.target.value})} className="w-full p-3 bg-[#fafafa] border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none h-20 resize-y text-sm" required />
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl overflow-auto resize-y focus-within:ring-2 focus-within:ring-orange-200 transition-all" style={{ minHeight: '400px' }} onPaste={handlePaste}>
                    <ReactQuill forwardedRef={quillRef} theme="snow" value={vipForm.content || ''} onChange={(content: string) => setVipForm({...vipForm, content})} modules={quillModules} placeholder="写下只有 TA 能看到的故事...（支持图片上传和直接粘贴）" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={loading} className="flex-1 bg-[#f97316] text-white px-6 py-3.5 rounded-xl hover:bg-[#ea580c] font-medium transition-colors shadow-sm">{vipForm.id ? '保存档案修改' : '封存绝密档案'}</button>
                  {vipForm.id && <button type="button" onClick={() => setVipForm({ id: '', name: '', q1: '', a1: '', q2: '', a2: '', q3: '', a3: '', title: '', summary: '', content: '', date: '' })} className="px-6 py-3.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">取消</button>}
                </div>
              </div>
            </form>
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-6 flex items-center"><div className="shrink-0 w-2 h-6 bg-gray-400 rounded-full mr-3"></div>已封存档案 ({vipList.length})</h2>
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                {vipList.map(v => (
                  <div key={v.id} className="block bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative">
                    <h3 className="text-lg font-bold mb-1 text-gray-800 flex justify-between">{v.name} <span className="text-[10px] font-mono text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-100">ENCRYPTED</span></h3>
                    <p className="text-sm text-gray-500 mb-4">{v.title}</p>
                    <div className="flex gap-3 pt-3 border-t border-gray-50">
                      <button type="button" onClick={async () => { const { data } = await supabase.from('vip_files').select('*').eq('id', v.id).single(); if (data) setVipForm(data); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-medium text-[#f97316] hover:text-[#ea580c] transition-colors flex-1 text-left">解密并编辑 →</button>
                      <button type="button" onClick={() => deleteVip(v.id)} className="text-sm font-medium text-red-400 hover:text-red-600 transition-colors">销毁</button>
                    </div>
                  </div>
                ))}
                {vipList.length === 0 && <p className="text-gray-400 italic text-center py-10">名单还是空的，快去添加吧！</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
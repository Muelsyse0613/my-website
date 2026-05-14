'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    // eslint-disable-next-line react/display-name
    return function Comp({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
  {
    ssr: false,
    loading: () => <p className="p-4 text-gray-400">编辑器加载中...</p>,
  }
);

function getTodayInShanghai(): string {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = shanghai.getUTCFullYear();
  const m = String(shanghai.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shanghai.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getShanghaiYearMonth(): { year: number; month: number } {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return {
    year: shanghai.getUTCFullYear(),
    month: shanghai.getUTCMonth() + 1,
  };
}

const COLOR_PRESETS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#14b8a6',
  '#ef4444',
  '#6366f1',
  '#84cc16',
];

const DEFAULT_HOME_PROFILE = {
  id: '',
  hero_kicker: 'PERSONAL OBSERVATORY',
  hero_title: '我的个人宇宙',
  hero_subtitle: '生活、学习、随笔、瞬间与一些缓慢发光的日常。',
  status_text: '稳定运行中',
  current_location: '地球 · 某处',
  current_focus: '整理生活与知识的轨道',
  current_mood: '温和、清醒、缓慢推进',
  current_learning: '高数 / 电路 / 代码',
  current_writing: '个人网站重构记录',
  current_playing: '明日方舟',
  quote: '把日常保存成一颗颗可以重新抵达的星。',
  quote_author: 'hsy',
  site_started_at: '',
};

type HomeProfileForm = typeof DEFAULT_HOME_PROFILE;

type NowStatusForm = {
  id: string;
  label: string;
  value: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY_NOW_STATUS: NowStatusForm = {
  id: '',
  label: '',
  value: '',
  emoji: '',
  sort_order: 0,
  is_active: true,
};

type DiaryForm = {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  category_id: string;
  cover_image_url: string;
  status: 'published' | 'draft' | 'hidden';
  is_featured: boolean;
  is_pinned: boolean;
  slug: string;
  reading_minutes: number;
};

const EMPTY_DIARY_FORM: DiaryForm = {
  id: '',
  title: '',
  summary: '',
  content: '',
  date: '',
  category_id: '',
  cover_image_url: '',
  status: 'published',
  is_featured: false,
  is_pinned: false,
  slug: '',
  reading_minutes: 0,
};

type TimelineForm = {
  id: string;
  date: string;
  title: string;
  description: string;
  link_url: string;
  type: string;
  importance: number;
  icon: string;
  image_url: string;
  is_featured: boolean;
};

const EMPTY_TIMELINE_FORM: TimelineForm = {
  id: '',
  date: '',
  title: '',
  description: '',
  link_url: '',
  type: 'life',
  importance: 3,
  icon: '',
  image_url: '',
  is_featured: true,
};

type MomentForm = {
  id: string;
  caption: string;
  image_url: string;
  taken_at: string;
  location: string;
  mood: string;
  tags: string;
  is_featured: boolean;
};

const EMPTY_MOMENT_FORM: MomentForm = {
  id: '',
  caption: '',
  image_url: '',
  taken_at: '',
  location: '',
  mood: '',
  tags: '',
  is_featured: true,
};

const inputBase =
  'w-full rounded-xl border border-gray-100 bg-[#fafafa] p-4 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100';
const smallInputBase =
  'w-full rounded-xl border border-gray-100 bg-[#fafafa] px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100';

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const [diaries, setDiaries] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [articleComments, setArticleComments] = useState<any[]>([]);
  const [vipList, setVipList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [homeProfile, setHomeProfile] = useState<HomeProfileForm>(DEFAULT_HOME_PROFILE);
  const [nowStatuses, setNowStatuses] = useState<any[]>([]);
  const [nowStatusForm, setNowStatusForm] = useState<NowStatusForm>(EMPTY_NOW_STATUS);

  const [checkinItems, setCheckinItems] = useState<any[]>([]);
  const [checkinRecords, setCheckinRecords] = useState<any[]>([]);
  const [checkinForm, setCheckinForm] = useState({
    id: '',
    name: '',
    description: '',
    theme_color: '#10b981',
    emoji: '',
    sort_order: 0,
  });

  const [diaryForm, setDiaryForm] = useState<DiaryForm>(EMPTY_DIARY_FORM);
  const [timelineForm, setTimelineForm] = useState<TimelineForm>(EMPTY_TIMELINE_FORM);

  const [moments, setMoments] = useState<any[]>([]);
  const [momentForm, setMomentForm] = useState<MomentForm>(EMPTY_MOMENT_FORM);
  const [momentUploading, setMomentUploading] = useState(false);
  const [diaryCoverUploading, setDiaryCoverUploading] = useState(false);
  const [timelineImageUploading, setTimelineImageUploading] = useState(false);

  const [vipForm, setVipForm] = useState({
    id: '',
    name: '',
    q1: '',
    a1: '',
    q2: '',
    a2: '',
    q3: '',
    a3: '',
    title: '',
    summary: '',
    content: '',
    date: '',
  });

  const quillRef = useRef<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabs = [
    { id: 'overview', name: '总览', color: 'bg-gray-400' },
    { id: 'home', name: '首页配置', color: 'bg-sky-400' },
    { id: 'diaries', name: '随笔管理', color: 'bg-purple-400' },
    { id: 'timeline', name: '时光轨迹', color: 'bg-blue-400' },
    { id: 'checkin', name: '每日打卡', color: 'bg-teal-400' },
    { id: 'moments', name: '瞬间', color: 'bg-rose-400' },
    { id: 'article_comments', name: '随笔评论', color: 'bg-pink-400' },
    { id: 'comments', name: '全局留言板', color: 'bg-green-400' },
    { id: 'people', name: '重要人物', color: 'bg-orange-400' },
  ];

  const fetchHomeData = async () => {
    const { data: profileData } = await supabase
      .from('home_profile')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileData) {
      setHomeProfile({
        ...DEFAULT_HOME_PROFILE,
        ...profileData,
        site_started_at: profileData.site_started_at ? String(profileData.site_started_at).split('T')[0] : '',
      });
    } else {
      setHomeProfile(DEFAULT_HOME_PROFILE);
    }

    const { data: nowData } = await supabase
      .from('now_status')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    setNowStatuses(nowData || []);
  };

  const fetchOverviewData = async () => {
    await Promise.all([
      fetchHomeData(),
      supabase.from('diaries').select('id, title, status, is_featured, is_pinned, created_at').order('created_at', { ascending: false }).then(({ data }) => setDiaries(data || [])),
      supabase.from('timeline').select('id, title, is_featured, created_at').order('created_at', { ascending: false }).then(({ data }) => setTimelines(data || [])),
      supabase.from('moments').select('id, caption, is_featured, created_at').order('created_at', { ascending: false }).then(({ data }) => setMoments(data || [])),
      supabase.from('comments').select('id, created_at').order('created_at', { ascending: false }).then(({ data }) => setCommentsList(data || [])),
      supabase.from('post_comments').select('id, status, author_reply, created_at').order('created_at', { ascending: false }).then(({ data }) => setArticleComments(data || [])),
      supabase.from('checkin_items').select('*').order('sort_order', { ascending: true }).then(({ data }) => setCheckinItems(data || [])),
    ]);
  };

  const fetchData = async () => {
    setLoading(true);

    if (activeTab === 'overview') {
      await fetchOverviewData();
    } else if (activeTab === 'home') {
      await fetchHomeData();
      const { data: diariesData } = await supabase
        .from('diaries')
        .select('id, title, date, status')
        .order('created_at', { ascending: false });
      setDiaries(diariesData || []);
    } else if (activeTab === 'diaries') {
      const { data } = await supabase
        .from('diaries')
        .select('*, categories(name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      setDiaries(data || []);
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      setCategories(catData || []);
    } else if (activeTab === 'timeline') {
      const { data } = await supabase.from('timeline').select('*').order('date', { ascending: false });
      setTimelines(data || []);
      const { data: diariesData } = await supabase
        .from('diaries')
        .select('id, title, date')
        .order('created_at', { ascending: false });
      setDiaries(diariesData || []);
    } else if (activeTab === 'comments') {
      const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
      setCommentsList(data || []);
    } else if (activeTab === 'article_comments') {
      const { data } = await supabase
        .from('post_comments')
        .select('*, diaries(title)')
        .order('created_at', { ascending: false });
      setArticleComments(data || []);
    } else if (activeTab === 'people') {
      const { data } = await supabase
        .from('vip_files')
        .select('id, name, title, date')
        .order('created_at', { ascending: false });
      setVipList(data || []);
    } else if (activeTab === 'checkin') {
      const { data: itemsData } = await supabase
        .from('checkin_items')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      setCheckinItems(itemsData || []);

      const { year, month } = getShanghaiYearMonth();
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const { data: recordsData } = await supabase
        .from('checkin_records')
        .select('*')
        .gte('checked_date', firstDay)
        .lt('checked_date', nextMonth)
        .order('checked_at', { ascending: false });
      setCheckinRecords(recordsData || []);
    } else if (activeTab === 'moments') {
      const { data } = await supabase.from('moments').select('*').order('created_at', { ascending: false });
      setMoments(data || []);
    }

    setLoading(false);
  };

  const uploadImageToSupabase = async (file: File) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Math.random().toString(36).slice(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `editor/${fileName}`;
    const { error } = await supabase.storage.from('blog-images').upload(filePath, file);
    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabase.storage.from('blog-images').getPublicUrl(filePath);
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
        alert('上传图片失败，请确认 Supabase Storage Policy 权限已配置。');
      } finally {
        setLoading(false);
      }
    };
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.includes('image')) {
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

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  const saveHomeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      hero_kicker: homeProfile.hero_kicker,
      hero_title: homeProfile.hero_title,
      hero_subtitle: homeProfile.hero_subtitle,
      status_text: homeProfile.status_text,
      current_location: homeProfile.current_location,
      current_focus: homeProfile.current_focus,
      current_mood: homeProfile.current_mood,
      current_learning: homeProfile.current_learning,
      current_writing: homeProfile.current_writing,
      current_playing: homeProfile.current_playing,
      quote: homeProfile.quote,
      quote_author: homeProfile.quote_author,
      site_started_at: homeProfile.site_started_at || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase.from('home_profile').select('id').limit(1).maybeSingle();

    const { error } = existing?.id
      ? await supabase.from('home_profile').update(payload).eq('id', existing.id)
      : await supabase.from('home_profile').insert([payload]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert('首页配置已保存！');
    fetchData();
  };

  const saveNowStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nowStatusForm.label.trim() || !nowStatusForm.value.trim()) return;

    setLoading(true);
    const payload = {
      label: nowStatusForm.label.trim(),
      value: nowStatusForm.value.trim(),
      emoji: nowStatusForm.emoji.trim() || null,
      sort_order: Number(nowStatusForm.sort_order) || 0,
      is_active: nowStatusForm.is_active,
    };

    const { error } = nowStatusForm.id
      ? await supabase.from('now_status').update(payload).eq('id', nowStatusForm.id)
      : await supabase.from('now_status').insert([payload]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(nowStatusForm.id ? '今日观测已更新！' : '今日观测已添加！');
    setNowStatusForm(EMPTY_NOW_STATUS);
    fetchData();
  };

  const deleteNowStatus = async (id: string) => {
    if (!window.confirm('确定要删除这条今日观测吗？')) return;
    await supabase.from('now_status').delete().eq('id', id);
    fetchData();
  };

  const saveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const diaryData = {
      title: diaryForm.title,
      summary: diaryForm.summary,
      content: diaryForm.content,
      date: diaryForm.date,
      category_id: diaryForm.category_id || null,
      cover_image_url: diaryForm.cover_image_url.trim() || null,
      status: diaryForm.status,
      is_featured: diaryForm.is_featured,
      is_pinned: diaryForm.is_pinned,
      slug: diaryForm.slug.trim() || null,
      reading_minutes: Number(diaryForm.reading_minutes) || null,
    };

    const { error } = diaryForm.id
      ? await supabase.from('diaries').update(diaryData).eq('id', diaryForm.id)
      : await supabase.from('diaries').insert([diaryData]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(diaryForm.id ? '更新成功！' : '发布成功！');
    setDiaryForm(EMPTY_DIARY_FORM);
    fetchData();
  };

  const deleteDiary = async (id: string) => {
    if (!window.confirm('确定要删除这篇随笔吗？')) return;
    await supabase.from('diaries').delete().eq('id', id);
    fetchData();
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);

    if (error) {
      alert('创建失败，该分类名可能已存在');
      return;
    }

    alert('分类创建成功！');
    setNewCategoryName('');
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('确定要删除这个分类吗？已归入该分类的随笔不会被删除，但会变成“未分类”。')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  };

  const saveTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: timelineForm.title,
      date: timelineForm.date,
      description: timelineForm.description,
      link_url: timelineForm.link_url.trim() || null,
      type: timelineForm.type.trim() || 'life',
      importance: Number(timelineForm.importance) || 3,
      icon: timelineForm.icon.trim() || null,
      image_url: timelineForm.image_url.trim() || null,
      is_featured: timelineForm.is_featured,
    };

    const { error } = timelineForm.id
      ? await supabase.from('timeline').update(payload).eq('id', timelineForm.id)
      : await supabase.from('timeline').insert([payload]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(timelineForm.id ? '时光轨迹更新成功！' : '时光轨迹发布成功！');
    setTimelineForm(EMPTY_TIMELINE_FORM);
    fetchData();
  };

  const deleteTimeline = async (id: string) => {
    if (!window.confirm('确定要删除这条轨迹吗？')) return;
    await supabase.from('timeline').delete().eq('id', id);
    fetchData();
  };

  const saveCheckinItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinForm.name.trim()) return;

    setLoading(true);
    const payload = {
      name: checkinForm.name.trim(),
      description: checkinForm.description.trim() || null,
      theme_color: checkinForm.theme_color,
      emoji: checkinForm.emoji.trim() || null,
      sort_order: Number(checkinForm.sort_order) || 0,
    };

    const { error } = checkinForm.id
      ? await supabase.from('checkin_items').update(payload).eq('id', checkinForm.id)
      : await supabase.from('checkin_items').insert([payload]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(checkinForm.id ? '打卡项目更新成功！' : '打卡项目已创建！');
    setCheckinForm({ id: '', name: '', description: '', theme_color: '#10b981', emoji: '', sort_order: 0 });
    fetchData();
  };

  const deleteCheckinItem = async (id: string) => {
    if (!window.confirm('确定要删除这个打卡项目吗？它的历史记录也会被一并删除。')) return;
    await supabase.from('checkin_items').delete().eq('id', id);
    fetchData();
  };

  const toggleActive = async (item: any) => {
    await supabase.from('checkin_items').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData();
  };

  const toggleCheckinToday = async (itemId: string) => {
    const today = getTodayInShanghai();
    const existing = checkinRecords.find((r) => r.item_id === itemId && r.checked_date === today);

    setLoading(true);

    if (existing) {
      if (!window.confirm('确定要撤销今日打卡吗？')) {
        setLoading(false);
        return;
      }
      await supabase.from('checkin_records').delete().eq('id', existing.id);
    } else {
      await supabase.from('checkin_records').insert([
        {
          item_id: itemId,
          checked_date: today,
          checked_at: new Date().toISOString(),
        },
      ]);
    }

    fetchData();
  };

  const saveMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momentForm.image_url.trim()) return;

    setLoading(true);

    const payload = {
      image_url: momentForm.image_url.trim(),
      caption: momentForm.caption.trim() || null,
      taken_at: momentForm.taken_at || null,
      location: momentForm.location.trim() || null,
      mood: momentForm.mood.trim() || null,
      tags: momentForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_featured: momentForm.is_featured,
    };

    const { error } = momentForm.id
      ? await supabase.from('moments').update(payload).eq('id', momentForm.id)
      : await supabase.from('moments').insert([payload]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(momentForm.id ? '瞬间更新成功！' : '瞬间发布成功！');
    setMomentForm(EMPTY_MOMENT_FORM);
    fetchData();
  };

  const deleteMoment = async (id: string) => {
    if (!window.confirm('确定要删除这条瞬间吗？')) return;
    await supabase.from('moments').delete().eq('id', id);
    fetchData();
  };

  const handleMomentImageUpload = async (file: File) => {
    setMomentUploading(true);
    try {
      const url = await uploadImageToSupabase(file);
      setMomentForm((prev) => ({ ...prev, image_url: url }));
    } catch {
      alert('上传失败，请重试');
    } finally {
      setMomentUploading(false);
    }
  };

  const handleDiaryCoverUpload = async (file: File) => {
    setDiaryCoverUploading(true);
    try {
      const url = await uploadImageToSupabase(file);
      setDiaryForm((prev) => ({ ...prev, cover_image_url: url }));
    } catch {
      alert('上传失败，请重试');
    } finally {
      setDiaryCoverUploading(false);
    }
  };

  const handleTimelineImageUpload = async (file: File) => {
    setTimelineImageUploading(true);
    try {
      const url = await uploadImageToSupabase(file);
      setTimelineForm((prev) => ({ ...prev, image_url: url }));
    } catch {
      alert('上传失败，请重试');
    } finally {
      setTimelineImageUploading(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm('确定要删除这条全局留言吗？')) return;
    await supabase.from('comments').delete().eq('id', id);
    fetchData();
  };

  const deleteArticleComment = async (id: string) => {
    if (!window.confirm('确定要删除这条随笔评论吗？')) return;
    await supabase.from('post_comments').delete().eq('id', id);
    fetchData();
  };

  const saveAuthorReply = async (id: string, replyContent: string) => {
    if (!replyContent.trim()) {
      if (!window.confirm('回复内容为空，是否清空之前的回复？')) return;
      replyContent = '';
    }

    setLoading(true);

    const { error } = await supabase
      .from('post_comments')
      .update({
        author_reply: replyContent === '' ? null : replyContent,
        status: replyContent === '' ? 'read' : 'replied',
      })
      .eq('id', id);

    setLoading(false);

    if (error) {
      alert(`回复失败：${error.message}`);
      return;
    }

    alert('回复成功！');
    fetchData();
  };

  const updateArticleCommentStatus = async (id: string, status: string) => {
    await supabase.from('post_comments').update({ status }).eq('id', id);
    fetchData();
  };

  const saveVip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const vipData: any = { ...vipForm };
    delete vipData.id;
    vipData.name = vipData.name.trim();

    const { error } = vipForm.id
      ? await supabase.from('vip_files').update(vipData).eq('id', vipForm.id)
      : await supabase.from('vip_files').insert([vipData]);

    setLoading(false);

    if (error) {
      alert(`保存失败：${error.message}`);
      return;
    }

    alert(vipForm.id ? '专属档案更新成功！' : '专属档案生成成功！');
    setVipForm({ id: '', name: '', q1: '', a1: '', q2: '', a2: '', q3: '', a3: '', title: '', summary: '', content: '', date: '' });
    fetchData();
  };

  const deleteVip = async (id: string) => {
    if (!window.confirm('确定要销毁这份档案吗？TA 将无法再通过验证。')) return;
    await supabase.from('vip_files').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 font-sans text-gray-800 md:p-8">
      <style jsx global>{`
        .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid #f3f4f6;
          background: #ffffff;
          padding: 12px;
        }
        .ql-container.ql-snow {
          border: none;
          min-height: 400px;
          font-size: 16px;
          font-family: inherit;
        }
        .ql-editor {
          min-height: 400px;
          padding: 20px;
          color: #1f2937;
        }
      `}</style>

      <div className="mx-auto mb-8 flex max-w-6xl overflow-x-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-5 py-4 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#fafafa] text-gray-900 shadow-inner'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className={`mr-2 h-5 w-2 shrink-0 rounded-full ${tab.color} opacity-80`} />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-6xl">
        {loading && <p className="mb-6 animate-pulse text-sm font-medium text-purple-500">正在同步数据...</p>}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                控制台总览
              </h2>
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="随笔" value={diaries.length} sub={`精选 ${diaries.filter((d) => d.is_featured).length} / 置顶 ${diaries.filter((d) => d.is_pinned).length}`} />
                <StatCard title="轨迹" value={timelines.length} sub={`首页展示 ${timelines.filter((t) => t.is_featured).length}`} />
                <StatCard title="瞬间" value={moments.length} sub={`精选 ${moments.filter((m) => m.is_featured).length}`} />
                <StatCard title="待处理评论" value={articleComments.filter((c) => !c.status || c.status === 'unread').length} sub={`随笔评论 ${articleComments.length}`} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-800">首页状态</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-900">标题：</span>{homeProfile.hero_title}</p>
                  <p><span className="font-medium text-gray-900">状态：</span>{homeProfile.status_text}</p>
                  <p><span className="font-medium text-gray-900">当前重点：</span>{homeProfile.current_focus}</p>
                </div>
                <button onClick={() => setActiveTab('home')} className="mt-5 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600">去编辑首页配置</button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-800">今日观测</h3>
                <div className="space-y-2">
                  {nowStatuses.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#fafafa] px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{item.emoji || '•'} {item.label}</span>
                      <span className="text-gray-500">{item.value}</span>
                    </div>
                  ))}
                  {nowStatuses.length === 0 && <p className="py-8 text-center text-sm text-gray-400">还没有今日观测内容</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveHomeProfile} className="space-y-5 lg:col-span-3">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-sky-400" />
                首页配置 / 观测站配置
              </h2>

              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <input className={inputBase} placeholder="Hero 小标题" value={homeProfile.hero_kicker || ''} onChange={(e) => setHomeProfile({ ...homeProfile, hero_kicker: e.target.value })} />
                <input className={inputBase} placeholder="首页主标题" value={homeProfile.hero_title || ''} onChange={(e) => setHomeProfile({ ...homeProfile, hero_title: e.target.value })} required />
                <textarea className={`${inputBase} h-24 resize-y text-sm`} placeholder="首页副标题" value={homeProfile.hero_subtitle || ''} onChange={(e) => setHomeProfile({ ...homeProfile, hero_subtitle: e.target.value })} required />

                <div className="grid gap-4 md:grid-cols-2">
                  <input className={smallInputBase} placeholder="当前状态" value={homeProfile.status_text || ''} onChange={(e) => setHomeProfile({ ...homeProfile, status_text: e.target.value })} />
                  <input className={smallInputBase} placeholder="当前位置" value={homeProfile.current_location || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_location: e.target.value })} />
                  <input className={smallInputBase} placeholder="当前重点" value={homeProfile.current_focus || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_focus: e.target.value })} />
                  <input className={smallInputBase} placeholder="当前心情" value={homeProfile.current_mood || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_mood: e.target.value })} />
                  <input className={smallInputBase} placeholder="最近在学" value={homeProfile.current_learning || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_learning: e.target.value })} />
                  <input className={smallInputBase} placeholder="最近在写" value={homeProfile.current_writing || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_writing: e.target.value })} />
                  <input className={smallInputBase} placeholder="最近在玩" value={homeProfile.current_playing || ''} onChange={(e) => setHomeProfile({ ...homeProfile, current_playing: e.target.value })} />
                  <input type="date" className={smallInputBase} placeholder="建站日期" value={homeProfile.site_started_at || ''} onChange={(e) => setHomeProfile({ ...homeProfile, site_started_at: e.target.value })} />
                </div>

                <textarea className={`${inputBase} h-24 resize-y text-sm`} placeholder="首页短句 / Quote" value={homeProfile.quote || ''} onChange={(e) => setHomeProfile({ ...homeProfile, quote: e.target.value })} />
                <input className={smallInputBase} placeholder="短句作者" value={homeProfile.quote_author || ''} onChange={(e) => setHomeProfile({ ...homeProfile, quote_author: e.target.value })} />

                <button type="submit" disabled={loading} className="w-full rounded-xl bg-sky-500 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-sky-600">保存首页配置</button>
              </div>
            </form>

            <div className="space-y-8 lg:col-span-2">
              <form onSubmit={saveNowStatus} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center text-xl font-bold text-gray-800">
                  <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-indigo-400" />
                  今日观测
                </h2>
                <input className={smallInputBase} placeholder="标签，如：最近在学" value={nowStatusForm.label} onChange={(e) => setNowStatusForm({ ...nowStatusForm, label: e.target.value })} required />
                <input className={smallInputBase} placeholder="内容，如：电路 / 高数" value={nowStatusForm.value} onChange={(e) => setNowStatusForm({ ...nowStatusForm, value: e.target.value })} required />
                <div className="grid grid-cols-2 gap-3">
                  <input className={smallInputBase} placeholder="Emoji" value={nowStatusForm.emoji} onChange={(e) => setNowStatusForm({ ...nowStatusForm, emoji: e.target.value })} />
                  <input type="number" className={smallInputBase} placeholder="排序" value={nowStatusForm.sort_order} onChange={(e) => setNowStatusForm({ ...nowStatusForm, sort_order: Number(e.target.value) })} />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <input type="checkbox" checked={nowStatusForm.is_active} onChange={(e) => setNowStatusForm({ ...nowStatusForm, is_active: e.target.checked })} />
                  在首页展示
                </label>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-600">{nowStatusForm.id ? '保存修改' : '添加状态'}</button>
                  {nowStatusForm.id && (
                    <button type="button" onClick={() => setNowStatusForm(EMPTY_NOW_STATUS)} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200">取消</button>
                  )}
                </div>
              </form>

              <div className="space-y-3">
                {nowStatuses.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-800">{item.emoji || '•'} {item.label}</p>
                        <p className="text-sm text-gray-500">{item.value}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${item.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{item.is_active ? '展示中' : '已隐藏'}</span>
                    </div>
                    <div className="flex gap-3 border-t border-gray-50 pt-3 text-sm">
                      <button type="button" onClick={() => setNowStatusForm({ id: item.id, label: item.label || '', value: item.value || '', emoji: item.emoji || '', sort_order: item.sort_order || 0, is_active: item.is_active ?? true })} className="flex-1 text-left font-medium text-indigo-500 hover:text-indigo-700">编辑 →</button>
                      <button type="button" onClick={() => deleteNowStatus(item.id)} className="font-medium text-red-400 hover:text-red-600">删除</button>
                    </div>
                  </div>
                ))}
                {nowStatuses.length === 0 && <p className="py-10 text-center text-sm text-gray-400">还没有今日观测</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diaries' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveDiary} className="space-y-5 lg:col-span-3">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-purple-400" />
                {diaryForm.id ? '编辑随笔' : '创作新随笔'}
              </h2>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <input className={`${inputBase} font-medium`} placeholder="标题" value={diaryForm.title} onChange={(e) => setDiaryForm({ ...diaryForm, title: e.target.value })} required />
                <input type="date" className={`${inputBase} font-mono text-sm`} value={diaryForm.date} onChange={(e) => setDiaryForm({ ...diaryForm, date: e.target.value })} required />

                <select className={`${inputBase} text-sm`} value={diaryForm.category_id} onChange={(e) => setDiaryForm({ ...diaryForm, category_id: e.target.value })}>
                  <option value="">未分类</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>

                <textarea className={`${inputBase} h-24 resize-y text-sm`} placeholder="摘要（用于首页展示）" value={diaryForm.summary} onChange={(e) => setDiaryForm({ ...diaryForm, summary: e.target.value })} required />

                <div className="space-y-3">
                  <input className={smallInputBase} placeholder="封面图 URL（或下方直接上传）" value={diaryForm.cover_image_url} onChange={(e) => setDiaryForm({ ...diaryForm, cover_image_url: e.target.value })} />
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleDiaryCoverUpload(file); }} className="w-full rounded-xl border border-dashed border-purple-200 bg-purple-50/50 p-4 text-sm text-purple-500" />
                  {diaryCoverUploading && <p className="text-sm text-purple-500">封面上传中...</p>}
                  {diaryForm.cover_image_url && <img src={diaryForm.cover_image_url} alt="cover preview" className="h-48 w-full rounded-xl object-cover" />}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input className={smallInputBase} placeholder="自定义 slug（可选）" value={diaryForm.slug} onChange={(e) => setDiaryForm({ ...diaryForm, slug: e.target.value })} />
                  <select className={smallInputBase} value={diaryForm.status} onChange={(e) => setDiaryForm({ ...diaryForm, status: e.target.value as DiaryForm['status'] })}>
                    <option value="published">已发布</option>
                    <option value="draft">草稿</option>
                    <option value="hidden">隐藏</option>
                  </select>
                  <input type="number" min="0" className={smallInputBase} placeholder="阅读分钟数" value={diaryForm.reading_minutes} onChange={(e) => setDiaryForm({ ...diaryForm, reading_minutes: Number(e.target.value) })} />
                </div>

                <div className="flex flex-wrap gap-4 rounded-xl bg-[#fafafa] p-4 text-sm font-medium text-gray-600">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={diaryForm.is_featured} onChange={(e) => setDiaryForm({ ...diaryForm, is_featured: e.target.checked })} />
                    首页精选
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={diaryForm.is_pinned} onChange={(e) => setDiaryForm({ ...diaryForm, is_pinned: e.target.checked })} />
                    置顶
                  </label>
                </div>

                <div className="overflow-auto rounded-xl border border-gray-100 bg-[#fafafa] transition-all focus-within:border-purple-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-100" style={{ minHeight: '450px' }} onPaste={handlePaste}>
                  <ReactQuill forwardedRef={quillRef} theme="snow" value={diaryForm.content} onChange={(content: string) => setDiaryForm({ ...diaryForm, content })} modules={quillModules} placeholder="在这里尽情排版你的随笔吧...（支持截图后直接 Ctrl+V 粘贴）" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-purple-500 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-purple-600">{diaryForm.id ? '保存修改' : '发布随笔'}</button>
                  {diaryForm.id && <button type="button" onClick={() => setDiaryForm(EMPTY_DIARY_FORM)} className="rounded-xl bg-gray-100 px-6 py-3.5 font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>}
                </div>
              </div>
            </form>

            <div className="space-y-8 lg:col-span-2">
              <div>
                <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                  <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                  已发布随笔 ({diaries.length})
                </h2>
                <div className="max-h-[750px] space-y-4 overflow-y-auto pr-2">
                  {diaries.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-purple-200 hover:shadow-md">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-800">{d.title}</h3>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {d.is_pinned && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">置顶</span>}
                          {d.is_featured && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">精选</span>}
                          {d.status && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{d.status}</span>}
                        </div>
                      </div>
                      <p className="mb-2 font-mono text-sm text-gray-400">{d.date}</p>
                      {d.categories?.name && <p className="mb-3 inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">{d.categories.name}</p>}
                      <p className="mb-4 line-clamp-2 text-sm text-gray-500">{d.summary}</p>
                      <div className="flex gap-3 border-t border-gray-50 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setDiaryForm({
                              id: d.id,
                              title: d.title || '',
                              summary: d.summary || '',
                              content: d.content || '',
                              date: d.date ? String(d.date).split('T')[0] : '',
                              category_id: d.category_id || '',
                              cover_image_url: d.cover_image_url || '',
                              status: d.status || 'published',
                              is_featured: Boolean(d.is_featured),
                              is_pinned: Boolean(d.is_pinned),
                              slug: d.slug || '',
                              reading_minutes: Number(d.reading_minutes) || 0,
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex-1 text-left text-sm font-medium text-purple-500 transition-colors hover:text-purple-700"
                        >
                          编辑这篇 →
                        </button>
                        <button type="button" onClick={() => deleteDiary(d.id)} className="text-sm font-medium text-red-400 transition-colors hover:text-red-600">删除</button>
                      </div>
                    </div>
                  ))}
                  {diaries.length === 0 && <p className="py-10 text-center text-gray-400">这里还空空如也</p>}
                </div>
              </div>

              <div>
                <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                  <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-indigo-400" />
                  分类管理
                </h2>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <form onSubmit={saveCategory} className="mb-4 flex gap-2">
                    <input className="flex-1 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-400" placeholder="新分类名称" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
                    <button type="submit" className="shrink-0 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-600">添加</button>
                  </form>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="group flex items-center justify-between rounded-xl bg-[#fafafa] px-4 py-2.5">
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                        <button onClick={() => deleteCategory(cat.id)} className="text-xs font-medium text-red-400 opacity-0 transition-colors hover:text-red-600 group-hover:opacity-100">删除</button>
                      </div>
                    ))}
                    {categories.length === 0 && <p className="py-4 text-center text-sm text-gray-400">还没有分类</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveTimeline} className="space-y-5 lg:col-span-3">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-blue-400" />
                {timelineForm.id ? '编辑时光轨迹' : '记录新轨迹'}
              </h2>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <input className={`${inputBase} font-medium focus:border-blue-300 focus:ring-blue-100`} placeholder="事件标题" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} required />
                <input type="date" className={`${inputBase} font-mono text-sm focus:border-blue-300 focus:ring-blue-100`} value={timelineForm.date} onChange={(e) => setTimelineForm({ ...timelineForm, date: e.target.value })} required />
                <textarea className={`${inputBase} h-32 resize-y text-sm focus:border-blue-300 focus:ring-blue-100`} placeholder="简要描述..." value={timelineForm.description} onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })} required />

                <div className="grid gap-4 md:grid-cols-2">
                  <select className={`${smallInputBase} focus:border-blue-300 focus:ring-blue-100`} value={timelineForm.type} onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value })}>
                    <option value="life">生活</option>
                    <option value="study">学习</option>
                    <option value="travel">旅行</option>
                    <option value="site">网站</option>
                    <option value="milestone">里程碑</option>
                  </select>
                  <input type="number" min="1" max="5" className={`${smallInputBase} focus:border-blue-300 focus:ring-blue-100`} placeholder="重要程度 1-5" value={timelineForm.importance} onChange={(e) => setTimelineForm({ ...timelineForm, importance: Number(e.target.value) })} />
                  <input className={`${smallInputBase} focus:border-blue-300 focus:ring-blue-100`} placeholder="图标 / Emoji" value={timelineForm.icon} onChange={(e) => setTimelineForm({ ...timelineForm, icon: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <input className={`${smallInputBase} focus:border-blue-300 focus:ring-blue-100`} placeholder="关联图片 URL（或下方直接上传）" value={timelineForm.image_url} onChange={(e) => setTimelineForm({ ...timelineForm, image_url: e.target.value })} />
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleTimelineImageUpload(file); }} className="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-500" />
                  {timelineImageUploading && <p className="text-sm text-blue-500">图片上传中...</p>}
                  {timelineForm.image_url && <img src={timelineForm.image_url} alt="timeline preview" className="h-48 w-full rounded-xl object-cover" />}
                </div>

                <div className="space-y-2">
                  <input className={`${inputBase} text-sm focus:border-blue-300 focus:ring-blue-100`} placeholder="相关链接（直接输入网址，或从下方选择本站随笔）" value={timelineForm.link_url} onChange={(e) => setTimelineForm({ ...timelineForm, link_url: e.target.value })} />
                  {diaries.length > 0 && (
                    <select className="w-full cursor-pointer rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-600 outline-none transition-colors hover:bg-blue-100 focus:border-blue-300" onChange={(e) => { if (e.target.value) setTimelineForm({ ...timelineForm, link_url: `/diary/${e.target.value}` }); }} value="">
                      <option value="">✨ 快速关联本站已发布的随笔...</option>
                      {diaries.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.date})</option>)}
                    </select>
                  )}
                </div>

                <label className="flex items-center gap-2 rounded-xl bg-blue-50/60 p-4 text-sm font-medium text-blue-700">
                  <input type="checkbox" checked={timelineForm.is_featured} onChange={(e) => setTimelineForm({ ...timelineForm, is_featured: e.target.checked })} />
                  在首页轨迹展示
                </label>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-500 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-600">{timelineForm.id ? '保存修改' : '发布轨迹'}</button>
                  {timelineForm.id && <button type="button" onClick={() => setTimelineForm(EMPTY_TIMELINE_FORM)} className="rounded-xl bg-gray-100 px-6 py-3.5 font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>}
                </div>
              </div>
            </form>

            <div className="lg:col-span-2">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                已有轨迹 ({timelines.length})
              </h2>
              <div className="max-h-[750px] space-y-4 overflow-y-auto pr-2">
                {timelines.map((t) => (
                  <div key={t.id} className="relative rounded-2xl border border-gray-100 bg-white p-5 pl-8 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                    <span className="absolute left-4 top-8 h-[calc(100%-18px)] w-px bg-blue-100" />
                    <span className="absolute left-[11px] top-6 h-2.5 w-2.5 rounded-full bg-blue-400 ring-4 ring-white" />
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-800">{t.icon} {t.title}</h3>
                      <div className="flex shrink-0 gap-1">
                        {t.is_featured && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">首页</span>}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{t.type || 'life'} · {t.importance || 3}</span>
                      </div>
                    </div>
                    <p className="mb-2 font-mono text-sm text-gray-400">{t.date}</p>
                    <p className="mb-4 line-clamp-3 text-sm text-gray-600">{t.description}</p>
                    {t.link_url && <p className="mb-2 truncate font-mono text-xs text-blue-500">📎 {t.link_url}</p>}
                    <div className="flex gap-3 border-t border-gray-50 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineForm({
                            id: t.id,
                            title: t.title || '',
                            description: t.description || '',
                            link_url: t.link_url || '',
                            date: t.date ? String(t.date).split('T')[0] : '',
                            type: t.type || 'life',
                            importance: Number(t.importance) || 3,
                            icon: t.icon || '',
                            image_url: t.image_url || '',
                            is_featured: Boolean(t.is_featured),
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 text-left text-sm font-medium text-blue-500 transition-colors hover:text-blue-700"
                      >
                        编辑轨迹 →
                      </button>
                      <button type="button" onClick={() => deleteTimeline(t.id)} className="text-sm font-medium text-red-400 transition-colors hover:text-red-600">删除</button>
                    </div>
                  </div>
                ))}
                {timelines.length === 0 && <p className="py-10 text-center text-gray-400">这里还空空如也</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checkin' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveCheckinItem} className="space-y-5 lg:col-span-2">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-teal-400" />
                {checkinForm.id ? '编辑打卡项目' : '新建打卡项目'}
              </h2>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <input className={`${inputBase} font-medium focus:border-teal-300 focus:ring-teal-100`} placeholder="项目名称（如：每日阅读）" value={checkinForm.name} onChange={(e) => setCheckinForm({ ...checkinForm, name: e.target.value })} required />
                <input className={`${inputBase} focus:border-teal-300 focus:ring-teal-100`} placeholder="Emoji 图标（可选，如：📖）" value={checkinForm.emoji} onChange={(e) => setCheckinForm({ ...checkinForm, emoji: e.target.value })} maxLength={4} />
                <textarea className={`${inputBase} h-20 resize-y text-sm focus:border-teal-300 focus:ring-teal-100`} placeholder="描述（可选）" value={checkinForm.description} onChange={(e) => setCheckinForm({ ...checkinForm, description: e.target.value })} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600">主题色</label>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} type="button" onClick={() => setCheckinForm({ ...checkinForm, theme_color: c })} className={`h-8 w-8 rounded-lg transition-all ${checkinForm.theme_color === c ? 'scale-110 ring-2 ring-gray-400 ring-offset-2' : 'hover:scale-110'}`} style={{ backgroundColor: c }} aria-label={`选择颜色 ${c}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={checkinForm.theme_color} onChange={(e) => setCheckinForm({ ...checkinForm, theme_color: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200" />
                    <input value={checkinForm.theme_color} onChange={(e) => setCheckinForm({ ...checkinForm, theme_color: e.target.value })} className="flex-1 rounded-lg border border-gray-100 bg-[#fafafa] px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="#10b981" />
                  </div>
                </div>

                <input type="number" className={`${inputBase} text-sm focus:border-teal-300 focus:ring-teal-100`} placeholder="排序（数字越小越靠前）" value={checkinForm.sort_order} onChange={(e) => setCheckinForm({ ...checkinForm, sort_order: Number(e.target.value) })} />

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-teal-500 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-teal-600">{checkinForm.id ? '保存修改' : '创建项目'}</button>
                  {checkinForm.id && <button type="button" onClick={() => setCheckinForm({ id: '', name: '', description: '', theme_color: '#10b981', emoji: '', sort_order: 0 })} className="rounded-xl bg-gray-100 px-6 py-3.5 font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>}
                </div>
              </div>
            </form>

            <div className="space-y-8 lg:col-span-3">
              <div>
                <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                  <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-teal-400" />
                  今日打卡 <span className="ml-2 font-mono text-sm font-normal text-gray-400">{getTodayInShanghai()}</span>
                </h2>
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {checkinItems.filter((i) => i.is_active).length === 0 && <p className="py-6 text-center text-gray-400">还没有启用中的打卡项目</p>}
                  {checkinItems.filter((i) => i.is_active).map((item) => {
                    const today = getTodayInShanghai();
                    const todayRecord = checkinRecords.find((r) => r.item_id === item.id && r.checked_date === today);
                    const monthCount = checkinRecords.filter((r) => r.item_id === item.id).length;

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-[#fafafa] p-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${item.theme_color}22`, color: item.theme_color }}>{item.emoji || '✓'}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-800">{item.name}</p>
                            <p className="mt-0.5 font-mono text-xs text-gray-400">本月 {monthCount} 次{todayRecord && ` · 今日 ${new Date(todayRecord.checked_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => toggleCheckinToday(item.id)} disabled={loading} className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-all" style={{ backgroundColor: todayRecord ? '#f3f4f6' : item.theme_color, color: todayRecord ? '#6b7280' : '#ffffff' }}>
                          {todayRecord ? '✓ 已打卡（点击撤销）' : '打卡'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                  <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                  全部项目 ({checkinItems.length})
                </h2>
                <div className="space-y-3">
                  {checkinItems.map((item) => (
                    <div key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${item.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${item.theme_color}22`, color: item.theme_color }}>{item.emoji || '✓'}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-bold text-gray-800">{item.name}</h3>
                            {!item.is_active && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">已停用</span>}
                          </div>
                          {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
                        </div>
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.theme_color }} />
                      </div>
                      <div className="flex gap-3 border-t border-gray-50 pt-3 text-sm">
                        <button type="button" onClick={() => { setCheckinForm({ id: item.id, name: item.name || '', description: item.description || '', theme_color: item.theme_color || '#10b981', emoji: item.emoji || '', sort_order: item.sort_order || 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 text-left font-medium text-teal-500 hover:text-teal-700">编辑 →</button>
                        <button type="button" onClick={() => toggleActive(item)} className="font-medium text-gray-500 hover:text-gray-700">{item.is_active ? '停用' : '启用'}</button>
                        <button type="button" onClick={() => deleteCheckinItem(item.id)} className="font-medium text-red-400 hover:text-red-600">删除</button>
                      </div>
                    </div>
                  ))}
                  {checkinItems.length === 0 && <p className="py-10 text-center text-gray-400">还没有打卡项目</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moments' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveMoment} className="space-y-5 lg:col-span-2">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-rose-400" />
                {momentForm.id ? '编辑瞬间' : '发布新瞬间'}
              </h2>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <input className={`${inputBase} focus:border-rose-300 focus:ring-rose-100`} placeholder="图片 URL" value={momentForm.image_url} onChange={(e) => setMomentForm({ ...momentForm, image_url: e.target.value })} required />
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleMomentImageUpload(file); }} className="w-full rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-500" />
                {momentUploading && <p className="text-sm text-rose-500">图片上传中...</p>}
                {momentForm.image_url && <img src={momentForm.image_url} alt="moment preview" className="h-48 w-full rounded-xl object-cover" />}

                <textarea className={`${inputBase} h-24 resize-y text-sm focus:border-rose-300 focus:ring-rose-100`} placeholder="这一刻想说的话..." value={momentForm.caption} onChange={(e) => setMomentForm({ ...momentForm, caption: e.target.value })} />
                <input type="date" className={`${smallInputBase} focus:border-rose-300 focus:ring-rose-100`} value={momentForm.taken_at} onChange={(e) => setMomentForm({ ...momentForm, taken_at: e.target.value })} />
                <input className={`${smallInputBase} focus:border-rose-300 focus:ring-rose-100`} placeholder="地点" value={momentForm.location} onChange={(e) => setMomentForm({ ...momentForm, location: e.target.value })} />
                <input className={`${smallInputBase} focus:border-rose-300 focus:ring-rose-100`} placeholder="心情" value={momentForm.mood} onChange={(e) => setMomentForm({ ...momentForm, mood: e.target.value })} />
                <input className={`${smallInputBase} focus:border-rose-300 focus:ring-rose-100`} placeholder="标签，用英文逗号分隔，如：旅行,南京,雨天" value={momentForm.tags} onChange={(e) => setMomentForm({ ...momentForm, tags: e.target.value })} />

                <label className="flex items-center gap-2 rounded-xl bg-rose-50/60 p-4 text-sm font-medium text-rose-700">
                  <input type="checkbox" checked={momentForm.is_featured} onChange={(e) => setMomentForm({ ...momentForm, is_featured: e.target.checked })} />
                  在首页瞬间展示
                </label>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-rose-500 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-rose-600">{momentForm.id ? '保存修改' : '发布瞬间'}</button>
                  {momentForm.id && <button type="button" onClick={() => setMomentForm(EMPTY_MOMENT_FORM)} className="rounded-xl bg-gray-100 px-6 py-3.5 font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>}
                </div>
              </div>
            </form>

            <div className="lg:col-span-3">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                已有瞬间 ({moments.length})
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                {moments.map((m) => (
                  <div key={m.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-rose-200 hover:shadow-md">
                    {m.image_url && <img src={m.image_url} alt={m.caption || 'moment'} className="h-56 w-full object-cover" />}
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">{m.caption || '没有文字描述'}</p>
                        {m.is_featured && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">首页</span>}
                      </div>
                      <div className="mb-4 space-y-1 text-xs text-gray-400">
                        <p>{m.taken_at || m.created_at?.split?.('T')?.[0] || '未知日期'}</p>
                        {m.location && <p>📍 {m.location}</p>}
                        {m.mood && <p>🌙 {m.mood}</p>}
                        {Array.isArray(m.tags) && m.tags.length > 0 && <p>{m.tags.map((tag: string) => `#${tag}`).join(' ')}</p>}
                      </div>
                      <div className="flex gap-3 border-t border-gray-50 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setMomentForm({
                              id: m.id,
                              caption: m.caption || '',
                              image_url: m.image_url || '',
                              taken_at: m.taken_at ? String(m.taken_at).split('T')[0] : '',
                              location: m.location || '',
                              mood: m.mood || '',
                              tags: Array.isArray(m.tags) ? m.tags.join(', ') : '',
                              is_featured: Boolean(m.is_featured),
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex-1 text-left text-sm font-medium text-rose-500 hover:text-rose-700"
                        >
                          编辑 →
                        </button>
                        <button type="button" onClick={() => deleteMoment(m.id)} className="text-sm font-medium text-red-400 hover:text-red-600">删除</button>
                      </div>
                    </div>
                  </div>
                ))}
                {moments.length === 0 && <p className="col-span-full py-10 text-center text-gray-400">还没有瞬间</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'article_comments' && (
          <div>
            <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
              <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-pink-400" />
              随笔专属评论管理
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {articleComments.map((msg) => (
                <div key={msg.id} className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className="font-bold text-gray-800">{msg.nickname || '匿名访客'}</span>
                        <span className="ml-2 rounded-full border border-purple-100 bg-purple-50 px-2 py-1 text-xs text-purple-600">{msg.diaries?.title || '未知随笔'}</span>
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">{msg.status || 'unread'}</span>
                      </div>
                      <button onClick={() => deleteArticleComment(msg.id)} className="ml-4 shrink-0 text-xs font-medium text-red-400 transition-colors hover:text-red-600">粉碎评论</button>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">{msg.content}</p>

                    {msg.author_reply && (
                      <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                        <span className="mb-1 block text-xs font-bold text-purple-600">我的回复：</span>
                        <p className="text-sm text-gray-700">{msg.author_reply}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-50 pt-4">
                    <div className="mb-3 flex gap-2">
                      <button type="button" onClick={() => updateArticleCommentStatus(msg.id, 'read')} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200">标记已读</button>
                      <button type="button" onClick={() => updateArticleCommentStatus(msg.id, 'hidden')} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200">隐藏</button>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const input = form.elements.namedItem('reply') as HTMLInputElement;
                        saveAuthorReply(msg.id, input.value);
                        form.reset();
                      }}
                      className="flex gap-2"
                    >
                      <input name="reply" type="text" placeholder={msg.author_reply ? '修改回复内容...' : '回复这条评论...'} className="flex-1 rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-pink-400" />
                      <button type="submit" className="shrink-0 rounded-xl bg-pink-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-600">{msg.author_reply ? '更新' : '发送'}</button>
                    </form>
                  </div>
                </div>
              ))}
              {articleComments.length === 0 && <p className="col-span-full py-10 text-gray-400">目前还没有人给随笔留言。</p>}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div>
            <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
              <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-green-400" />
              全局留言板清理
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {commentsList.map((msg) => (
                <div key={msg.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="font-bold text-gray-800">{msg.nickname || '匿名访客'}</span>
                    <button onClick={() => deleteComment(msg.id)} className="text-xs font-medium text-red-400 transition-colors hover:text-red-600">删除</button>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-gray-600">{msg.content || msg.message}</p>
                  <p className="font-mono text-xs text-gray-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</p>
                </div>
              ))}
              {commentsList.length === 0 && <p className="col-span-full py-10 text-gray-400">目前没有留言。</p>}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={saveVip} className="space-y-5 lg:col-span-3">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-orange-400" />
                {vipForm.id ? '编辑绝密档案' : '新建绝密档案'}
              </h2>
              <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="space-y-3 rounded-xl border border-orange-100/50 bg-orange-50/50 p-4">
                  <h3 className="text-sm font-bold text-orange-600">阶段一：姓名识别</h3>
                  <input className="w-full rounded-lg border border-gray-200 bg-white p-3 font-medium outline-none focus:ring-2 focus:ring-orange-200" placeholder="对方的真实姓名" value={vipForm.name} onChange={(e) => setVipForm({ ...vipForm, name: e.target.value })} required />
                </div>

                <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-bold text-gray-600">阶段二：专属回忆验证（答案需完全一致）</h3>
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex gap-2">
                      <input className="w-2/3 rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" placeholder={`问题 ${num}`} value={(vipForm as any)[`q${num}`]} onChange={(e) => setVipForm({ ...vipForm, [`q${num}`]: e.target.value })} required />
                      <input className="w-1/3 rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" placeholder={`答案 ${num}`} value={(vipForm as any)[`a${num}`]} onChange={(e) => setVipForm({ ...vipForm, [`a${num}`]: e.target.value })} required />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="border-b pb-2 text-sm font-bold text-gray-800">阶段三：解锁的文章内容</h3>
                  <input className="w-full rounded-lg border border-gray-100 bg-[#fafafa] p-3 font-medium outline-none focus:ring-2 focus:ring-orange-200" placeholder="文章标题" value={vipForm.title} onChange={(e) => setVipForm({ ...vipForm, title: e.target.value })} required />
                  <input type="date" className="w-full rounded-lg border border-gray-100 bg-[#fafafa] p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-orange-200" value={vipForm.date} onChange={(e) => setVipForm({ ...vipForm, date: e.target.value })} required />
                  <textarea className="h-20 w-full resize-y rounded-lg border border-gray-100 bg-[#fafafa] p-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" placeholder="文章摘要" value={vipForm.summary} onChange={(e) => setVipForm({ ...vipForm, summary: e.target.value })} required />
                  <div className="overflow-auto rounded-xl border border-gray-100 bg-[#fafafa] transition-all focus-within:ring-2 focus-within:ring-orange-200" style={{ minHeight: '400px' }} onPaste={handlePaste}>
                    <ReactQuill forwardedRef={quillRef} theme="snow" value={vipForm.content} onChange={(content: string) => setVipForm({ ...vipForm, content })} modules={quillModules} placeholder="写下只有 TA 能看到的故事...（支持图片上传和直接粘贴）" />
                  </div>
                </div>

                <div className="flex gap-4 border-t border-gray-100 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-[#f97316] px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-[#ea580c]">{vipForm.id ? '保存档案修改' : '封存绝密档案'}</button>
                  {vipForm.id && <button type="button" onClick={() => setVipForm({ id: '', name: '', q1: '', a1: '', q2: '', a2: '', q3: '', a3: '', title: '', summary: '', content: '', date: '' })} className="rounded-xl bg-gray-100 px-6 py-3.5 font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>}
                </div>
              </div>
            </form>

            <div className="lg:col-span-2">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
                <span className="mr-3 h-6 w-2 shrink-0 rounded-full bg-gray-400" />
                已封存档案 ({vipList.length})
              </h2>
              <div className="max-h-[750px] space-y-4 overflow-y-auto pr-2">
                {vipList.map((v) => (
                  <div key={v.id} className="relative rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-1 flex justify-between text-lg font-bold text-gray-800">{v.name} <span className="rounded border border-orange-100 bg-orange-50 px-2 py-1 font-mono text-[10px] text-orange-500">ENCRYPTED</span></h3>
                    <p className="mb-4 text-sm text-gray-500">{v.title}</p>
                    <div className="flex gap-3 border-t border-gray-50 pt-3">
                      <button type="button" onClick={async () => { const { data } = await supabase.from('vip_files').select('*').eq('id', v.id).single(); if (data) setVipForm({ ...data, date: data.date ? String(data.date).split('T')[0] : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 text-left text-sm font-medium text-[#f97316] transition-colors hover:text-[#ea580c]">解密并编辑 →</button>
                      <button type="button" onClick={() => deleteVip(v.id)} className="text-sm font-medium text-red-400 transition-colors hover:text-red-600">销毁</button>
                    </div>
                  </div>
                ))}
                {vipList.length === 0 && <p className="py-10 text-center text-gray-400">名单还是空的，快去添加吧！</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub }: { title: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-2 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
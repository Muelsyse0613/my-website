import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import CheckinDetailClient from './CheckinDetailClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;

export default async function CheckinPage() {
  const { data: items } = await supabase
    .from('checkin_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // 拉所有记录（按 item_id 聚合）；如果将来记录数爆炸，可以只拉近一年
  const { data: records } = await supabase
    .from('checkin_records')
    .select('*')
    .order('checked_date', { ascending: false });

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-800 font-sans">
      {/* 顶部导航 */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
        >
          ← 返回首页
        </Link>
        <h1 className="text-lg font-bold text-gray-800">我的打卡全景</h1>
        <div className="w-20" />
      </div>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <CheckinDetailClient items={items || []} records={records || []} />
      </main>
    </div>
  );
}


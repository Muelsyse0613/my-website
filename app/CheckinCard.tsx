'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import CheckinMiniCard from './CheckinMiniCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 上海时区的年月
function getShanghaiYearMonth(): { year: number; month: number } {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return { year: shanghai.getUTCFullYear(), month: shanghai.getUTCMonth() + 1 };
}

export default function CheckinCard() {
  const [items, setItems] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // 只取 sort_order 最靠前的 2 个启用项目
      const { data: itemsData } = await supabase
        .from('checkin_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(2);

      const activeItems = itemsData || [];
      setItems(activeItems);

      if (activeItems.length === 0) {
        setRecords([]);
        return;
      }

      // 只拉本月这几个项目的记录
      const { year, month } = getShanghaiYearMonth();
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const ids = activeItems.map(i => i.id);
      const { data: recData } = await supabase
        .from('checkin_records')
        .select('*')
        .in('item_id', ids)
        .gte('checked_date', firstDay)
        .lt('checked_date', nextMonth);
      setRecords(recData || []);
    })();
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <div className="shrink-0 w-2 h-6 bg-teal-400 rounded-full mr-3"></div>
        每日打卡
      </h2>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">
            还没有启用中的打卡项目 ——{' '}
            <Link href="/admin" className="text-teal-500 hover:text-teal-600 transition-colors">
              去后台创建一个
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* 两个小热力图并排；用原生 CSS grid 避免 Tailwind 响应式断点的坑 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '1rem',
            }}
          >
            {items.map(item => {
              const itemRecords = records.filter(r => r.item_id === item.id);
              return (
                <CheckinMiniCard
                  key={item.id}
                  item={item}
                  records={itemRecords}
                />
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/checkin"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              查看打卡全景 →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

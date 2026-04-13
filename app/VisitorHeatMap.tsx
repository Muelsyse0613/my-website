'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VisitorHeatmap() {
  const [monthData, setMonthData] = useState<Record<string, number>>({});
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
    async function init() {
      try {
        const alreadyCounted = sessionStorage.getItem('visit_counted');
        if (!alreadyCounted) {
          const { error } = await supabase.rpc('record_visit');
          if (!error) {
            sessionStorage.setItem('visit_counted', 'true');
          }
        }
      } catch (e) {
        // sessionStorage 在某些环境下可能不可用，静默失败
      }

      const { data: rows } = await supabase
        .from('daily_stats')
        .select('date, views');

      if (rows && rows.length > 0) {
        const map: Record<string, number> = {};
        let total = 0;
        rows.forEach((r) => {
          map[r.date] = r.views;
          total += r.views;
        });

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        setMonthData(map);
        setTodayCount(map[todayStr] || 0);
        setTotalCount(total);
      }
    }

    init();
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  // GitHub 风格绿色色阶
  const getColor = (views: number, isFuture: boolean): string => {
    if (isFuture) return '#f6f8fa';
    if (views === 0) return '#ebedf0';
    if (views <= 2) return '#9be9a8';
    if (views <= 5) return '#40c463';
    if (views <= 10) return '#30a14e';
    return '#216e39';
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <div className="shrink-0 w-2 h-6 bg-green-400 rounded-full mr-3"></div>
        {monthNames[month]}足迹
      </h2>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        {/* 右上角年份 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <span className="text-xs text-gray-400 font-mono">{year}</span>
        </div>

        {/* 星期标头 */}
        <div style={gridStyle}>
          {weekDays.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#9ca3af',
                fontWeight: 500,
                paddingBottom: '2px',
                userSelect: 'none',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日历热力图 */}
        <div style={gridStyle}>
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e-${i}`} style={{ aspectRatio: '1' }} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const views = monthData[dateStr] || 0;
            const isFuture = day > todayDate;
            const isToday = day === todayDate;
            if (!mounted) return null;
            return (
              <div
                key={day}
                title={isFuture ? `${month + 1}月${day}日` : `${month + 1}月${day}日：${views} 次访问`}
                style={{
                  aspectRatio: '1',
                  borderRadius: '4px',
                  backgroundColor: getColor(views, isFuture),
                  transition: 'background-color 0.2s ease',
                  cursor: 'default',
                  ...(isToday
                    ? {
                        boxShadow: '0 0 0 2px #a78bfa',
                        outline: '2px solid white',
                        outlineOffset: '-2px',
                      }
                    : {}),
                }}
              />
            );
          })}
        </div>

        {/* 色阶图例 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            marginTop: '12px',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#9ca3af', marginRight: '2px' }}>少</span>
          {['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'].map((c, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: c }} />
          ))}
          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '2px' }}>多</span>
        </div>

        {/* 底部统计 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            今日访客 <span className="font-mono font-bold text-gray-700">{todayCount}</span>
          </div>
          <div className="text-gray-400">
            累计访客 <span className="font-mono font-bold text-gray-700">{totalCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

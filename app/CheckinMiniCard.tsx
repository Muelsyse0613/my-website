'use client';

import { useEffect, useMemo, useState } from 'react';

// ============================================================
// 工具
// ============================================================
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
  return { year: shanghai.getUTCFullYear(), month: shanghai.getUTCMonth() + 1 };
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

export default function CheckinMiniCard({
  item,
  records,
}: {
  item: any;
  records: any[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { year, month } = getShanghaiYearMonth();
  const monthIdx = month - 1;
  const todayStr = getTodayInShanghai();
  const todayDay = parseInt(todayStr.split('-')[2], 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIdx, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 日期 → 记录
  const dateToRecord = useMemo(() => {
    const map: Record<string, any> = {};
    records.forEach(r => {
      map[r.checked_date] = r;
    });
    return map;
  }, [records]);

  const checkedCount = records.length;
  const missedCount = Math.max(0, todayDay - checkedCount);
  const todayRecord = dateToRecord[todayStr];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  };

  const emptyColor = '#ebedf0';
  const futureColor = '#f6f8fa';

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      {/* 顶部：项目名 + 今日时间戳（或年份） */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base shrink-0">{item.emoji || '✓'}</span>
          <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
        </div>
        {todayRecord && mounted ? (
          <span
            className="font-mono text-xs font-medium shrink-0"
            style={{ color: item.theme_color }}
          >
            {new Date(todayRecord.checked_at).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-mono shrink-0">{year}</span>
        )}
      </div>

      {/* 星期表头 */}
      <div style={gridStyle}>
        {weekDays.map(d => (
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

      {/* 月度热力图 */}
      <div style={gridStyle}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e-${i}`} style={{ aspectRatio: '1' }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isFuture = day > todayDay;
          const isToday = day === todayDay;
          const checked = !!dateToRecord[dateStr];
          if (!mounted) return <div key={day} style={{ aspectRatio: '1' }} />;

          let bg = emptyColor;
          if (isFuture) bg = futureColor;
          else if (checked) bg = item.theme_color;

          return (
            <div
              key={day}
              title={
                isFuture
                  ? `${month}月${day}日`
                  : checked
                  ? `${month}月${day}日：已打卡`
                  : `${month}月${day}日：未打卡`
              }
              style={{
                aspectRatio: '1',
                borderRadius: '4px',
                backgroundColor: bg,
                transition: 'background-color 0.2s ease',
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

      {/* 底部统计 */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-sm">
        <div className="flex items-center gap-1.5 text-gray-500">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: item.theme_color }}
          />
          本月 <span className="font-mono font-bold text-gray-700">{checkedCount}</span> 天
        </div>
        <div className="text-gray-400">
          漏 <span className="font-mono font-bold text-gray-700">{missedCount}</span> 天
        </div>
      </div>
    </div>
  );
}

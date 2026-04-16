'use client';

import { useMemo, useState, useEffect } from 'react';

// ============================================================
// 工具函数
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

// 日期字符串 YYYY-MM-DD 加减天数
function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

// 计算当前连续打卡 streak（从今天往前数，连续打卡的天数）
// 规则：今天如果没打卡，从昨天开始数；如果昨天也没打，streak = 0
function calcCurrentStreak(dateSet: Set<string>, today: string): number {
  let streak = 0;
  let cursor = today;
  // 如果今天没打卡，从昨天开始数（今天晚上 23:00 没打卡不应该直接清零）
  if (!dateSet.has(cursor)) {
    cursor = shiftDate(cursor, -1);
  }
  while (dateSet.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

// 计算历史最长连续打卡
function calcMaxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  // dates 需要升序；传入时可能无序，这里排一次
  const sorted = [...dates].sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (shiftDate(sorted[i - 1], 1) === sorted[i]) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

// ============================================================
// 单项目大卡片
// ============================================================
function ItemPanel({ item, records }: { item: any; records: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 属于本项目的所有记录
  const myRecords = useMemo(
    () => records.filter(r => r.item_id === item.id),
    [records, item.id]
  );
  const dateSet = useMemo(() => new Set(myRecords.map(r => r.checked_date)), [myRecords]);
  const dateToRecord = useMemo(() => {
    const map: Record<string, any> = {};
    myRecords.forEach(r => { map[r.checked_date] = r; });
    return map;
  }, [myRecords]);

  const today = getTodayInShanghai();
  const { year, month } = getShanghaiYearMonth();
  const monthIdx = month - 1;
  const todayDay = parseInt(today.split('-')[2], 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 统计
  const totalCount = myRecords.length;
  const monthFirstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthCount = myRecords.filter(r => r.checked_date >= monthFirstDay).length;
  const missedThisMonth = Math.max(0, todayDay - monthCount);
  const currentStreak = calcCurrentStreak(dateSet, today);
  const maxStreak = calcMaxStreak(Array.from(dateSet));
  const todayRecord = dateToRecord[today];

  // 大热力图：过去 6 个月（含本月），按周列布局
  // 参考 GitHub 贡献图：行 = 星期（7 行），列 = 周
  const heatmapData = useMemo(() => {
    // 起始日期 = 今天往前推 6 个月，向该周的"周一"对齐
    const endDate = today; // YYYY-MM-DD
    // 起始：6 个月前的 1 号
    let startY = year;
    let startM = month - 5;
    while (startM <= 0) {
      startM += 12;
      startY -= 1;
    }
    let startDateStr = `${startY}-${String(startM).padStart(2, '0')}-01`;

    // 把起始日对齐到该周的周一
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const startDt = new Date(Date.UTC(sy, sm - 1, sd));
    const startDow = startDt.getUTCDay(); // 0=周日, 1=周一...
    const offsetToMonday = startDow === 0 ? 6 : startDow - 1;
    startDateStr = shiftDate(startDateStr, -offsetToMonday);

    // 从 startDateStr 开始，按周生成列
    const columns: Array<Array<{ date: string; inRange: boolean }>> = [];
    let cursor = startDateStr;
    const endCursor = endDate;

    while (cursor <= endCursor) {
      const week: Array<{ date: string; inRange: boolean }> = [];
      for (let i = 0; i < 7; i++) {
        week.push({ date: cursor, inRange: cursor <= endCursor });
        cursor = shiftDate(cursor, 1);
      }
      columns.push(week);
    }
    return columns;
  }, [today, year, month]);

  // 找出热力图跨越的月份标签（在列顶显示"X 月"）
  const monthLabels = useMemo(() => {
    const labels: Array<{ colIndex: number; label: string }> = [];
    let lastLabel = '';
    heatmapData.forEach((col, idx) => {
      // 用该列第一天（周一）所在的月
      const firstDay = col[0].date;
      const m = parseInt(firstDay.split('-')[1], 10);
      const label = `${m}月`;
      if (label !== lastLabel) {
        labels.push({ colIndex: idx, label });
        lastLabel = label;
      }
    });
    return labels;
  }, [heatmapData]);

  const fadedColor = item.theme_color + '33'; // 浅色用于未打卡的格子
  const emptyColor = '#ebedf0';
  const outOfRangeColor = '#f6f8fa';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      {/* 标题行 */}
      <div className="flex items-start justify-between mb-1 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
            style={{
              backgroundColor: item.theme_color + '22',
              color: item.theme_color,
            }}
          >
            {item.emoji || '✓'}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">{item.name}</h2>
            {item.description && (
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            )}
          </div>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
          style={{
            backgroundColor: todayRecord ? item.theme_color + '1a' : '#f3f4f6',
            color: todayRecord ? item.theme_color : '#9ca3af',
          }}
        >
          {todayRecord && mounted
            ? `今日 ${new Date(todayRecord.checked_at).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })} 已打卡`
            : '今日未打卡'}
        </div>
      </div>

      {/* 统计四宫格 */}
      <div className="grid grid-cols-4 gap-3 my-5">
        <Stat label="累计" value={totalCount} suffix="天" color={item.theme_color} />
        <Stat label={`${monthNames[monthIdx]}`} value={monthCount} suffix="天" color={item.theme_color} />
        <Stat label="连续" value={currentStreak} suffix="天" color={item.theme_color} />
        <Stat label="最长" value={maxStreak} suffix="天" color={item.theme_color} />
      </div>

      {/* 过去 6 个月大热力图 */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">近半年足迹</span>
          <span className="text-xs text-gray-400">本月漏 {missedThisMonth} 天</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-2">
          <div className="inline-block">
            {/* 月份标签行 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `20px repeat(${heatmapData.length}, 12px)`,
                gap: '3px',
                marginBottom: '4px',
                fontSize: '10px',
                color: '#9ca3af',
              }}
            >
              <div />
              {heatmapData.map((_, idx) => {
                const label = monthLabels.find(l => l.colIndex === idx);
                return (
                  <div key={idx} style={{ height: '12px', whiteSpace: 'nowrap' }}>
                    {label?.label || ''}
                  </div>
                );
              })}
            </div>

            {/* 主体：7 行 × N 列 */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {/* 左侧星期列 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(7, 12px)',
                  gap: '3px',
                  fontSize: '10px',
                  color: '#9ca3af',
                  width: '20px',
                  alignItems: 'center',
                }}
              >
                {weekDays.map((d, i) => (
                  <div key={d} style={{ height: '12px', lineHeight: '12px' }}>
                    {/* 只显示二、四、六，避免拥挤 */}
                    {i % 2 === 1 ? d : ''}
                  </div>
                ))}
              </div>

              {/* 热力图列 */}
              {heatmapData.map((col, colIdx) => (
                <div
                  key={colIdx}
                  style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gap: '3px' }}
                >
                  {col.map((cell, rowIdx) => {
                    const outOfRange = cell.date > today;
                    const checked = dateSet.has(cell.date);
                    const isToday = cell.date === today;
                    let bg = emptyColor;
                    if (outOfRange) bg = outOfRangeColor;
                    else if (checked) bg = item.theme_color;
                    return (
                      <div
                        key={rowIdx}
                        title={
                          outOfRange
                            ? cell.date
                            : checked
                            ? `${cell.date}：已打卡`
                            : `${cell.date}：未打卡`
                        }
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          backgroundColor: bg,
                          ...(isToday
                            ? {
                                boxShadow: '0 0 0 1.5px #a78bfa',
                                outline: '1.5px solid white',
                                outlineOffset: '-1.5px',
                              }
                            : {}),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-gray-400">
          <span>未打卡</span>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: emptyColor,
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: item.theme_color,
            }}
          />
          <span>已打卡</span>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center"
      style={{ backgroundColor: '#fafafa', border: '1px solid #f3f4f6' }}
    >
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-xl font-bold font-mono" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-gray-400">{suffix}</span>
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function CheckinDetailClient({
  items,
  records,
}: {
  items: any[];
  records: any[];
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
        <p className="text-gray-400">这里还没有任何打卡项目</p>
      </div>
    );
  }

  return (
    <div>
      {items.map(item => (
        <ItemPanel key={item.id} item={item} records={records} />
      ))}
    </div>
  );
}


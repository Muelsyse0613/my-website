'use client';

import { useState } from 'react';

export default function DiaryList({ diaries, categories }: { diaries: any[]; categories: any[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered =
    activeCategory === 'all'
      ? diaries
      : diaries.filter((d) => d.category_id === activeCategory);

  return (
    <section className="md:col-span-2">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <div className="shrink-0 w-2 h-6 bg-purple-400 rounded-full mr-3"></div>
        最新随笔
      </h2>

      {/* 分类标签栏 */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-300 hover:text-purple-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
        {filtered?.map((diary) => (
          <a
            key={diary.id}
            href={`/diary/${diary.id}`}
            className="block group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold group-hover:text-purple-600 transition-colors">
                {diary.title}
              </h3>
              {diary.categories?.name && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 shrink-0">
                  {diary.categories.name}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3 font-mono">{diary.date}</p>
            <p className="text-gray-600 line-clamp-2">{diary.summary}</p>
            <div className="mt-4 text-sm font-medium text-purple-500 flex items-center">
              阅读全文
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </a>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 italic text-center py-10">
            {activeCategory === 'all' ? '这里还空空如也，去后台写第一篇随笔吧！' : '该分类下还没有随笔'}
          </p>
        )}
      </div>
    </section>
  );
}
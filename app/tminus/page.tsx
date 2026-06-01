import type { Metadata } from 'next';
import Link from 'next/link';
import ExamDashboard from '../../components/ExamDashboard';

export const metadata: Metadata = {
  title: '期末倒计时 — hsy的宇宙',
  description: '考试日程与学习时间规划',
};

export default function TMinusPage() {
  return (
    <div className="tminus-page min-h-screen max-w-full font-sans text-gray-800">
      {/* Background (reuse home-shell gradient) */}
      <div className="home-shell min-h-screen max-w-full">
        <div className="cosmic-bg" aria-hidden="true" />

        {/* Header */}
        <header className="relative z-10 px-5 pb-6 pt-10 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800"
            >
              <span aria-hidden="true">←</span> 返回首页
            </Link>
            <h1 className="mt-6 text-[clamp(2rem,8vw,3.5rem)] font-black leading-[1.08] tracking-tight text-slate-950">
              期末倒计时
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
              合理安排各科复习时间，关注考试日期与可用学习时长。
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 px-5 pb-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <ExamDashboard showCards />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 pb-8 text-center">
          <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-slate-200/80 px-6 pt-8 text-sm text-slate-400">
            <p>© 2026 我的个人宇宙</p>
            <Link href="/" className="transition-colors hover:text-slate-600">
              返回首页
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

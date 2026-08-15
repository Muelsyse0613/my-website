# hsy的宇宙 - 开发报告

从 Initial Commit 到 V2.3.1，28 次提交，分四个阶段。

---

## 第一阶段：地基期（Initial → Ver2.1）

**目标：从模板到真正可运行的个人网站。**

### 批量功能搭建（bef1cab → 05e4cc7）

从 Create Next App 空白模板起步，快速铺开数据层和核心功能：

| 提交 | 动作 |
|------|------|
| `1964929` MyUniverse | 首个有意义提交，Supabase 数据连接 + 主页基本结构 |
| `9af0fe1` | 禁用主页缓存，确保内容实时更新 |
| `caefcdf` | 修随笔显示顺序（按日期倒序） |
| `39866a6` | **访客统计热力图**（Supabase RPC + GitHub 风格日历） |
| `10f8c8f` | 修服务器时区问题（UTC → 上海时区） |
| `a31791f` | 笔记分类标签 + 视觉效果调整 |
| `e7fe5fa` | **入场动画**（SplashScreen 终端风格打字机效果） |
| `7cf9f59` | Header 光晕流动效果 |
| `05e4cc7` | **每日打卡功能**（CheckinCard + CheckinMiniCard 热力图） |
| `e74fa5f` | 板块间距微调 |

**阶段成果：** 主页从空白变成一个有数据、有动画、有访客统计和打卡功能的完整页面。

### 设计重构 + 性能初探（2715dce → c4e2150）

技术债务积累到临界点，做了一次大重构：

| 提交 | 动作 |
|------|------|
| `d86417c` Ver2.1 | 加载速度优化 |
| `2715dce` **Version2.0** | 视觉风格全面重构（玻璃态、光晕、自定义字体） |
| `63ca5b4` V2.0.1 | 移动端适配 |
| `9ee9bbe` | 40KB 内联 CSS 迁至外部文件 + GPU 合成层优化 |
| `c4e2150` | ISR 缓存从 60s → 600s，减少 Supabase 查询 |
| `872cf94` V2.0.2 | 修复闪屏 bug |

**阶段成果：** 视觉定调，移动端可用，缓存策略成型。

---

## 第二阶段：游戏期（V2.1.0 → V2.2.3）

**目标：在"项目与实验"板块加入两个完整游戏。**

### 五子棋（a7362b6 → ff808bb）

| 提交 | 动作 |
|------|------|
| `a7362b6` V2.1.0 | C++ WASM AI 引擎 + Canvas 棋盘 + Web Worker 异步计算。支持 5 档难度（easy/normal/hard/master/insane），带新手指引、悔棋、胜负判定 |
| `298c004` | 修复预判缓存过期导致 AI 下到已有棋子位置 |
| `ff808bb` V2.1.1 | 修复 AI 降智——动态深度门槛收紧，清除跨回合缓存污染 |

五子棋的技术栈：TypeScript 游戏逻辑 → useReducer → Canvas 渲染 → Web Worker → WASM（C++ 编译的 `ai_engine.wasm` 40KB）。WASM 直接调用了 C++ 的 Negamax + Alpha-Beta 剪枝 + Zobrist 哈希替换表。

### 自走棋（060491f → 2605e75）

| 提交 | 动作 |
|------|------|
| `060491f` V2.2.0 | C++ Qt6 自走棋全量 TypeScript 重写。10 英雄、8x8 六角棋盘、3 技能类型、Canvas 2D 渲染、拖拽布阵、商店/装备/羁绊系统、自动战斗循环 |
| `24c4553` V2.2.1 | 修复结算跳过导致金币/HP/胜负丢失，修复 AOE 击杀尸体占位，Canvas 动态高度移动端适配，safe-area-inset、sticky 底部栏、dvh |
| `2605e75` V2.2.2 | 修复拖拽回备战栏不触发升星，修复卖出后空位不释放，修复攻击已死亡目标空指针，提升装备掉率，增加新手指引面板 |
| `de61df9` V2.2.3 | 文案调整 |

自走棋技术栈：useReducer 管理全部状态（人口、经济、棋盘、备战栏、商店刷新、羁绊加成、回合结算），RAF 驱动战斗循环，Canvas 六角坐标渲染。

**阶段成果：** 两个完整、可玩的 Canvas 游戏，带难度分档和移动端适配。

---

## 第三阶段：性能优化期（af9db54 → V2.3.1）

**目标：提升 Core Web Vitals 评分，消除警告和 bug。**

### 渲染性能（af9db54）

- 将 `public/styles/home.css` 合并到 `globals.css`，消除外部 CSS 的渲染阻塞
- 添加 Supabase `preconnect` + `dns-prefetch`，省去首次数据请求的 TLS 握手
- 修复五子棋 UNDO 的 `stepsBack` 计算反转 bug

### 监控集成（28b1e97）

- 集成 `@vercel/analytics` 和 `@vercel/speed-insights`，页面级 `<Analytics />` + `<SpeedInsights />`

### Hydration 修复（8eefaec）

- SplashScreen `useState` 初始化器移除 `typeof window` 分支，消除服务端/客户端首帧不匹配
- `<Script strategy="afterInteractive">` 替换为 `ScrollReveal` 客户端组件（`useEffect` + IntersectionObserver），消除 DOM 位置冲突
- `layout.tsx` 移除手动 `<head>` 标签，`<link>` 放 html 层级自动提升
- Favicon 替换为新图标

### 动画打磨（6cd820a）

- 开屏动画四行文字时序重排：首行直接显示，第二行 1.6s 慢速打字，三四行瞬间出现（`steps(1,end)`），0.8s 停顿后退场

### 系统性性能优化（8084017 V2.3.0）

- 卸载死依赖（`katex`、`@fontsource/*`），删 `public/styles/home.css`
- 首页 4 处 `<img>` 换 `next/image`（主封面 `priority` 预加载，自动 srcset）
- `next.config.ts` 加静态资源（WASM/Sprite）`immutable` 缓存头
- DiaryList 鼠标跟踪 `requestAnimationFrame` 节流（从每像素 setState → 每帧最多一次）
- SplashScreen 不再 `return null` 移除 DOM，改 `display:none` 隐藏

### SPA 导航修复（7a3c0b5 V2.3.1）

- 预隐藏脚本迁至 `layout.tsx`，用 `<Script strategy="beforeInteractive">` 仅 SSR 注入
- `useLayoutEffect` 在浏览器绘制前同步检查 sessionStorage，SPA 回退导航不再重播开屏动画
- 消除 React 组件内 `<script>` 标签警告

---

## 架构决策回顾

| 决策 | 选择 | 原因 |
|------|------|------|
| 数据获取 | Supabase vanilla client（非 `@supabase/ssr` 服务端 cookie） | 大部分页面公开，无需认证 |
| 缓存策略 | ISR `revalidate = 600` | 10 分钟延迟对展示型内容可接受 |
| 状态管理 | useReducer（游戏）、useState（UI） | 无 Redux/Zustand，复杂度不构成需求 |
| 游戏渲染 | Canvas 2D | 棋盘/DOM 方案在六角布局下太重 |
| AI 引擎 | WASM（C++ 编译） | 深度搜索需要原生性能 |
| 图片优化 | `next/image` fill + sizes | 消除 CLS，自动 srcset |
| 开屏预隐藏 | `beforeInteractive` script（SSR） + `useLayoutEffect`（SPA） | 两路兜底，覆盖所有导航场景 |

---

## 文件规模演变

| 模块 | 行数 | 说明 |
|------|------|------|
| `app/page.tsx` | ~970 | 首页服务端组件，6 并行 Supabase 查询 |
| `app/admin/AdminClient.tsx` | ~1560 | 管理后台，全 CRUD |
| `app/auto-chess/page.tsx` | ~720 | 自走棋主页面 |
| `app/auto-chess/game-logic.ts` | ~500 | 自走棋 reducer + 合约系统 |
| `app/SplashScreen.tsx` | ~580 | 开屏动画（CSS 即代码） |
| `app/gomoku/worker.ts` | ~170 | Web Worker + WASM 加载 |
| `app/globals.css` | ~640 | 合并后的全局样式 |
| 其余 20+ 文件 | 合计 ~3000 | 类型定义、子组件、游戏逻辑 |

总代码量约 **7,000 行 TypeScript/TSX + 1,800 行 CSS**。

---

## 已知技术债

1. `CheckinCard` / `VisitorHeatMap` 在客户端创建 Supabase 实例做数据获取（应在服务端完成）
2. `checkin/page.tsx` 全量拉取打卡记录无 LIMIT（数据量小时无影响）
3. `DiaryList` 被标记为 Client Component 但数据全部通过 props 传入（可考虑改为 Server Component + URL 参数筛选，但当前即时客户端筛选体验更优）
4. 部分页面 CSS 内联于组件文件中（diary `ARTICLE_STYLE` ~275 行，timeline `TIMELINE_STYLE` ~180 行）

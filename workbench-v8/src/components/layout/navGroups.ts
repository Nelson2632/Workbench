// ============================================================
// Personal Workbench V8 — 导航配置（Sidebar 与导航页共用单一事实来源）
// ============================================================

export interface NavChild {
  label: string
  path: string
}

export interface NavGroup {
  id: string
  icon: string
  label: string
  path?: string
  children?: NavChild[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'today',
    icon: '🏠',
    label: '今日',
    path: '/today',
  },
  {
    id: 'study',
    icon: '🎓',
    label: '学习',
    children: [
      { label: '学习驾驶舱', path: '/study' },
      { label: '知识体系', path: '/study/knowledge' },
      { label: '错题本', path: '/study/mistakes' },
      { label: '闪卡', path: '/study/flashcards' },
      { label: '成绩追踪', path: '/study/exams' },
      { label: '阅读', path: '/study/reading' },
    ],
  },
  {
    id: 'plan',
    icon: '📋',
    label: '计划',
    children: [
      { label: '收件箱', path: '/plan/inbox' },
      { label: '今日计划', path: '/plan/today' },
      { label: '未来', path: '/plan/future' },
      { label: '周期计划', path: '/plan/recurring' },
      { label: '项目', path: '/plan/projects' },
    ],
  },
  {
    id: 'life',
    icon: '🌿',
    label: '生活',
    children: [
      { label: '日记', path: '/life/diary' },
      { label: '日记日历', path: '/life/diary-calendar' },
      { label: '日历·事件', path: '/life/events' },
      { label: '好友', path: '/life/friends' },
      { label: '素材', path: '/life/materials' },
    ],
  },
  {
    id: 'review',
    icon: '🌙',
    label: '复盘',
    children: [
      { label: '今日复盘', path: '/review/daily' },
      { label: '学科复盘', path: '/review/subject' },
      { label: '周复盘', path: '/review/weekly' },
      { label: '月复盘', path: '/review/monthly' },
      { label: '考试复盘', path: '/review/exam' },
      { label: '模板', path: '/review/templates' },
    ],
  },
  {
    id: 'play',
    icon: '🎮',
    label: '娱乐',
    children: [
      { label: '动画', path: '/play/anime' },
      { label: '游戏', path: '/play/games' },
      { label: '音乐', path: '/play/music' },
    ],
  },
  {
    id: 'cross',
    icon: '🕰',
    label: '跨域',
    children: [
      { label: '时间线', path: '/timeline' },
      { label: '每日记忆', path: '/memory' },
      { label: '收藏', path: '/collection' },
    ],
  },
  {
    id: 'record',
    icon: '📝',
    label: '记录',
    children: [
      { label: '备忘录', path: '/record/memos' },
      { label: '笔记', path: '/record/notes' },
    ],
  },
  {
    id: 'tools',
    icon: '🛠',
    label: '工具',
    children: [
      { label: '番茄钟', path: '/tools/pomodoro' },
      { label: '随机工具', path: '/tools/random' },
      { label: '记账', path: '/tools/finance' },
      { label: '倒数日', path: '/tools/countdowns' },
      { label: '数据迁移', path: '/migration' },
    ],
  },
  {
    id: 'settings',
    icon: '⚙',
    label: '设置',
    children: [
      { label: '常规设置', path: '/settings' },
      { label: 'V9 系统设置', path: '/settings/v9' },
    ],
  },
]

/** 底部/独立入口（密码本等），也纳入导航页展示 */
export const EXTRA_ENTRIES: NavGroup[] = [
  { id: 'vault', icon: '🔒', label: '密码本', path: '/vault' },
]

/**
 * Future Lens Design System - 设计 Token 常量
 *
 * 这个文件提供了类型安全的设计 Token 引用，避免在组件中硬编码 Tailwind 类名。
 * 所有颜色都映射到 v0 设计系统的语义化变量。
 *
 * @example
 * ```tsx
 * import { DesignTokens } from '@/lib/future-lens/design-tokens'
 *
 * // 使用背景色
 * <div className={DesignTokens.background.card}>
 *
 * // 使用文字颜色
 * <p className={DesignTokens.text.primary}>文本</p>
 *
 * // 使用排版
 * <h1 className={DesignTokens.typography.title}>标题</h1>
 *
 * // 使用按钮样式
 * <button className={DesignTokens.button.primary}>按钮</button>
 *
 * // 使用阴影
 * <div className={DesignTokens.shadow.cardHover}>卡片</div>
 *
 * // 使用 Z-Index
 * <div style={{ zIndex: DesignTokens.zIndex.modal }}>模态框</div>
 * ```
 *
 * @note 设计原则：保持轻量化，只提供必要的 Token，避免过度工程化
 */

export const DesignTokens = {
  /**
   * 背景色 Token
   * 所有背景色都映射到 v0 设计系统的语义化变量
   */
  background: {
    /** 应用底色 (#f8f9fb) */
    primary: "bg-background",
    /** 卡片背景 (白色) */
    card: "bg-card",
    /** 次级背景 (slate-100) */
    muted: "bg-muted",
    /** 浅次级背景 */
    mutedSubtle: "bg-muted/50",
  },

  /**
   * 文字颜色 Token
   * 所有文字颜色都映射到 v0 设计系统的语义化变量
   */
  text: {
    /** 主要文字 (slate-900) */
    primary: "text-foreground",
    /** 次级文字 (slate-500) */
    secondary: "text-muted-foreground",
    /** 成功文字 (emerald-500) */
    success: "text-success",
    /** 警告文字 (amber-500) */
    warning: "text-warning",
    /** 危险文字 (rose-500) */
    danger: "text-destructive",
  },

  /**
   * 边框 Token
   * 所有边框都映射到 v0 设计系统的语义化变量
   */
  border: {
    /** 默认边框 (slate-200) */
    default: "border-border",
    /** 柔和边框 */
    muted: "border-muted",
  },

  /**
   * 圆角 Token
   * 基于 --radius: 0.75rem (12px) 的统一圆角系统
   */
  radius: {
    /** 10px（--radius-md = 基础 - 2px），小元素 */
    sm: "rounded-md",
    /** 12px（--radius-lg = 基础值），输入框/小卡片 */
    md: "rounded-lg",
    /** 16px（--radius-xl = 基础 + 4px），标准卡片圆角 */
    lg: "rounded-xl",
    /** 16px（Tailwind 默认 2xl = 1rem），与 lg 视觉等同，新代码优先用 lg */
    xl: "rounded-2xl",
    /** 完全圆角 */
    full: "rounded-full",
  },

  /**
   * 统一布局 Token
   * 用于保持全局布局一致性
   */
  layout: {
    /** 全局水平内边距（适用于移动容器），略收让卡片等容器视觉更宽 */
    containerPadding: "px-3",
    /** 标准卡片内边距 */
    cardPadding: "p-5",
    /** 部分之间的垂直间距 */
    sectionSpacing: "space-y-6",
    /** 小元素之间的垂直间距 */
    elementSpacing: "space-y-3",
  },

  /**
   * 全局字号基准（px），用于 fSize(base) 统一随 textScale 缩放
   * - body: 正文基准 14px
   * - bodyContent: 帖子/聊天正文统一（略小），首页/列表/点开主页一致
   * - title: 区块标题 16px
   * - caption: 辅助说明、标签 12px
   * - input: 输入框 16px（防 iOS 聚焦缩放、可读性）
   */
  fontScale: {
    body: 14,
    /** 帖子与聊天正文统一字号（12 * 1.015 ≈ 12.2px），所有帖子、所有聊天、点开主页一致 */
    bodyContent: 12 * 1.015,
    title: 16,
    caption: 12,
    input: 16,
  },

  /**
   * 表单控件 Token（输入框 16px 可读且防 iOS 缩放；内边距适合触控）
   * 公用组件：FormInput / FormTextarea（ds/form-input.tsx）
   */
  form: {
    /** 单行输入框：16px 字号、py-2 触控友好、含 focus 环 */
    input:
      "w-full px-3 py-2 rounded-xl border border-border/50 bg-background/80 text-base leading-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 min-h-[44px]",
    /** 多行输入框：与 input 同规格，加 resize-none */
    textarea:
      "w-full px-3 py-2 rounded-xl border border-border/50 bg-background/80 text-base leading-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none min-h-[44px]",
    /** 表单区块标签 */
    label: "block text-xs font-semibold text-foreground/90 mb-1.5",
    /** 小胶囊选项按钮（与 增肌/减脂、高血脂 等一致，需自行加 selected 态） */
    chip: "flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
  },

  /**
   * 状态背景 Token（浅色）
   * 用于状态提示的背景色
   */
  statusBackground: {
    /** 成功背景 */
    success: "bg-success/10",
    /** 警告背景 */
    warning: "bg-warning/10",
    /** 危险背景 */
    danger: "bg-destructive/10",
  },

  /**
   * 按钮样式 Token
   * 统一的按钮样式定义
   */
  button: {
    /** 主要按钮样式 */
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    /** 次级按钮样式 */
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    /** 危险按钮样式 */
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    /** 幽灵按钮样式 */
    ghost: "hover:bg-muted hover:text-foreground",
  },

  /**
   * 排版 Token（仅字重/行高/颜色；字号用 fontScale 基准 + 组件内 fSize(base) 随 textScale 缩放）
   * 正文请用 fontScale.body(14) + fSize；标题用 fontScale.title(16)；说明用 fontScale.caption(12) 或 text-xs
   */
  typography: {
    /** 视图顶栏标题：统一 14.5px、字重、约 3% 字间距（任务/消息/发现等顶栏标题共用） */
    viewHeaderTitle: "text-[14.5px] font-semibold tracking-[0.03em] text-foreground",
    /** 标题样式 (参考 InsightCard) */
    title: "font-bold text-foreground leading-snug tracking-tight",
    /** 副标题样式 (参考 InsightCard) */
    subtitle: "text-muted-foreground leading-relaxed font-normal tracking-normal",
    /** 正文样式 (参考 MessageBubble) */
    body: "text-foreground leading-relaxed tracking-normal",
    /** 说明/标签样式 (参考 InsightCard Tag) */
    caption: "text-muted-foreground/70 font-medium tracking-wide",
    /** 按钮文字样式 */
    button: "font-medium tracking-normal",
  },

  /**
   * 热门话题颜色 Token
   * 用于热门话题排行的特殊颜色
   */
  hot: {
    /** Top 1 红色 */
    1: "text-hot-1",
    /** Top 2 橙色 */
    2: "text-hot-2",
    /** Top 3 琥珀色 */
    3: "text-hot-3",
  },

  /**
   * 热门话题背景 Token
   * 用于热门话题排行的背景色
   */
  hotBackground: {
    /** Top 1 背景 */
    1: "bg-hot-1/10",
    /** Top 2 背景 */
    2: "bg-hot-2/10",
    /** Top 3 背景 */
    3: "bg-hot-3/10",
  },

  /**
   * 智能 Safe Area 适配 Token
   * 包含最小安全间距，用于移动端适配
   */
  mobile: {
    /** 顶部：仅使用 Safe Area，沉浸式显示（无额外 padding） */
    safeTop: "pt-[env(safe-area-inset-top)]",
    /** 顶部：Safe Area + 小间距（用于需要呼吸空间的场景） */
    safeTopWithSpacing: "pt-[calc(env(safe-area-inset-top)+1rem)]",
    /** 底部：Home 条或 16px */
    safeBottom: "pb-[max(1rem,env(safe-area-inset-bottom))]",
    /** 纯 Safe Area 填充（用于固定定位元素）- 顶部 */
    safeAreaInsetTop: "pt-[env(safe-area-inset-top)]",
    /** 纯 Safe Area 填充（用于固定定位元素）- 底部 */
    safeAreaInsetBottom: "pb-[env(safe-area-inset-bottom)]",
    /** 移动端输入框防缩放标准（强制 16px 防止 iOS 缩放） */
    input: "text-base",
    /** 动态视口高度 */
    viewportHeight: "h-[100dvh]",
    /**
     * ModalDialog `action-sheet` / `floating-card` 外侧左右边距
     * 手机用较窄边距让玻璃面板更宽；sm 起与历史 16px 对齐
     */
    sheetActionOuterX: "px-2 sm:px-4",
    /**
     * ModalDialog action-sheet 内可滚动区水平 padding（与 sheetActionOuterX 叠加）
     */
    sheetActionScrollPaddingX: "px-4 sm:px-5",
    /**
     * ModalDialog floating-card 内层内容区水平 padding
     */
    sheetFloatingCardInnerX: "px-4 sm:px-6",
  },

  /**
   * 统一模糊效果 Token
   * 用于玻璃态效果的模糊强度
   */
  blur: {
    /** Input fields (4px) */
    input: "backdrop-blur-sm",
    /** Cards (16px) */
    card: "backdrop-blur-lg",
    /** Modal overlays (24px) */
    overlay: "backdrop-blur-xl",
    /** Heavy glass effects (40px) */
    heavy: "backdrop-blur-2xl",
  },

  /**
   * 统一过渡持续时间 Token
   * 用于动画和过渡效果的时间控制
   */
  transition: {
    /** Fast interactions (hover, click) - 200ms */
    fast: "duration-200",
    /** Standard animations - 300ms */
    normal: "duration-300",
    /** Slower transitions - 500ms */
    slow: "duration-500",
  },

  /**
   * 阴影 Token
   * 只保留 Tailwind 标准和常用的自定义阴影
   *
   * @note 项目中其他使用的阴影（仅供参考，可直接使用 Tailwind 类名）：
   *
   * **状态阴影（CardBase variants）：**
   * - 成功: shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)] (hover: shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)])
   * - 警告: shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)] (hover: shadow-[0_0_30px_-5px_rgba(245,158,11,0.25)])
   * - 错误: shadow-[0_0_30px_-10px_rgba(244,63,94,0.15)] (hover: shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)])
   * - 信息: shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)] (hover: shadow-[0_0_30px_-5px_rgba(59,130,246,0.25)])
   *
   * **组件特定阴影：**
   * - 浮动导航栏 (FloatingDock): shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)]
   * - 模态框顶部 (ModalDialog): shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)]
   * - 模态框 (ModalDialog): shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]
   * - 玻璃面板 (GlassPanel): shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] (subtle)
   * - 工具提示 (Tooltip): shadow-[0_4px_20px_rgba(0,0,0,0.08)]
   * - 内容操作栏 (ContentActionBar): shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)]
   * - 详情视图 (DetailViewShell): shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]
   *
   * **发光效果：**
   * - 状态指示器: shadow-[0_0_10px_rgba(52,211,153,0.5)] (成功)
   * - AI 球体: shadow-[0_0_12px_rgba(15,23,42,0.5)]
   * - 发光按钮: shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)] (hover: shadow-[0_0_25px_-5px_rgba(0,0,0,0.4)])
   */
  shadow: {
    /** Tailwind 标准阴影 - 小 */
    sm: "shadow-sm",
    /** Tailwind 标准阴影 - 中等 */
    md: "shadow-md",
    /** Tailwind 标准阴影 - 大 */
    lg: "shadow-lg",
    /** Tailwind 标准阴影 - 超大 */
    xl: "shadow-xl",
    /** iOS 27+ 柔和扩散阴影 - 卡片/容器统一使用（值定义在 globals.css @theme --shadow-glass） */
    glass: "shadow-glass",
    /** glass + 顶部 1px 内高光（液态玻璃边缘光）：顶栏按钮/胶囊等小玻璃件统一使用 */
    glassRaised: "shadow-glass-raised",
    /** 深一档的玻璃阴影：浮层/高对比卡片使用 */
    glassStrong: "shadow-glass-strong",
    /** 单层简化玻璃阴影：轻量元素使用 */
    glassSoft: "shadow-glass-soft",
    /** 卡片悬浮 hover 态 */
    cardHover: "shadow-glass",
  },

  /**
   * Z-Index 层级 Token
   * 统一的层级管理系统（整合自 lib/future-lens/constants.ts 的 Z_INDEX）
   * 值完全保持不变，确保不影响现有功能
   */
  zIndex: {
    /** 基础层级 */
    base: 0,
    /** 抽屉层级 (Level 1: Main drawers, Chat, etc.) */
    drawer: 50,
    /** 模态框层级 (Level 2: Standard modals) */
    modal: 100,
    /** 覆盖层层级 (Level 3: Top-level sheets, Attachments, etc.) */
    overlay: 200,
    /** 提示层级 (Level 4: Notifications) */
    toast: 300,
    /** 警告层级 (Level 5: Critical dialogs, Pickers) */
    alert: 400,
  },
} as const

/**
 * DesignTokens 类型定义
 * 提供完整的类型安全支持
 */
export type DesignTokensType = typeof DesignTokens

/**
 * Z-Index 层级类型
 * 与 DesignTokens.zIndex 对应
 */
export type ZIndexLevel = keyof typeof DesignTokens.zIndex

/**
 * 使用示例：
 *
 * ```tsx
 * import { DesignTokens, type DesignTokensType, type ZIndexLevel } from '@/lib/future-lens/design-tokens'
 *
 * // 使用背景色
 * <div className={DesignTokens.background.card}>
 *   <h3 className={DesignTokens.text.primary}>标题</h3>
 *   <p className={DesignTokens.text.secondary}>描述</p>
 * </div>
 *
 * // 使用阴影
 * <div className={DesignTokens.shadow.cardHover}>卡片</div>
 *
 * // 使用 Z-Index
 * <div style={{ zIndex: DesignTokens.zIndex.modal }}>模态框</div>
 *
 * ```
 */

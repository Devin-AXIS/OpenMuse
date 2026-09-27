"use client"

import React from "react"
import type { LucideIcon } from "lucide-react"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { useAppConfig } from "@/lib/future-lens/config-context"
import { cn } from "@/lib/utils"

/**
 * CapsuleTabs - 胶囊式标签导航组件（系统内唯一的横向 Tab 件；原 IconTabs 已并入 variant="glass"）
 *
 * @example
 * ```tsx
 * <CapsuleTabs
 *   tabs={["结构 & 趋势", "资金 & 生态", "战略 & 人物"]}
 *   activeTab={0}
 *   onTabChange={(index) => setActiveTab(index)}
 * />
 * // 带图标 + 玻璃态选中（原 IconTabs 样式，与 AgentChatHeader tab 一致）
 * <CapsuleTabs variant="glass" tabs={[{ label: "全部", icon: Layers }]} activeTab={0} onTabChange={...} />
 * ```
 */
export interface CapsuleTabItem {
  label: string
  icon?: LucideIcon
}

interface CapsuleTabsProps {
  /** 标签列表：纯文字或 { label, icon }（icon 仅 variant="glass" 渲染） */
  tabs: Array<string | CapsuleTabItem>
  /** 当前激活的标签索引 */
  activeTab: number
  /** 标签切换回调 */
  onTabChange: (index: number) => void
  /** 是否粘性定位（sticky） */
  sticky?: boolean
  /** 尺寸：default 默认，compact 小巧，xs 更小（与参考图标签一致） */
  size?: "default" | "compact" | "xs"
  /** 选中样式：default 浅底深字，dark-selected 选中深底白字，glass 玻璃胶囊选中（原 IconTabs，横向可滚动） */
  variant?: "default" | "dark-selected" | "glass"
  /** 布局：track 共用一个轨道，pill 参考图独立胶囊+间距（variant="glass" 时忽略，固定横向滚动行） */
  layout?: "track" | "pill"
  /** 自定义类名 */
  className?: string
}

export function CapsuleTabs({
  tabs,
  activeTab,
  onTabChange,
  sticky = false,
  size = "default",
  variant = "default",
  layout = "track",
  className = "",
}: CapsuleTabsProps) {
  const { textScale } = useAppConfig()
  const fSize = (base: number) => base * textScale
  const isCompact = size === "compact"
  const isXs = size === "xs"
  const darkSelected = variant === "dark-selected"
  const isPill = layout === "pill"

  const items: CapsuleTabItem[] = tabs.map((t) => (typeof t === "string" ? { label: t } : t))

  /* glass：原 IconTabs —— 横向可滚动行，选中项玻璃胶囊 + 主色（与 AgentChatHeader tab 一致） */
  if (variant === "glass") {
    return (
      <div className={cn("flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 min-w-0", className)}>
        {items.map((tab, idx) => {
          const isActive = activeTab === idx
          const Icon = tab.icon
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onTabChange(idx)}
              className={cn(
                "relative flex items-center gap-2 px-[14px] py-2 rounded-2xl text-[12px] font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                "active:opacity-80",
                isActive
                  ? `backdrop-blur-xl bg-card/80 border border-border/50 ${DesignTokens.shadow.glass} text-primary`
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {Icon != null && (
                <Icon
                  size={14}
                  className={cn("shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-70")}
                  strokeWidth={2}
                />
              )}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const containerClasses = sticky
    ? `sticky ${DesignTokens.mobile.safeTop} z-50 py-2 bg-background/90 backdrop-blur-md -mx-5 px-5 mb-3 ${className}`
    : `mb-3 ${className}`

  const trackClass = isPill
    ? "flex flex-wrap gap-1.5"
    : isXs
      ? "flex p-0.5 bg-muted/40 rounded-sm"
      : isCompact
        ? "flex p-1 bg-muted/40 rounded-md"
        : "flex p-1.5 bg-muted/50 rounded-2xl backdrop-blur-sm"
  const btnPadding = isPill
    ? "px-4 py-1.5 rounded-full"
    : isXs
      ? "py-1 rounded-[6px]"
      : isCompact
        ? "py-1.5 rounded-sm"
        : "py-2.5 rounded-xl"
  const btnFlex = isPill ? "" : "flex-1"
  const fontWeight = isXs || isCompact || isPill ? "font-medium" : "font-bold"
  const fontSize = isPill ? 12 : isXs ? 11 : isCompact ? 12 : 11

  const activeClass = darkSelected || isPill
    ? "bg-foreground text-background shadow-none scale-100"
    : "bg-card text-foreground shadow-sm scale-100"
  const inactiveClass = darkSelected || isPill
    ? "bg-muted/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground/90"
    : "text-muted-foreground hover:text-foreground scale-95"

  return (
    <div className={containerClasses}>
      <div className={trackClass}>
        {items.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(idx)}
            className={`${btnFlex} ${fontWeight} transition-all duration-200 ${btnPadding} ${activeTab === idx ? activeClass : inactiveClass}`}
            style={{ fontSize: `${fSize(fontSize)}px` }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

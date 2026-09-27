"use client"

import type React from "react"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { useScrollContext } from "./scroll-header-container"
import { useAppConfig } from "@/lib/future-lens/config-context"
import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button"

interface ScrollHeaderProps {
  title: string
  onBack?: () => void
  actions?: React.ReactNode
  /** 左侧操作（显示在返回按钮后面） */
  leftActions?: React.ReactNode
  className?: string
  alwaysShowTitle?: boolean
  /** 标签栏（可选，显示在标题下方） */
  tabs?: React.ReactNode
}

/**
 * ScrollHeader - 滚动顶部栏组件
 *
 * 根据滚动位置自动显示/隐藏标题和背景，提供统一的页面头部体验
 * 必须在 ScrollHeaderContainer 内使用
 *
 * @example
 * ```tsx
 * <ScrollHeaderContainer scrollContainerId="scroll-container">
 *   <ScrollHeader title="页面标题" onBack={() => router.back()} />
 * </ScrollHeaderContainer>
 * ```
 */
export function ScrollHeader({
  title,
  onBack,
  actions,
  leftActions,
  className,
  alwaysShowTitle = false,
  tabs,
}: ScrollHeaderProps) {
  const { isScrolled } = useScrollContext()
  const { textScale } = useAppConfig()
  const fSize = (base: number) => base * textScale

  return (
    <header
      className={cn(
        "transition-all duration-300",
        isScrolled ? "bg-background/70 backdrop-blur-xl shadow-glass border-b border-border/50" : "bg-transparent",
        className,
      )}
    >
      {/* 标题行：与首页/消息顶栏行高、按钮一致 */}
      <div className={cn("relative flex items-center justify-between px-4 min-h-[48px]", DesignTokens.mobile.safeTop)}>
        {/* Left: Back Button + Left Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
          {onBack && (
            <HeaderIconButton variant="back" ariaLabel="返回" onClick={onBack}>
              <ChevronLeft size={17} strokeWidth={2} />
            </HeaderIconButton>
          )}
          {leftActions}
        </div>

        {/* Center: Title - 绝对居中 */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none z-0">
          <h1
            className={cn(
              DesignTokens.typography.title,
              "font-semibold text-foreground transition-opacity duration-300 pointer-events-auto",
              "opacity-100", // 永远显示标题
            )}
            style={{ fontSize: `${fSize(14)}px` }}
          >
            {title}
          </h1>
        </div>

        {/* Right: Actions - 确保在最右侧 */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0 relative z-10 min-w-0">
          {actions}
        </div>
      </div>

      {/* 标签栏（显示在标题下方，完全融入顶部栏） */}
      {tabs && (
        <div className="px-4 py-2.5 border-b border-border/30">
          {tabs}
        </div>
      )}
    </header>
  )
}

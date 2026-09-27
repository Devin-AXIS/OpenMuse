"use client"

import type React from "react"
import { ScrollHeader } from "@/components/future-lens/layout/scroll-header"
import { GlassPanel } from "@/components/future-lens/ds/glass-panel"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { useAppConfig } from "@/lib/future-lens/config-context"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * SettingsShell - 设置/功能页布局
 *
 * 使用场景：
 * - 用户设置页面
 * - 邀请好友页面
 * - 账号管理页面
 * - 任何功能列表类页面
 *
 * 功能特点：
 * 1. 统一的顶部栏（带返回、标题）
 * 2. 统一的背景（自动支持深色模式）
 * 3. 统一的功能列表容器
 * 4. 自动支持字体缩放
 * 5. 自动处理安全区域
 *
 * 必须遵循的规范：
 * - 背景使用 DesignTokens.background.page
 * - 列表项使用 GlassPanel
 * - 所有颜色使用语义化 token（支持深色模式）
 * - 字体大小支持缩放（使用 fSize）
 */

interface SettingsShellProps {
  /** 页面标题（显示在顶部栏） */
  title: string
  /** 返回按钮点击回调 */
  onBack?: () => void
  /** 顶部栏右侧操作按钮 */
  actions?: React.ReactNode
  /** 内容区域 */
  children: React.ReactNode
  /** 滚动容器ID（用于ScrollHeader） */
  scrollContainerId?: string
}

export function SettingsShell({
  title,
  onBack,
  actions,
  children,
  scrollContainerId = "settings-scroll-container",
}: SettingsShellProps) {
  return (
    <div className={`${(DesignTokens.background as { page?: string }).page} h-screen relative`}>
      <ScrollHeader
        title={title}
        onBack={onBack}
        actions={actions}
        alwaysShowTitle={true}
      />

      <div
        id={scrollContainerId}
        className="absolute top-0 left-0 right-0 bottom-0 overflow-y-auto scrollbar-hide pt-14"
        style={{
          paddingBottom: DesignTokens.mobile.safeBottom,
        }}
      >
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

/**
 * SettingsItem - 功能列表项组件
 *
 * 用于 SettingsShell 内部的功能项
 * 自动使用统一的样式和交互效果
 */

interface SettingsItemProps {
  /** 图标 */
  icon?: React.ReactNode
  /** 标签文字 */
  label: string
  /** 描述文字（可选） */
  description?: string
  /** 右侧内容（如开关、文字等） */
  rightContent?: React.ReactNode
  /** 点击回调 */
  onClick?: () => void
  /** 是否显示右箭头（默认true） */
  showArrow?: boolean
  /** 额外样式 */
  className?: string
}

export function SettingsItem({
  icon,
  label,
  description,
  rightContent,
  onClick,
  showArrow = true,
  className,
}: SettingsItemProps) {
  const { textScale } = useAppConfig()
  const fSize = (base: number) => `${base * textScale}px`

  return (
    <GlassPanel
      intensity="subtle"
      className={cn("p-4 cursor-pointer active:scale-[0.98] transition-all", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0 text-foreground/70">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div className={DesignTokens.typography.body} style={{ fontSize: fSize(16) }}>
            {label}
          </div>
          {description && (
            <div className="text-muted-foreground mt-1" style={{ fontSize: fSize(13) }}>
              {description}
            </div>
          )}
        </div>
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
        {showArrow && !rightContent && <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />}
      </div>
    </GlassPanel>
  )
}

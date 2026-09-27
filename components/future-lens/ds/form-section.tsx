"use client"

import type React from "react"
import { cn } from "@/lib/utils"

export interface FormSectionProps {
  /** 区块标题 */
  title: string
  /** 标题左侧图标（如 Lucide icon） */
  icon?: React.ReactNode
  /** 图标颜色类名，如 text-amber-600/80、text-violet-600/80 */
  iconColorClass?: string
  /** 标题右侧操作（如「恢复默认」按钮） */
  headerAction?: React.ReactNode
  /** 说明文案，显示在标题下方 */
  hint?: string
  /** 主内容 */
  children: React.ReactNode
  /** 外层 class */
  className?: string
  /** 紧凑模式：仅标题与说明略缩小，间距略减 */
  compact?: boolean
  /** 覆盖标题样式（如小号大写、muted） */
  titleClassName?: string
}

/**
 * 表单单区块通用组件：标题行（左图标+标题，右可选操作）+ 可选说明 + 内容
 * 弹层/表单内统一用此组件，左侧图标颜色通过 iconColorClass 变量传入
 */
export function FormSection({
  title,
  icon,
  iconColorClass,
  headerAction,
  hint,
  children,
  className,
  compact = false,
  titleClassName,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-muted/30 border border-border/40",
        compact ? "p-3.5" : "p-4",
        className
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "mb-1.5" : "mb-2")}>
        <div className="flex items-center gap-2">
          {icon != null && (
            <span
              className={cn("shrink-0", iconColorClass)}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <span
            className={cn(
              compact ? "text-[13px] font-semibold text-foreground" : "text-[14px] font-semibold text-foreground",
              titleClassName,
            )}
          >
            {title}
          </span>
        </div>
        {headerAction != null && headerAction}
      </div>
      {hint != null && hint !== "" && (
        <p className={cn("text-muted-foreground leading-snug", compact ? "text-[12px] mb-2.5" : "text-[12px] mb-3")}>
          {hint}
        </p>
      )}
      {children}
    </section>
  )
}

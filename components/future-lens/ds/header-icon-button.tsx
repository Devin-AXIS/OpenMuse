"use client"

import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

const BASE_CLASS = `w-[34px] h-[34px] flex items-center justify-center rounded-full backdrop-blur-xl backdrop-saturate-150 bg-card/80 border border-border/50 ${DesignTokens.shadow.glassRaised} hover:bg-card/90 active:scale-95 active:opacity-90 transition-all duration-200 shrink-0 touch-manipulation`

export interface HeaderIconButtonProps {
  children: React.ReactNode
  onClick?: () => void
  ariaLabel: string
  /** 返回键等左侧第一个按钮，带 -ml-1 */
  variant?: "back" | "default"
  /** 选中态（如日历展开时） */
  active?: boolean
  type?: "button" | "submit"
  disabled?: boolean
  className?: string
  title?: string
}

/** 顶栏公用图标按钮：与 agent-task / AITaskListView 顶栏一致 */
export function HeaderIconButton({
  children,
  onClick,
  ariaLabel,
  variant = "default",
  active = false,
  type = "button",
  disabled = false,
  className,
  title,
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        BASE_CLASS,
        variant === "back" && "-ml-1",
        active && "border-primary/40 text-primary",
        !active && variant !== "back" && "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40",
        className
      )}
    >
      {children}
    </button>
  )
}

"use client"

import React from "react"
import { Circle, CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 紧凑打勾行：参考 create-task-sheet 子项样式，左侧 Circle / CircleCheck 图标，右侧文案。
 * 未选：细边框圆环；选中：CircleCheck 主色。行使用 rounded-lg、px-2.5 py-2、gap-2.5。
 */
export interface CheckboxRowProps {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  /** 行内文案样式，默认 text-[12px] font-medium */
  labelClassName?: string
}

export function CheckboxRow({
  checked,
  onToggle,
  children,
  className,
  disabled = false,
  labelClassName,
}: CheckboxRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left cursor-pointer transition-colors select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "bg-primary/10 border-primary/40 text-foreground"
          : "bg-background/80 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground/90",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className,
      )}
    >
      <span className="flex-shrink-0 flex items-center justify-center transition-colors">
        {checked ? (
          <CircleCheck className="w-4 h-4 text-primary" strokeWidth={2} />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground/50" strokeWidth={2} />
        )}
      </span>
      <span className={cn("flex-1 text-[12px] font-medium leading-tight", labelClassName)}>
        {children}
      </span>
    </button>
  )
}

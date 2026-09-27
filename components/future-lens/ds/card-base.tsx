"use client"

import type React from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlassPanel } from "./glass-panel"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

/**
 * 基础卡片组件，提供统一的卡片样式和交互
 * @example
 * ```tsx
 * <CardBase variant="default" title="标题" subtitle="副标题">
 *   内容
 * </CardBase>
 * ```
 */
interface CardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: "default" | "success" | "warning" | "error" | "info" | "aiFeedback"
  title?: string
  subtitle?: string
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>
  action?: React.ReactNode
}

export const CardBase = ({
  children,
  className,
  onClick,
  variant = "default",
  title,
  subtitle,
  icon: Icon,
  action,
  ...props
}: CardBaseProps) => {
  const variantStyles = {
    default: "hover:shadow-glass",
    success:
      "shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)] border-success/30 bg-success/5 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)] hover:border-success/50",
    warning:
      "shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)] border-warning/30 bg-warning/5 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.25)] hover:border-warning/50",
    error:
      "shadow-[0_0_30px_-10px_rgba(244,63,94,0.15)] border-destructive/30 bg-destructive/5 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)] hover:border-destructive/50",
    info: "shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)] border-info/30 bg-info/5 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.25)] hover:border-info/50",
    aiFeedback:
      "relative overflow-hidden group w-full transition-all duration-300 border-amber-500/20 dark:border-amber-500/10 hover:border-amber-500/40 hover:shadow-md",
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <GlassPanel
      intensity="subtle"
      className={cn("rounded-xl p-3 mb-2 group transition-all duration-500", variantStyles[variant], onClick && "cursor-pointer", className)}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {variant === "aiFeedback" && (
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl pointer-events-none bg-amber-500/5 group-hover:bg-amber-500/10 transition-all duration-700" />
      )}
      <div className={variant === "aiFeedback" ? "relative z-10" : undefined}>
        {(title || subtitle || Icon) && (
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2.5 items-center">
              {Icon && (
                <div className="p-2 rounded-2xl bg-muted/30 text-muted-foreground">
                  <Icon size={18} strokeWidth={1.5} />
                </div>
              )}
              <div>
                {title && <h3 className={cn(DesignTokens.typography.title, "text-[15px] leading-none mb-1")}>{title}</h3>}
                {subtitle && <p className={cn(DesignTokens.typography.caption, "text-[12px] font-medium")}>{subtitle}</p>}
              </div>
            </div>
            {action ||
              ((title || subtitle || Icon) && (
                <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted/50 text-muted-foreground/50 transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              ))}
          </div>
        )}

        {children}
      </div>
    </GlassPanel>
  )
}

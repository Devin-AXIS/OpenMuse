"use client"

import { motion } from "framer-motion"
import type React from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

interface PillButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary"
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * PillButton - 药丸按钮基础组件
 *
 * 统一的按钮样式规范：
 * - 高度：44px (h-11)
 * - 圆角：完全圆角 (rounded-full)
 * - 字体：text-sm + font-medium + tracking-normal
 *
 * 用于：登录页面、表单提交、主要操作等
 */
export function PillButton({
  children,
  onClick,
  variant = "primary",
  icon,
  disabled = false,
  className,
}: PillButtonProps) {
  const variants = {
    /* primary：深底 CTA，柔和投影 + 顶部微内高光（与玻璃系统同一光语言）；secondary：描边轻量 */
    primary:
      "bg-foreground text-background hover:bg-foreground/90 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
    secondary: "border border-border bg-transparent text-foreground hover:bg-accent",
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // 基础样式：高度44px，完全圆角，防止被截断
        "w-full h-11 rounded-full transition-all flex-shrink-0",
        // 排版：使用统一的按钮字体规范
        DesignTokens.typography.button,
        "text-sm",
        // 变体样式
        variants[variant],
        // 禁用状态
        disabled && "opacity-50 cursor-not-allowed",
        // 图标布局
        "flex items-center justify-center gap-2",
        className,
      )}
    >
      {icon && icon}
      {children}
    </motion.button>
  )
}

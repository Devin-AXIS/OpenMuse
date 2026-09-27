"use client"

import { cn } from "@/lib/utils"

interface BottomFadeOverlayProps {
  className?: string
  height?: string
}

/**
 * 底部渐变模糊遮罩组件 - 公用能力
 * 用于所有页面的底部导航区域，提供下拉时的模糊渐变效果
 *
 * @example
 * ```tsx
 * <BottomFadeOverlay />
 * ```
 */
/** 默认仅底部一小段渐变，与真实 app 一致（约 80px），不再拉长到 h-40 */
export function BottomFadeOverlay({ className, height = "h-20" }: BottomFadeOverlayProps) {
  return (
    <div
      className={cn(
        "bottom-fade-overlay absolute bottom-0 left-0 w-full pointer-events-none z-20",
        "bg-gradient-to-t from-background via-background/90 to-transparent",
        height,
        className
      )}
    />
  )
}

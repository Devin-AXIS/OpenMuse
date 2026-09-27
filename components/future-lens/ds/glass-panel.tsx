import type React from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

/**
 * 毛玻璃面板组件，提供不同强度的玻璃态效果
 * @example
 * ```tsx
 * <GlassPanel intensity="medium">内容</GlassPanel>
 * ```
 */
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  intensity?: "low" | "subtle" | "medium" | "high"
  className?: string
}

export const GlassPanel = ({ children, intensity = "medium", className, ...props }: GlassPanelProps) => {
  // Restoring the specific "AgenciQ" glass styles
  // low: used for cards (no glass effect)
  // medium: used for bubbles
  // high: used for nav bar

  /* iOS 27+ 风格：柔和扩散阴影 + 顶部 1px 内高光（液态玻璃边缘光），增强毛玻璃悬浮感。
     backdrop-saturate 让透出的背景色更鲜活，是「磨砂质感」的关键。inset 高光对明暗两套皆适用。 */
  /* 阴影值统一定义在 globals.css @theme 的 --shadow-glass-* token */
  const variants = {
    low: "bg-card/90 backdrop-blur-md border border-border/50 shadow-glass-low",
    subtle: "bg-card/75 backdrop-blur-xl border border-border/50 shadow-glass-subtle",
    medium: "bg-card/70 backdrop-blur-2xl border border-border/60 shadow-glass-raised",
    high: "bg-card/80 backdrop-blur-2xl border border-border/70 shadow-glass-high",
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden transition-all duration-300 backdrop-saturate-150",
        DesignTokens.radius.lg,
        variants[intensity],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

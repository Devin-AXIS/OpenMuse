"use client"

import { useReducedBlurSupport } from "@/hooks/use-reduced-blur-support"

/**
 * 应用背景组件，提供渐变背景和网格效果
 * Capacitor iOS/Android 与低端 Android WebView 上大半径 blur 合成成本高、易花屏，
 * 会走纯渐变分支（useReducedBlurSupport）。该分支若用 `h-[60%]` 等百分比高度，
 * 在 iOS WKWebView 里绝对定位子元素可能出现百分比高度解析为 0，径向渐变被压成「一条线」，
 * 故圆形光晕用 aspect-square 由宽度推导高度，底部大块光晕用 min-height 兜底。
 * @example
 * ```tsx
 * <AppBackground />
 * ```
 */
export const AppBackground = () => {
  const reducedBlur = useReducedBlurSupport()

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-[rgb(var(--app-bg))]" />

      {reducedBlur ? (
        /* 原生壳 / 低端 WebView：纯渐变，无 blur，无网格 */
        <>
          <div
            className="absolute top-[-10%] left-[20%] w-[60%] aspect-square rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgb(var(--glow-blue) / 0.38) 0%, rgb(var(--glow-purple) / 0.2) 25%, rgb(var(--app-bg) / 0.05) 55%, transparent 75%)",
            }}
          />
          <div
            className="absolute top-[10%] right-[-20%] w-[70%] aspect-square rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgb(var(--glow-blue) / 0.31) 0%, rgb(var(--glow-accent) / 0.13) 25%, rgb(var(--app-bg) / 0.04) 55%, transparent 75%)",
            }}
          />
          <div
            className="absolute bottom-[-5%] left-[-10%] w-[100%] min-h-[42vh] h-[70%] rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgb(var(--glow-purple) / 0.2) 0%, rgb(var(--glow-accent) / 0.1) 28%, rgb(var(--app-bg) / 0.05) 55%, transparent 75%)",
            }}
          />
          <div
            className="absolute top-[40%] left-[30%] w-[50%] aspect-square rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgb(var(--glow-accent) / 0.24) 0%, rgb(var(--app-bg) / 0.05) 55%, transparent 75%)",
            }}
          />
          {/* 底部居中暖雾：平衡冷调，弥散感参考 Dispatch；vh 兜底防 WKWebView 百分比塌陷 */}
          <div
            className="absolute bottom-[-10%] left-0 right-0 min-h-[56vh] h-[78%]"
            style={{
              background: "radial-gradient(ellipse 95% 95% at 50% 98%, rgb(var(--glow-warm) / 0.36) 0%, rgb(var(--glow-warm) / 0.18) 38%, transparent 80%)",
            }}
          />
        </>
      ) : (
        /* 标准版本：blur 光晕 + 网格 */
        <>
          <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--glow-blue)/0.72)_0%,rgb(var(--glow-purple)/0.35)_40%,rgb(var(--app-bg)/0)_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(30,58,88,0.45)_0%,rgba(51,51,71,0.25)_40%,transparent_70%)] blur-[120px] pointer-events-none transform-gpu" />
          <div className="absolute top-[10%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--glow-blue)/0.55)_0%,rgb(var(--glow-accent)/0.22)_50%,rgb(var(--app-bg)/0)_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(30,58,88,0.4)_0%,rgba(41,98,128,0.18)_50%,transparent_70%)] blur-[140px] pointer-events-none transform-gpu" />
          <div className="absolute bottom-[15%] left-[-10%] w-[100%] h-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--glow-purple)/0.32)_0%,rgb(var(--glow-accent)/0.14)_45%,rgb(var(--app-bg)/0)_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(51,51,71,0.5)_0%,rgba(41,98,128,0.28)_40%,transparent_70%)] blur-[150px] pointer-events-none transform-gpu" />
          <div className="absolute top-[40%] left-[30%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--glow-accent)/0.44)_0%,rgb(var(--app-bg)/0)_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(41,98,128,0.35)_0%,transparent_60%)] blur-[110px] pointer-events-none transform-gpu" />
          {/* 右下淡暖色：平衡冷调，弥散感更接近参考图（--glow-warm 明暗双值自动切换） */}
          <div className="absolute bottom-[-10%] left-[-10%] right-[-10%] h-[88%] bg-[radial-gradient(ellipse_95%_95%_at_50%_98%,rgb(var(--glow-warm)/0.55)_0%,rgb(var(--glow-warm)/0.26)_38%,transparent_80%)] blur-[110px] pointer-events-none transform-gpu" />
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          {/* 磨砂噪点：极细颗粒纹理，毛玻璃的「砂」感来源（仅标准分支；原生壳省渲染） */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.025] dark:opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "160px 160px",
            }}
          />
        </>
      )}
    </div>
  )
}

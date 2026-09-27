"use client"

import { useState, useEffect } from "react"

/**
 * 检测当前环境是否对 CSS blur 渲染不佳（低端 Android WebView 等）。
 * 此类设备上 filter:blur 易出现块状边界、色块感；返回 true 时用 AppBackground 纯渐变分支。
 *
 * iOS（含 Capacitor）与桌面网页一致，使用完整 blur + 网格背景；仅 Android 等仍走轻量分支。
 */
export function useReducedBlurSupport(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    let reducedEnv = false
    try {
      const ua = navigator.userAgent || ""
      const cap = (window as { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } }).Capacitor
      const platform = cap?.getPlatform?.()
      // Capacitor / 浏览器 Android：大半径 blur 合成成本高或渲染差，走轻量背景
      if (platform === "android") {
        reducedEnv = true
      } else if (/android/i.test(ua)) {
        reducedEnv = true
      }
    } catch (_) {}

    setReduced(reducedEnv)
  }, [])

  return reduced
}

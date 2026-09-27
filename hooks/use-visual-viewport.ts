"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Hook to track visual viewport changes for mobile keyboard handling.
 * Returns the viewport height and keyboard offset for smooth layout adjustments.
 * Uses CSS custom properties for performant updates.
 *
 * 特别处理 iOS WebView 键盘关闭后视口高度不恢复的问题
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(0)
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0)
  const rafRef = useRef<number | null>(null)
  const lastHeightRef = useRef<number>(0)
  const lastKeyboardOffsetRef = useRef<number>(0)
  const lastViewportOffsetTopRef = useRef<number>(0)
  const initialInnerHeightRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === "undefined") return

    // 记录初始的 window.innerHeight
    initialInnerHeightRef.current = window.innerHeight

    const readViewportMetrics = () => {
      const innerHeight = window.innerHeight
      const vp = window.visualViewport
      const currentViewportHeight = vp ? vp.height : innerHeight
      const currentViewportOffsetTop = Math.max(0, vp?.offsetTop ?? 0)
      const rawKeyboardOffset = Math.max(0, innerHeight - currentViewportHeight)
      // iOS may pan the visual viewport upward while the keyboard opens. The
      // hidden bottom area is height shrink minus that pan, not the raw shrink.
      const currentKeyboardOffset = Math.max(0, rawKeyboardOffset - currentViewportOffsetTop)

      return {
        innerHeight,
        currentViewportHeight,
        currentViewportOffsetTop,
        currentKeyboardOffset,
      }
    }

    const forceViewportRefresh = () => {
      // 强制刷新视口高度 - 用于修复 iOS WebView 键盘关闭后的问题
      const currentInnerHeight = window.innerHeight

      // 如果 innerHeight 已经恢复到接近初始值，强制设置 html/body 高度
      if (Math.abs(currentInnerHeight - initialInnerHeightRef.current) < 50) {
        // 强制设置 html 和 body 的高度，确保 WebView 正确恢复
        document.documentElement.style.height = `${currentInnerHeight}px`
        document.documentElement.style.minHeight = `${currentInnerHeight}px`
        document.body.style.height = `${currentInnerHeight}px`
        document.body.style.minHeight = `${currentInnerHeight}px`

        // 触发一次滚动来强制浏览器重新计算视口
        const scrollY = window.scrollY
        window.scrollTo(0, scrollY + 1)
        window.scrollTo(0, scrollY)
      }
    }

    const updateViewport = () => {
      const {
        currentViewportHeight,
        currentViewportOffsetTop,
        currentKeyboardOffset,
      } = readViewportMetrics()
      const wasKeyboardOpen = lastKeyboardOffsetRef.current > 20
      const isKeyboardOpen = currentKeyboardOffset > 20

      // Only update if change is significant (avoid jitter)
      if (
        Math.abs(currentViewportHeight - lastHeightRef.current) > 1 ||
        Math.abs(currentKeyboardOffset - lastKeyboardOffsetRef.current) > 1 ||
        Math.abs(currentViewportOffsetTop - lastViewportOffsetTopRef.current) > 1
      ) {
        lastHeightRef.current = currentViewportHeight
        lastViewportOffsetTopRef.current = currentViewportOffsetTop
        setViewportHeight(currentViewportHeight)
        setKeyboardOffset(currentKeyboardOffset)
        lastKeyboardOffsetRef.current = currentKeyboardOffset

        // Set CSS custom properties for use in components
        document.documentElement.style.setProperty("--viewport-height", `${currentViewportHeight}px`)
        document.documentElement.style.setProperty("--visual-viewport-offset-top", `${currentViewportOffsetTop}px`)
        document.documentElement.style.setProperty("--keyboard-offset", `${currentKeyboardOffset}px`)
        document.documentElement.style.setProperty(
          "--is-keyboard-open",
          isKeyboardOpen ? "1" : "0",
        )

        // 检测键盘关闭事件：之前键盘是打开的，现在关闭了
        if (wasKeyboardOpen && !isKeyboardOpen) {
          // 键盘刚关闭，延迟执行强制刷新，确保 WebView 有时间更新
          setTimeout(() => {
            forceViewportRefresh()
            // 再次更新视口，确保获取到正确的高度
            requestAnimationFrame(() => {
              const {
                innerHeight: finalInnerHeight,
                currentViewportHeight: finalViewportHeight,
                currentViewportOffsetTop: finalViewportOffsetTop,
                currentKeyboardOffset: finalKeyboardOffset,
              } = readViewportMetrics()

              document.documentElement.style.height = `${finalInnerHeight}px`
              document.documentElement.style.minHeight = `${finalInnerHeight}px`
              document.body.style.height = `${finalInnerHeight}px`
              document.body.style.minHeight = `${finalInnerHeight}px`

              lastHeightRef.current = finalViewportHeight
              lastViewportOffsetTopRef.current = finalViewportOffsetTop
              lastKeyboardOffsetRef.current = finalKeyboardOffset
              setViewportHeight(finalViewportHeight)
              setKeyboardOffset(finalKeyboardOffset)

              document.documentElement.style.setProperty("--viewport-height", `${finalViewportHeight}px`)
              document.documentElement.style.setProperty("--visual-viewport-offset-top", `${finalViewportOffsetTop}px`)
              document.documentElement.style.setProperty("--keyboard-offset", `${finalKeyboardOffset}px`)
            })
          }, 100)
        }
      }

      rafRef.current = null
    }

    const scheduleUpdate = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(updateViewport)
      }
    }

    // Initial measurement
    updateViewport()

    // Use visualViewport API if available (modern mobile browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleUpdate, { passive: true })
      window.visualViewport.addEventListener("scroll", scheduleUpdate, { passive: true })
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", scheduleUpdate, { passive: true })
    }

    // 额外监听 window resize 事件，确保在键盘关闭时能捕获到
    window.addEventListener("resize", scheduleUpdate, { passive: true })

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", scheduleUpdate)
        window.visualViewport.removeEventListener("scroll", scheduleUpdate)
      }
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [])

  return { viewportHeight, keyboardOffset }
}

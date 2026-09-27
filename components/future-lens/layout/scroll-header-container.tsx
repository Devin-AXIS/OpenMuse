"use client"

import type React from "react"
import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react"
import { cn } from "@/lib/utils"

/**
 * 滚动状态上下文
 * 用于在 ScrollHeaderContainer 的子组件之间共享滚动状态
 */
interface ScrollContextValue {
  isScrolled: boolean
  scrollContainerId: string
}

const ScrollContext = createContext<ScrollContextValue>({
  isScrolled: false,
  scrollContainerId: "scroll-container",
})

export const useScrollContext = () => useContext(ScrollContext)

interface ScrollHeaderContainerProps {
  /** 滚动容器 ID */
  scrollContainerId?: string
  /** 子组件 */
  children: React.ReactNode
  /** 自定义类名 */
  className?: string
}

/**
 * ScrollHeaderContainer - 滚动顶部栏容器组件
 *
 * 统一管理滚动检测和透明背景效果，支持组合 Header、Tabs、扩展内容
 *
 * @example
 * ```tsx
 * <ScrollHeaderContainer scrollContainerId="scroll-container">
 *   <ScrollHeader title="页面标题" onBack={onBack} />
 *   <CapsuleTabs items={tabItems} activeId={activeId} onChange={setActiveId} />
 * </ScrollHeaderContainer>
 * ```
 */
export function ScrollHeaderContainer({
  scrollContainerId = "scroll-container",
  children,
  className,
}: ScrollHeaderContainerProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const scrollRafRef = useRef(0)
  const contextValue = useMemo(
    () => ({ isScrolled, scrollContainerId }),
    [isScrolled, scrollContainerId]
  )

  useEffect(() => {
    const container = document.getElementById(scrollContainerId) || window

    const handleScroll = () => {
      if (scrollRafRef.current !== 0) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0
        const scrollTop = container === window ? window.scrollY : (container as HTMLElement).scrollTop
        const next = scrollTop > 10
        setIsScrolled((prev) => (prev === next ? prev : next))
      })
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    // Trigger once to set initial state
    handleScroll()

    return () => {
      if (scrollRafRef.current !== 0) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = 0
      }
      container.removeEventListener("scroll", handleScroll)
    }
  }, [scrollContainerId])

  return (
    <ScrollContext.Provider value={contextValue}>
      <div className={cn("sticky top-0 left-0 right-0 z-30", className)}>{children}</div>
    </ScrollContext.Provider>
  )
}

"use client"

import type { ReactNode, UIEvent } from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useAppConfig } from "@/lib/future-lens/config-context"
import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button"
import { translations } from "@/lib/future-lens/i18n"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { Z_INDEX } from "@/lib/future-lens/constants"
import { getSheetTransition, getBackdropTransition } from "@/lib/future-lens/native-animation"
import { useVisualViewport } from "@/hooks/use-visual-viewport"
import { cn } from "@/lib/utils"

/** 与 use-app-keyboard-padding 等一致：视口被占超过此值视为键盘/IME 已弹起 */
const KEYBOARD_OFFSET_THRESHOLD_PX = 20

/**
 * 公用底部弹窗：贴底、固定高度、磨砂玻璃、深蓝光晕，无业务内容，仅提供壳子。
 * 用于反馈/弹窗类场景，具体内容由调用方通过 children / headerLeft / footer 传入。
 */
export interface BottomSheetModalProps {
  isOpen: boolean
  onClose: () => void
  /** 标题（列表/主视图时使用） */
  title?: string
  /** 是否显示右上角关闭按钮，默认 true */
  showClose?: boolean
  /** 头部左侧区域（如返回按钮），与 title 二选一或同时存在 */
  headerLeft?: ReactNode
  /** 头部右侧区域（如添加按钮），若提供则优先于 showClose 的关闭按钮 */
  headerRight?: ReactNode
  /** 主内容区，可滚动 */
  children: ReactNode
  /** 底部固定区域（如主按钮），带安全区 */
  footer?: ReactNode
  /** 内容区额外 class */
  contentClassName?: string
  /** 内容区滚动（与内部 overflow-y-auto 容器绑定） */
  onContentScroll?: (e: UIEvent<HTMLDivElement>) => void
  /** 多层底部弹窗叠放时提高 z-index（每 +1 升一档，避免被下层挡住） */
  stackLevel?: number
  /** 按内容自适应高度（最大 85vh），内容短时不留大片空白；默认 false = 固定 93vh */
  autoHeight?: boolean
}

export function BottomSheetModal({
  isOpen,
  onClose,
  title,
  showClose = true,
  headerLeft,
  headerRight,
  children,
  footer,
  contentClassName,
  onContentScroll,
  stackLevel = 0,
  autoHeight = false,
}: BottomSheetModalProps) {
  const { language } = useAppConfig()
  const t = translations[language] || translations["zh"]
  const { keyboardOffset, viewportHeight } = useVisualViewport()
  const avoidKeyboard = keyboardOffset > KEYBOARD_OFFSET_THRESHOLD_PX

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const zBase = Z_INDEX.MODAL + stackLevel * 100

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getBackdropTransition()}
            onClick={onClose}
            className="fixed inset-0 bg-transparent"
            style={{ zIndex: zBase, isolation: "isolate" }}
          />
          <div
            className="fixed left-0 right-0 flex flex-col justify-end pointer-events-none min-h-0"
            style={{
              zIndex: zBase + 10,
              isolation: "isolate",
              // 整块底栏上抬，避免在 iOS WebView 中仍被压在键盘后（与报告页等 layout 相同思路）
              bottom: avoidKeyboard ? keyboardOffset : 0,
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={getSheetTransition()}
              onClick={(e) => e.stopPropagation()}
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden" as const,
                ...(avoidKeyboard && viewportHeight > 0
                  ? { maxHeight: viewportHeight }
                  : null),
              }}
              className={cn(
                "relative w-full flex flex-col overflow-hidden pointer-events-auto",
                autoHeight ? "max-h-[85vh]" : "h-[93vh]",
                "rounded-t-2xl",
                "bg-card/60 backdrop-blur-[40px] border-t border-x border-border/50",
                "shadow-glass"
              )}
            >
              <div className="relative z-10 flex flex-col min-h-0 flex-1 overflow-hidden">
                {(title != null || showClose || headerLeft != null || headerRight != null) && (
                  <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1.5 flex-shrink-0">
                    <div className="w-8 shrink-0 flex items-center justify-start">
                      {headerLeft ?? null}
                    </div>
                    {title != null ? (
                      <h2 className="text-[15px] font-semibold text-foreground leading-tight flex-1 text-center truncate">
                        {title}
                      </h2>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className={cn("shrink-0 flex items-center justify-end", headerRight != null ? "min-w-0" : "w-8")}>
                      {headerRight ?? (showClose ? (
                        <HeaderIconButton ariaLabel={t.close} onClick={onClose}>
                          <X size={16} />
                        </HeaderIconButton>
                      ) : null)}
                    </div>
                  </div>
                )}

                <div
                  onScroll={onContentScroll}
                  className={cn(
                    "flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain",
                    contentClassName
                  )}
                  style={
                    avoidKeyboard
                      ? {
                          // 底栏已上抬，此处留一截即可，供最后一项表单项、focus 滚入可视区
                          paddingBottom: 20,
                          scrollPaddingBottom: 20,
                        }
                      : undefined
                  }
                >
                  {children}
                </div>

                {footer != null && (
                  <div className={cn("flex-shrink-0 pt-2", DesignTokens.mobile.safeBottom)}>
                    {footer}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  const portalContainer = document.getElementById("app-portal-container")
  if (portalContainer) return createPortal(content, portalContainer)
  return content
}

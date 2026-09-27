"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * 底部弹窗底部主按钮：全宽、圆角、主色，用于 BottomSheetModal 的 footer。
 * 与 create-task-sheet、setup-delivery-card 等保持统一样式，底部带安全区由父级 footer 容器提供。
 */
export interface SheetFooterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

export function SheetFooterButton({ children, className, ...props }: SheetFooterButtonProps) {
  return (
    <div className="px-4">
      <button
        type="button"
        className={cn(
          "w-full py-3 rounded-xl text-[14px] font-medium",
          "bg-primary text-primary-foreground",
          "hover:opacity-90 active:opacity-95 transition-opacity",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  )
}

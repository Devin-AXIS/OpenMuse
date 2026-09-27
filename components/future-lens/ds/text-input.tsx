"use client"

import type React from "react"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

/**
 * 文本输入框组件，支持标签、错误提示和左右图标
 * @example
 * ```tsx
 * <TextInput label="用户名" leftIcon={<User />} error="错误信息" />
 * ```
 */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={`block mb-1.5 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

        <div className="relative">
          <div
            className={cn(
              `flex items-center gap-2.5 px-4 py-2 rounded-[18px] min-h-[36px] transition-all ${DesignTokens.transition.fast}`,
              `bg-muted/50 ${DesignTokens.blur.input} hover:bg-muted`,
              error ? "ring-2 ring-destructive/50" : "ring-0",
              className,
            )}
          >
            {leftIcon && <div className="flex-shrink-0 text-muted-foreground">{leftIcon}</div>}

            <input
              ref={ref}
              className={cn(
                "flex-1 bg-transparent outline-none",
                "text-[15px] text-foreground placeholder:text-muted-foreground",
                DesignTokens.typography.body,
              )}
              // 默认禁用 iOS 键盘预测文本选择框（可通过 props 覆盖）
              autoCorrect={props.autoCorrect ?? "off"}
              autoComplete={props.autoComplete ?? "off"}
              spellCheck={props.spellCheck ?? false}
              inputMode={props.inputMode ?? "text"}
              {...props}
            />

            {rightIcon && <div className="flex-shrink-0 text-muted-foreground">{rightIcon}</div>}
          </div>
        </div>

        {error && <p className={`mt-1.5 text-[11px] ${DesignTokens.text.danger}`}>{error}</p>}
      </div>
    )
  },
)

TextInput.displayName = "TextInput"

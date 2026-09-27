"use client"

import type React from "react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

/**
 * 表单用单行输入框（公用组件，统一 DesignTokens.form.input）
 * 弹层/表单内一律用此组件，保证尺寸一致、后续改 token 即可全局生效
 */
export const FormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(function FormInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(DesignTokens.form.input, className)}
      {...props}
    />
  )
})

/**
 * 表单用多行输入框（公用组件，统一 DesignTokens.form.textarea）
 */
export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(function FormTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(DesignTokens.form.textarea, className)}
      {...props}
    />
  )
})

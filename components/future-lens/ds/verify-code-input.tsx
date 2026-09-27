"use client"

import type React from "react"
import { useState, forwardRef, useEffect, useRef, useImperativeHandle } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { KeyRound } from "lucide-react"
import { useAppConfig } from "@/lib/future-lens/config-context"
import { translations } from "@/lib/future-lens/i18n"
import { useKeyboardAware } from "@/hooks/use-keyboard-aware"

interface VerifyCodeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  onSendCode?: () => void
}

export const VerifyCodeInput = forwardRef<HTMLInputElement, VerifyCodeInputProps>(
  ({ label, error, onSendCode, className, ...props }, ref) => {
    const { language } = useAppConfig()
    const t = translations[language] || translations["zh"]

    const [countdown, setCountdown] = useState(0)
    const isSending = countdown > 0

    const internalRef = useRef<HTMLInputElement>(null)

    useKeyboardAware(internalRef as React.RefObject<HTMLInputElement>)

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

    useEffect(() => {
      let timer: NodeJS.Timeout
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      }
      return () => clearTimeout(timer)
    }, [countdown])

    const handleSend = () => {
      if (!isSending) {
        setCountdown(60)
        onSendCode?.()
      }
    }

    return (
      <div className="w-full">
        {label && <label className={`block mb-1.5 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

        <div className="relative">
          <div
            className={cn(
              "flex items-center px-4 py-2 rounded-[18px] min-h-[36px] transition-all duration-200",
              "bg-muted/50 backdrop-blur-sm hover:bg-muted",
              error ? "ring-2 ring-destructive/50" : "ring-0",
              className,
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 text-muted-foreground mr-2.5">
              <KeyRound size={16} />
            </div>

            {/* Input */}
            <input
              ref={internalRef}
              type="text"
              maxLength={6}
              className={cn(
                "flex-1 bg-transparent outline-none min-w-0",
                "text-[15px] text-foreground placeholder:text-muted-foreground",
                DesignTokens.typography.body,
              )}
              // 默认禁用 iOS 键盘预测文本选择框（可通过 props 覆盖）
              autoCorrect={props.autoCorrect ?? "off"}
              autoComplete={props.autoComplete ?? "off"}
              spellCheck={props.spellCheck ?? false}
              inputMode={props.inputMode ?? "numeric"}
              {...props}
            />

            {/* Send Button - Integrated inside the pill */}
            <div className="ml-2 pl-3 border-l border-muted-foreground/20 flex-shrink-0 h-full flex items-center">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className={cn(
                  "text-xs font-medium transition-colors whitespace-nowrap w-[72px] text-center flex justify-center items-center",
                  isSending
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-primary hover:text-primary/80 active:scale-95",
                )}
              >
                {isSending ? `${countdown}s` : t.settings_get_code}
              </button>
            </div>
          </div>
        </div>

        {error && <p className={`mt-1.5 text-[11px] ${DesignTokens.text.danger}`}>{error}</p>}
      </div>
    )
  },
)

VerifyCodeInput.displayName = "VerifyCodeInput"

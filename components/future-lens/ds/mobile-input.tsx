"use client"

import type React from "react"
import { useState, forwardRef, useRef, useImperativeHandle } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { ChevronDown, Smartphone } from "lucide-react"
import { ModalDialog } from "./modal-dialog"
import { useKeyboardAware } from "@/hooks/use-keyboard-aware"

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  countryCode?: string
  onCountryCodeChange?: (code: string) => void
}

const COUNTRY_CODES = [
  { code: "+86", label: "CN", name: "China" },
  { code: "+1", label: "US", name: "USA" },
  { code: "+852", label: "HK", name: "Hong Kong" },
  { code: "+81", label: "JP", name: "Japan" },
  { code: "+44", label: "UK", name: "UK" },
]

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, countryCode = "+86", onCountryCodeChange, className, ...props }, ref) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const internalRef = useRef<HTMLInputElement>(null)

    useKeyboardAware(internalRef as React.RefObject<HTMLInputElement>)

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

    return (
      <div className="w-full">
        {label && <label className={`block mb-1.5 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

        <div className="relative">
          <div
            className={cn(
              "flex items-center px-4 py-2 rounded-[18px] min-h-[36px] transition-all",
              DesignTokens.transition.fast,
              `bg-muted/50 ${DesignTokens.blur.input} hover:bg-muted`,
              error ? "ring-2 ring-destructive/50" : "ring-0",
              className,
            )}
          >
            {/* Country Code Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsPickerOpen(true)
              }}
              className="flex items-center gap-1.5 pr-2 mr-2 border-r border-muted-foreground/20 text-foreground hover:text-primary transition-colors relative z-10"
              style={{ pointerEvents: "auto" }}
            >
              <Smartphone size={16} className="text-muted-foreground" />
              <span className={`text-[15px] ${DesignTokens.typography.body} font-medium`}>{countryCode}</span>
              <ChevronDown size={12} className="text-muted-foreground opacity-70" />
            </button>

            {/* Phone Input */}
            <input
              ref={internalRef}
              type="tel"
              className={cn(
                "flex-1 bg-transparent outline-none",
                "text-[15px] text-foreground placeholder:text-muted-foreground",
                DesignTokens.typography.body,
              )}
              suppressHydrationWarning
              style={{ pointerEvents: "auto" }}
              // 默认禁用 iOS 键盘预测文本选择框（可通过 props 覆盖）
              autoCorrect={props.autoCorrect ?? "off"}
              autoComplete={props.autoComplete ?? "off"}
              spellCheck={props.spellCheck ?? false}
              inputMode={props.inputMode ?? "tel"}
              {...props}
            />
          </div>
        </div>

        {error && <p className={`mt-1.5 text-[11px] ${DesignTokens.text.danger}`}>{error}</p>}

        {/* Country Code Picker Action Sheet */}
        <ModalDialog
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          variant="action-sheet"
          title="Select Region"
          level="ALERT"
        >
          <div className="flex flex-col gap-1 pt-2 pb-4 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y overflow-x-hidden">
            {COUNTRY_CODES.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  onCountryCodeChange?.(item.code)
                  setIsPickerOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl transition-colors",
                  countryCode === item.code
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary/50 text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold w-8">{item.label}</span>
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm opacity-70">{item.code}</span>
              </button>
            ))}
          </div>
        </ModalDialog>
      </div>
    )
  },
)

MobileInput.displayName = "MobileInput"

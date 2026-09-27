"use client"

import { useState } from "react"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { ModalDialog } from "./modal-dialog"

export interface SelectOption {
  value: string
  label: string
}

/**
 * 选择器组件，支持下拉选择
 * @example
 * ```tsx
 * <Select options={[{value: '1', label: '选项1'}]} onChange={(v) => console.log(v)} />
 * ```
 */
interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  error?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = "请选择", label, error, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)
  const displayText = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
  }

  return (
    <>
      <div className={cn("w-full", className)}>
        {label && <label className={`block mb-1.5 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            `w-full flex items-center justify-between gap-2.5 px-4 py-2 rounded-[18px] min-h-[36px] transition-all ${DesignTokens.transition.fast}`,
            `bg-muted/50 ${DesignTokens.blur.input} hover:bg-muted text-left`,
            error ? "ring-2 ring-destructive/50" : "ring-0",
          )}
        >
          <span
            className={cn(
              "text-[15px] flex-1",
              !value ? "text-muted-foreground" : "text-foreground",
              DesignTokens.typography.body,
            )}
          >
            {displayText}
          </span>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </button>

        {error && <p className={`mt-1.5 text-[11px] ${DesignTokens.text.danger}`}>{error}</p>}
      </div>

      <ModalDialog isOpen={isOpen} onClose={() => setIsOpen(false)} variant="action-sheet" level="OVERLAY">
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left",
                  isSelected ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-[15px]",
                    isSelected ? "text-primary font-medium" : "text-foreground",
                    DesignTokens.typography.body,
                  )}
                >
                  {option.label}
                </span>
                {isSelected && <Check size={16} className="text-primary" />}
              </button>
            )
          })}
        </div>
      </ModalDialog>
    </>
  )
}

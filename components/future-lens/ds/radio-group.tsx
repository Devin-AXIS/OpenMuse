"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"

interface RadioOption {
  value: string
  label: string
}

interface RadioGroupProps {
  label?: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  layout?: "list" | "wrap"
  className?: string
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ label, options, value, onChange, layout = "list", className }) => {
  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(value || "")
  const selectedValue = isControlled ? value || "" : uncontrolledValue

  const handleSelect = (optionValue: string) => {
    if (!isControlled) setUncontrolledValue(optionValue)
    onChange?.(optionValue)
  }

  return (
    <div className={cn("w-full", className)}>
      {label && <label className={`block mb-2 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

      <div className={cn(layout === "wrap" ? "flex flex-wrap gap-1.5" : "space-y-2")}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={
              layout === "wrap"
                ? cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors duration-200 touch-manipulation active:scale-[0.98]",
                    selectedValue === option.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/35 bg-muted/15 text-muted-foreground hover:border-border/55 hover:bg-muted/30 hover:text-foreground"
                  )
                : cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-[18px] transition-all duration-200",
                    "bg-muted/30 backdrop-blur-sm hover:bg-muted/50",
                    selectedValue === option.value && "bg-muted ring-2 ring-primary/20",
                  )
            }
          >
            {layout === "list" ? (
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedValue === option.value ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
              >
                {selectedValue === option.value && <div className="w-2 h-2 rounded-full bg-background" />}
              </div>
            ) : null}
            <span className={layout === "wrap" ? undefined : `flex-1 text-left text-[15px] ${DesignTokens.typography.body}`}>
              {option.label}
            </span>
            {layout === "wrap" && selectedValue === option.value ? <CheckIcon /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function CheckIcon() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />
}

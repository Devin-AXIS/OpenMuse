"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { DesignTokens } from "@/lib/future-lens/design-tokens"
import { Check } from "lucide-react"

interface CheckboxOption {
  value: string
  label: string
}

interface CheckboxGroupProps {
  label?: string
  options: CheckboxOption[]
  value?: string[]
  onChange?: (values: string[]) => void
  layout?: "list" | "wrap"
  className?: string
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, options, value, onChange, layout = "list", className }) => {
  const isControlled = value !== undefined
  const [uncontrolledValues, setUncontrolledValues] = useState<string[]>(value ?? [])
  const selectedValues = isControlled ? value ?? [] : uncontrolledValues

  const handleToggle = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue]

    if (!isControlled) setUncontrolledValues(newValues)
    onChange?.(newValues)
  }

  return (
    <div className={cn("w-full", className)}>
      {label && <label className={`block mb-2 text-[13px] ${DesignTokens.typography.caption}`}>{label}</label>}

      <div className={cn(layout === "wrap" ? "flex flex-wrap gap-1.5" : "space-y-2")}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleToggle(option.value)}
            className={
              layout === "wrap"
                ? cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors duration-200 touch-manipulation active:scale-[0.98]",
                    selectedValues.includes(option.value)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/35 bg-muted/15 text-muted-foreground hover:border-border/55 hover:bg-muted/30 hover:text-foreground"
                  )
                : cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-[18px] transition-all duration-200",
                    "bg-muted/30 backdrop-blur-sm hover:bg-muted/50",
                    selectedValues.includes(option.value) && "bg-muted ring-2 ring-primary/20",
                  )
            }
          >
            {layout === "list" ? (
              <div
                className={cn(
                  "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                  selectedValues.includes(option.value) ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
              >
                {selectedValues.includes(option.value) && <Check size={12} className="text-white" />}
              </div>
            ) : null}
            <span className={layout === "wrap" ? undefined : `flex-1 text-left text-[15px] ${DesignTokens.typography.body}`}>{option.label}</span>
            {layout === "wrap" && selectedValues.includes(option.value) ? <Check size={12} className="shrink-0" strokeWidth={2.5} /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

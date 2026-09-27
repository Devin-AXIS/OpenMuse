"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "w-[36px] h-[20px] rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked ? "bg-slate-600 dark:bg-slate-500" : "bg-neutral-200 dark:bg-neutral-600",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
        className={cn(
          "w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] pointer-events-none",
          checked ? "ml-auto" : "ml-0",
        )}
      />
    </button>
  )
}

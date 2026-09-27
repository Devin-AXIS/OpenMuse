"use client"

import { type LucideIcon } from "lucide-react"
import { GlassPanel } from "../ds/glass-panel"
import { cn } from "@/lib/utils"
import { useReducedBlurSupport } from "@/hooks/use-reduced-blur-support"

export interface FloatingDockProps {
  items: { id: string; icon: LucideIcon; label?: string }[]
  activeId: string
  onTabChange: (id: string) => void
  className?: string
}

export function FloatingDock({ items, activeId, onTabChange, className }: FloatingDockProps) {
  const reducedBlur = useReducedBlurSupport()
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 flex justify-center items-center gap-4 px-5 z-50 pointer-events-none",
        className,
      )}
      style={{
        paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <GlassPanel
        intensity={reducedBlur ? "medium" : "high"}
        className="pointer-events-auto relative h-[60px] rounded-[30px] px-8 flex items-center w-full justify-between"
      >
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-label={item.label ?? item.id}
              title={item.label}
              className="relative w-14 h-full flex flex-col items-center justify-center outline-none group"
            >
              <div
                className={cn(
                  "relative z-10 transition-all duration-300",
                  isActive ? "scale-105" : "group-hover:scale-105 opacity-50 hover:opacity-80",
                )}
              >
                <item.icon
                  size={22}
                  strokeWidth={2}
                  className={cn(
                    "transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                />
              </div>
              {isActive && (
                <span className="absolute bottom-2.5 w-1 h-1 bg-primary rounded-full transition-opacity duration-200" />
              )}
            </button>
          )
        })}
      </GlassPanel>
    </div>
  )
}

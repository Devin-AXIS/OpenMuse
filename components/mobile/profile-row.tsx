import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ProfileRow({ icon, label, sublabel, onClick, inCard = true }: {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  inCard?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-all duration-150 active:scale-[0.99]",
        inCard ? "rounded-none hover:bg-muted/30" : "rounded-lg hover:bg-muted/40",
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-muted/70 to-muted/40 text-muted-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] ring-1 ring-border/40 transition-all group-hover:text-primary group-hover:ring-border/60">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{label}</span>
        {sublabel ? <span className="block truncate text-[11px] text-muted-foreground">{sublabel}</span> : null}
      </div>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-60" />
    </button>
  );
}

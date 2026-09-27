import { Cloud } from "lucide-react";

import { GlassPanel } from "@/components/future-lens/ds/glass-panel";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <GlassPanel intensity="subtle" className="px-5 py-9 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Cloud size={20} strokeWidth={1.7} />
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </GlassPanel>
  );
}

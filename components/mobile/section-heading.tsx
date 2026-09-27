import type { ReactNode } from "react";

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-[12px] font-semibold tracking-[0.08em] text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

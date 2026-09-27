"use client";

import { AppBackground } from "@/components/future-lens/ds/app-background";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { language } = useAppConfig();
  const t = translations[language];
  return (
    <main className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 text-foreground">
      <AppBackground />
      <section className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 text-center shadow-glass-high backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-[18px] font-semibold text-destructive">!</div>
        <p className="mt-4 text-[13px] text-muted-foreground">{t.error_generic}</p>
        <button type="button" onClick={reset} className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-transform active:scale-[0.99]">{t.retry}</button>
      </section>
    </main>
  );
}

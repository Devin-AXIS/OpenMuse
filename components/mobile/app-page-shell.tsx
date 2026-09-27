"use client";

import { Activity, Lightbulb, MessageCircle, Target, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import { AppBackground } from "@/components/future-lens/ds/app-background";
import { FloatingDock } from "@/components/future-lens/nav/floating-dock";
import { translations } from "@/lib/future-lens/i18n";
import { useAppConfig } from "@/lib/future-lens/config-context";

type TabId = "home" | "chat" | "goals" | "activity" | "memory" | "account";

const routes: Record<TabId, string> = { home: "/", chat: "/chat", goals: "/goals", activity: "/activity", memory: "/memory", account: "/account" };

export function AppPageShell({ active, children, contentClassName, innerClassName }: { active: TabId; children: ReactNode; contentClassName?: string; innerClassName?: string }) {
  const router = useRouter();
  const { language } = useAppConfig();
  const t = translations[language];
  return (
    <main className="relative h-[100dvh] overflow-hidden bg-background text-foreground">
      <AppBackground />
      <div className={cn("relative z-10 h-full overflow-y-auto px-3 pb-28 pt-[max(1rem,env(safe-area-inset-top))]", contentClassName)}>
        <div className={cn("mx-auto w-full max-w-lg", innerClassName)}>{children}</div>
      </div>
      <FloatingDock
        activeId={active}
        onTabChange={(id) => router.push(routes[id as TabId])}
        items={[
          { id: "chat", icon: MessageCircle, label: "对话" },
          { id: "goals", icon: Target, label: "目标" },
          { id: "activity", icon: Activity, label: "活动" },
          { id: "memory", icon: Lightbulb, label: "记忆" },
          { id: "account", icon: UserRound, label: t.nav_account },
        ]}
      />
    </main>
  );
}

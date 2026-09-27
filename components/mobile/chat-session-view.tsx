"use client";

import { Activity, ArrowRight, Check, Cloud, Laptop, Lightbulb, Menu, Plus, ScanLine, Sparkles, Target, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppBackground } from "@/components/future-lens/ds/app-background";
import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button";
import { ChatComposer } from "@/components/mobile/chat-composer";
import { ChatMessageList } from "@/components/mobile/chat-message-list";
import { ChatTodoCard } from "@/components/mobile/chat-todo-card";
import { ChatPermissionDialog } from "@/components/mobile/chat-permission-dialog";
import { EmptyState } from "@/components/mobile/empty-state";
import { useChatSession } from "@/hooks/use-chat-session";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

type Runtime = "cloud-dsh" | "ipollowork-pc";
const HEADER_WRAPPER_CLASS = "relative z-50 flex flex-col shrink-0 rounded-t-3xl bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-2xl border-b border-white/10 dark:border-white/5 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]";

export function ChatSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { language } = useAppConfig();
  const t = translations[language];
  const [runtime, setRuntime] = useState<Runtime>("cloud-dsh");
  const [pcConnected, setPcConnected] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [approval, setApproval] = useState<"pending" | "approved" | "rejected">("pending");
  const chat = useChatSession(sessionId, runtime);
  const busy = chat.status.type === "busy" || chat.status.type === "retry";
  const activePermission = chat.permissions[0] ?? null;
  const latestRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const title = chat.session?.title || "新对话";
  const runtimeLabel = runtime === "cloud-dsh" ? "Cloud · DSH" : "iPolloWork PC";

  const replyActivePermission = useCallback((reply: "once" | "always" | "reject") => {
    if (activePermission) void chat.replyPermission(activePermission, reply);
  }, [activePermission, chat.replyPermission]);
  const scheduleLatestMessage = useCallback(() => {
    if (scrollFrameRef.current != null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      latestRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }, []);

  useEffect(() => { scheduleLatestMessage(); }, [chat.messages, chat.todos, chat.activity, chat.activeAssistantMessageId, busy, scheduleLatestMessage]);
  useEffect(() => () => { if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current); }, []);

  function chooseRuntime(next: Runtime) {
    setRuntimeOpen(false);
    if (next === "ipollowork-pc" && !pcConnected) { setPairOpen(true); return; }
    setRuntime(next);
  }

  function completePairing() {
    setPcConnected(true);
    setRuntime("ipollowork-pc");
    setPairOpen(false);
    setPairCode("");
  }

  function go(path: string) { setDrawerOpen(false); router.push(path); }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-background text-foreground">
      <AppBackground />
      <div className="relative z-10 flex h-full flex-col">
        <header className={`${HEADER_WRAPPER_CLASS} pt-[env(safe-area-inset-top)]`}>
          <div className="flex min-h-[52px] items-center justify-between gap-2 px-3">
            <HeaderIconButton ariaLabel="打开导航" onClick={() => setDrawerOpen(true)}><Menu size={19} /></HeaderIconButton>
            <div className="flex min-w-0 flex-1 items-center gap-2 pl-1 pr-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background"><Sparkles size={14} /></span>
              <h1 className="min-w-0 flex-1 truncate text-left text-[14.5px] font-semibold tracking-tight text-foreground">{title}</h1>
            </div>
            <div className="relative shrink-0">
              <button type="button" onClick={() => setRuntimeOpen((value) => !value)} className="flex h-[34px] items-center gap-1.5 rounded-full border border-border/50 bg-card/75 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
                {runtime === "cloud-dsh" ? <Cloud size={13} /> : <Laptop size={13} />}
                <span className="max-w-[91px] truncate">{runtimeLabel}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </button>
              {runtimeOpen ? <div className="absolute right-0 top-10 z-[70] w-[230px] rounded-2xl border border-border/55 bg-background/95 p-1.5 shadow-[0_18px_48px_-20px_rgba(0,0,0,.45)] backdrop-blur-2xl">
                <p className="px-2.5 pb-1.5 pt-2 text-[9px] font-semibold uppercase tracking-[.12em] text-muted-foreground/70">运行位置</p>
                <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left hover:bg-muted/55" onClick={() => chooseRuntime("cloud-dsh")}><Cloud size={16} className="text-primary/70" /><span className="flex-1"><strong className="block text-[11px] font-medium">OpenMuse Cloud</strong><small className="mt-0.5 block text-[9px] text-muted-foreground">DSH · 随时可用</small></span>{runtime === "cloud-dsh" && <Check size={15} className="text-emerald-600" />}</button>
                <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left hover:bg-muted/55" onClick={() => chooseRuntime("ipollowork-pc")}><Laptop size={16} className="text-primary/70" /><span className="flex-1"><strong className="block text-[11px] font-medium">iPolloWork PC</strong><small className="mt-0.5 block text-[9px] text-muted-foreground">{pcConnected ? "已配对" : "扫码配对后使用"}</small></span>{runtime === "ipollowork-pc" && <Check size={15} className="text-emerald-600" />}</button>
                <p className="mx-2.5 mb-1 mt-1 border-t border-border/45 pt-2 text-[9px] text-muted-foreground/70">对话使用 iPolloWork PC 的统一消息结构</p>
              </div> : null}
            </div>
          </div>
          <ChatTodoCard todos={chat.todos} language={language} isStreaming={busy} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
          <div className="mx-auto w-full max-w-lg">
            {!chat.session && (chat.state === "loading" || chat.state === "error")
              ? <div className="pt-24"><EmptyState title={chat.state === "error" ? t.worker_failed : t.worker_preparing} description={chat.state === "error" ? t.error_generic : t.worker_preparing_hint} /></div>
              : chat.messages.length === 0
                ? <MuseWelcome runtimeLabel={runtimeLabel} onPrompt={(prompt) => void chat.send({ text: prompt })} />
                : <ChatMessageList messages={chat.messages} language={language} isStreaming={busy} activity={chat.activity} error={chat.error} activeAssistantMessageId={chat.activeAssistantMessageId} latestRef={latestRef} readArtifact={chat.readArtifact} downloadArtifact={chat.downloadArtifact} readEditableArtifact={chat.readEditableArtifact} writeEditableArtifact={chat.writeEditableArtifact} />}
          </div>
        </div>

        <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto w-full max-w-lg">
            {chat.messages.length ? <div className="mb-1 flex items-center gap-1.5 px-2 text-[9px] text-muted-foreground/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{pcConnected && runtime === "ipollowork-pc" ? "通过 iPolloWork PC 运行" : "运行于 OpenMuse Cloud · DSH"}<button className="ml-auto inline-flex items-center gap-1 text-muted-foreground/70" onClick={() => setPairOpen(true)}><Laptop size={11} />连接 PC</button></div> : null}
            <ChatComposer busy={busy} onSend={chat.send} onStop={chat.stop} />
          </div>
        </div>
      </div>

      <ChatPermissionDialog permission={activePermission} language={language} busy={chat.permissionReplyId != null} onReply={replyActivePermission} />
      {drawerOpen ? <MuseDrawer pcConnected={pcConnected} onClose={() => setDrawerOpen(false)} onNavigate={go} onPair={() => { setDrawerOpen(false); setPairOpen(true); }} onNew={() => { setDrawerOpen(false); router.push("/chat/new"); }} /> : null}
      {pairOpen ? <PairDialog code={pairCode} onCode={setPairCode} onClose={() => setPairOpen(false)} onPair={completePairing} /> : null}
      {runtimeOpen ? <button className="fixed inset-0 z-[60] cursor-default" aria-label="关闭运行位置选择" onClick={() => setRuntimeOpen(false)} /> : null}
      {approval !== "pending" ? <span className="sr-only">活动审批已处理：{approval}</span> : null}
    </main>
  );
}

function MuseWelcome({ runtimeLabel, onPrompt }: { runtimeLabel: string; onPrompt: (prompt: string) => void }) {
  const prompts = [
    { icon: Target, title: "帮我推进一个目标", text: "我想开始规律运动，帮我做个容易坚持的计划。" },
    { icon: Lightbulb, title: "把一个想法变成计划", text: "我有个新想法，帮我梳理一下下一步。" },
    { icon: Activity, title: "整理今天的安排", text: "帮我看看今天怎么安排更合适。" },
  ];
  return <section className="flex min-h-[min(58vh,580px)] flex-col items-center justify-center pb-7 pt-8 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[21px] border border-border/40 bg-card/80 text-foreground shadow-[0_8px_30px_-17px_rgba(15,23,42,.4)]"><Sparkles size={22} strokeWidth={1.6} /></div>
    <div className="mb-2 flex items-center gap-2 text-[10px] font-medium tracking-wide text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />你的个人 AI 助手</div>
    <h2 className="max-w-[330px] text-[26px] font-semibold leading-[1.25] tracking-[-.045em] text-foreground">今天想从哪件事<br />开始？</h2>
    <p className="mt-2 max-w-[330px] text-[11px] leading-relaxed text-muted-foreground">告诉我你想做什么。我会记住重要背景、持续推进目标，<br className="hidden min-[410px]:block" />需要你决定时再来问你。</p>
    <div className="mt-7 grid w-full gap-2.5">
      {prompts.map(({ icon: Icon, title, text }) => <button key={title} onClick={() => onPrompt(text)} className="group flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/45 bg-card/60 px-3.5 py-2.5 text-left shadow-[0_4px_18px_-15px_rgba(15,23,42,.3)] transition-all hover:border-primary/20 hover:bg-card/90 active:scale-[.99]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground transition-colors group-hover:text-primary"><Icon size={16} strokeWidth={1.8} /></span><span className="min-w-0 flex-1"><strong className="block text-[11px] font-medium text-foreground/90">{title}</strong><small className="mt-0.5 block truncate text-[9px] text-muted-foreground">{text}</small></span><ArrowRight size={14} className="shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" /></button>)}
    </div>
    <p className="mt-5 text-[9px] text-muted-foreground/65">当前运行：{runtimeLabel} · 前端原型</p>
  </section>;
}

function MuseDrawer({ pcConnected, onClose, onNavigate, onPair, onNew }: { pcConnected: boolean; onClose: () => void; onNavigate: (path: string) => void; onPair: () => void; onNew: () => void }) {
  const links = [
    { icon: Target, label: "目标", detail: "持续推进你在意的事", path: "/goals" },
    { icon: Activity, label: "活动", detail: "查看最近完成与待确认", path: "/activity" },
    { icon: Lightbulb, label: "记忆", detail: "管理 OpenMuse 记住的内容", path: "/memory" },
  ];
  return <div className="fixed inset-0 z-[80] flex bg-black/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="flex h-full w-[min(330px,86vw)] flex-col border-r border-border/40 bg-background/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] shadow-2xl backdrop-blur-2xl animate-in slide-in-from-left duration-200">
      <div className="mb-4 flex h-10 items-center justify-between px-1"><div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight"><span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-foreground text-background"><Sparkles size={14} /></span>OpenMuse</div><HeaderIconButton ariaLabel="关闭导航" onClick={onClose}><X size={17} /></HeaderIconButton></div>
      <button onClick={onNew} className="mb-3 flex h-10 items-center gap-2.5 rounded-xl bg-foreground px-3 text-left text-[12px] font-medium text-background shadow-sm"><Plus size={16} />新对话<span className="ml-auto text-[9px] opacity-60">开始新的对话</span></button>
      <p className="mb-1 px-2 pt-2 text-[9px] font-semibold uppercase tracking-[.13em] text-muted-foreground/60">个人空间</p>
      {links.map(({ icon: Icon, label, detail, path }) => <button key={path} onClick={() => onNavigate(path)} className="flex items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-muted/55"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"><Icon size={16} /></span><span className="min-w-0 flex-1"><strong className="block text-[11px] font-medium">{label}</strong><small className="mt-0.5 block truncate text-[9px] text-muted-foreground">{detail}</small></span><ArrowRight size={14} className="text-muted-foreground/50" /></button>)}
      <p className="mb-1 mt-5 px-2 text-[9px] font-semibold uppercase tracking-[.13em] text-muted-foreground/60">连接设备</p>
      <button onClick={onPair} className="flex items-center gap-3 rounded-xl border border-border/45 bg-card/55 px-2.5 py-3 text-left transition-colors hover:bg-card"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/65 text-muted-foreground"><ScanLine size={16} /></span><span className="min-w-0 flex-1"><strong className="block text-[11px] font-medium">扫码连接 iPolloWork PC</strong><small className="mt-0.5 block text-[9px] text-muted-foreground">{pcConnected ? "已配对 · 点击管理设备" : "手机可调用电脑上的引擎"}</small></span><ArrowRight size={14} className="text-muted-foreground/50" /></button>
      <div className="mt-auto rounded-2xl border border-border/40 bg-card/55 p-3"><div className="flex items-center gap-2"><Cloud size={15} className="text-primary/75" /><span className="text-[10px] font-medium">OpenMuse Cloud · DSH</span><span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" /></div><p className="mt-1.5 pl-[23px] text-[9px] leading-relaxed text-muted-foreground">移动端独立使用；PC 在线时也可以切换到桌面引擎。</p></div>
    </aside>
    <button aria-label="关闭导航" className="min-w-0 flex-1" onClick={onClose} />
  </div>;
}

function PairDialog({ code, onCode, onClose, onPair }: { code: string; onCode: (code: string) => void; onClose: () => void; onPair: () => void }) {
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-0 pb-0 pt-8 backdrop-blur-[2px] min-[600px]:items-center min-[600px]:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="pair-title" className="relative w-full max-w-lg rounded-t-[28px] border border-border/45 bg-background px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-20px_80px_-45px_rgba(0,0,0,.45)] min-[600px]:rounded-[24px]">
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-muted-foreground/20 min-[600px]:hidden" />
      <button aria-label="关闭" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X size={17} /></button>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary"><Laptop size={19} /></div>
      <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">IPOLLOWORK DESKTOP</p>
      <h2 id="pair-title" className="mt-1 text-[20px] font-semibold tracking-tight">连接你的 PC</h2>
      <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted-foreground">在 iPolloWork PC 打开「设置 → 手机连接」，扫描电脑上的二维码，或输入配对码。</p>
      <div className="my-5 flex h-[148px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/25"><div className="relative flex h-[106px] w-[106px] items-center justify-center rounded-xl border border-border/50 bg-background/80 text-primary/65"><ScanLine size={42} strokeWidth={1.2} /><span className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-primary/55" /><span className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-primary/55" /><span className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-primary/55" /><span className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-primary/55" /></div></div>
      <label className="mb-1.5 block text-[10px] font-medium text-foreground/75" htmlFor="pc-pair-code">电脑显示的 6 位配对码</label>
      <input id="pc-pair-code" value={code} onChange={(event) => onCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="例如：281 604" className="h-11 w-full rounded-xl border border-border/55 bg-card px-3 text-center text-[16px] tracking-[.35em] outline-none focus:border-primary/40" />
      <button onClick={onPair} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[11px] font-medium text-background"><ScanLine size={15} />演示配对</button>
      <p className="mt-2 text-center text-[9px] text-muted-foreground/70">前端原型：摄像头扫码和真实 PC 配对尚未接入。</p>
    </section>
  </div>;
}

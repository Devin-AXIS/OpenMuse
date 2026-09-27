"use client";

import { Activity, ArrowRight, Check, CheckCheck, Clock3, Lightbulb, Plus, ShieldCheck, Target, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import { AppPageShell } from "@/components/mobile/app-page-shell";

type Section = "goals" | "activity" | "memory";

export function MuseSectionPage({ section }: { section: Section }) {
  const [approval, setApproval] = useState<"pending" | "allowed" | "rejected">("pending");
  const [memory, setMemory] = useState([true, true, true]);
  const title = section === "goals" ? "你的目标" : section === "activity" ? "活动" : "记忆";
  const subtitle = section === "goals"
    ? "把长期想做的事拆成小步，持续向前。"
    : section === "activity" ? "看看 OpenMuse 正在做什么，以及哪些事情需要你决定。"
      : "OpenMuse 记住的内容由你决定，可以随时查看和删除。";
  return <AppPageShell active={section} contentClassName="pb-28" innerClassName="max-w-lg">
    <header className="px-1 pb-5 pt-2">
      <div className="mb-1.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground"><SectionIcon section={section} />{section}</div>
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </header>
    {section === "goals" ? <GoalsContent /> : null}
    {section === "activity" ? <ActivityContent approval={approval} onApproval={setApproval} /> : null}
    {section === "memory" ? <MemoryContent memory={memory} onToggle={(index) => setMemory((current) => current.map((value, item) => item === index ? !value : value))} /> : null}
  </AppPageShell>;
}

function SectionIcon({ section }: { section: Section }) {
  if (section === "goals") return <Target size={13} />;
  if (section === "activity") return <Activity size={13} />;
  return <Lightbulb size={13} />;
}

function GoalsContent() {
  const goals = [
    { title: "建立规律的运动习惯", detail: "每周运动 3 次 · 已坚持 2 周", progress: 67, next: "今天 18:30 · 轻松跑 30 分钟" },
    { title: "完成个人作品集改版", detail: "整理案例、更新首页、发布上线", progress: 35, next: "下一步 · 整理 3 个代表项目" },
  ];
  return <div className="space-y-3">
    <div className="flex items-center justify-between px-1 pb-1 text-[10px] text-muted-foreground"><span>2 个进行中的目标</span><button className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[10px] font-medium text-background" onClick={() => window.alert("新建目标会通过对话创建。")}><Plus size={14} />新建目标</button></div>
    {goals.map((goal, index) => <GlassPanel key={goal.title} intensity="subtle" className="p-4">
      <div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${index === 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-sky-500/10 text-sky-700"}`}><Target size={17} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-[12px] font-semibold text-foreground">{goal.title}</h2><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{goal.detail}</p></div><span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{goal.progress}%</span></div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${index === 0 ? "bg-emerald-600/70" : "bg-sky-600/65"}`} style={{ width: `${goal.progress}%` }} /></div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-2 text-[9.5px] text-muted-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-lg bg-background text-primary/70"><Check size={12} /></span><span className="min-w-0 flex-1 truncate">{goal.next}</span><ArrowRight size={13} /></div>
    </GlassPanel>)}
    <p className="px-1 pt-1 text-[9px] leading-relaxed text-muted-foreground/75">告诉 OpenMuse 一个你想实现的目标，它会帮你拆解计划并跟进进展。</p>
  </div>;
}

function ActivityContent({ approval, onApproval }: { approval: "pending" | "allowed" | "rejected"; onApproval: (value: "pending" | "allowed" | "rejected") => void }) {
  return <div className="space-y-5">
    <section>
      <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold text-foreground">需要你决定 {approval === "pending" && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-medium text-amber-700">1</span>}</div>
      {approval === "pending" ? <GlassPanel intensity="subtle" className="border-amber-500/15 p-3.5">
        <div className="flex items-center gap-2 text-[9px] font-medium text-amber-700"><ShieldCheck size={15} />等待你的确认</div>
        <h2 className="mt-3 text-[12px] font-semibold">允许创建日历提醒？</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">为你在每周一上午 9:00 创建“本周计划回顾”提醒。</p>
        <div className="mt-3 flex gap-2 border-t border-border/45 pt-3"><button onClick={() => onApproval("rejected")} className="h-8 flex-1 rounded-lg border border-border/55 bg-background/50 text-[9px] text-muted-foreground">拒绝</button><button onClick={() => onApproval("allowed")} className="h-8 flex-1 rounded-lg bg-foreground text-[9px] font-medium text-background">本次允许</button></div>
      </GlassPanel> : <GlassPanel intensity="subtle" className="flex items-center gap-2 p-3 text-[10px] text-muted-foreground"><CheckCheck size={15} className="text-emerald-600" />{approval === "allowed" ? "你已允许创建提醒" : "你已拒绝创建提醒"}<button onClick={() => onApproval("pending")} className="ml-auto text-[9px] underline underline-offset-2">撤销</button></GlassPanel>}
    </section>
    <section><div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold text-foreground"><span>最近活动</span><span className="text-[9px] font-normal text-muted-foreground">今天 · 9 月 27 日</span></div><GlassPanel intensity="subtle" className="divide-y divide-border/40 px-3">
      <TimelineItem icon={<Check size={13} />} title="整理了你的本周计划" detail="按优先级排好 4 项待办，并找出 2 个空档。" time="09:14" tone="done" />
      <TimelineItem icon={<Clock3 size={13} />} title="正在关注：规律运动" detail="已找到今天傍晚适合运动的时间。" time="08:30" tone="working" />
      <TimelineItem icon={<Clock3 size={13} />} title="下次回顾：作品集进度" detail="周二 16:00 · 提醒前会查看最新进展。" time="计划中" tone="planned" />
    </GlassPanel></section>
  </div>;
}

function TimelineItem({ icon, title, detail, time, tone }: { icon: ReactNode; title: string; detail: string; time: string; tone: string }) {
  return <div className="flex items-start gap-2.5 py-3 first:pt-3 last:pb-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone === "done" ? "bg-emerald-500/10 text-emerald-700" : tone === "working" ? "bg-sky-500/10 text-sky-700" : "bg-muted text-muted-foreground"}`}>{icon}</span><div className="min-w-0 flex-1"><h3 className="text-[10px] font-medium text-foreground/90">{title}</h3><p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{detail}</p></div><time className="pt-1 text-[8px] text-muted-foreground/70">{time}</time></div>;
}

function MemoryContent({ memory, onToggle }: { memory: boolean[]; onToggle: (index: number) => void }) {
  const entries = [
    ["沟通偏好", "喜欢简洁、直接的回答；复杂内容先给结论，再展开细节。"],
    ["日常安排", "工作日通常 9:30 开始工作，傍晚 18:00 后尽量不排会议。"],
    ["长期目标", "每周运动 3 次；偏好户外慢跑，不太喜欢高强度训练。"],
  ];
  return <div className="space-y-3">
    <GlassPanel intensity="subtle" className="divide-y divide-border/40 px-3">
      {entries.map(([title, text], index) => <div key={title} className="flex items-start gap-2.5 py-3 first:pt-3 last:pb-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/65 text-muted-foreground"><Lightbulb size={14} /></span><div className="min-w-0 flex-1"><h2 className="text-[10px] font-medium text-foreground">{title}</h2><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{memory[index] ? text : "这条记忆已关闭。"}</p><small className="mt-1.5 block text-[8px] text-muted-foreground/65">来自对话 · 9 月 {20 - index} 日</small></div><button aria-label={memory[index] ? `删除${title}记忆` : `恢复${title}记忆`} onClick={() => onToggle(index)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${memory[index] ? "text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-600" : "bg-emerald-500/10 text-emerald-700"}`}>{memory[index] ? <Trash2 size={13} /> : <Check size={14} />}</button></div>)}
    </GlassPanel>
    <div className="flex items-start gap-2 rounded-2xl border border-border/40 bg-card/45 p-3 text-[9px] leading-relaxed text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700/70" />你可以随时查看、删除这些记忆，也可以在对话里告诉 OpenMuse “忘掉这件事”。</div>
  </div>;
}

"use client";

import { Activity, ArrowRight, Check, Clock3, Lightbulb, Pause, Pencil, Play, Plus, ShieldCheck, Target, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import { AppPageShell } from "@/components/mobile/app-page-shell";
import { cloudBaseUrl } from "@/lib/cloud/config";

type Section = "goals" | "activity" | "memory";
type Goal = { id: string; title: string; description: string; nextAction: string | null; progress: number; status: string; dueAt: number | null };
type Memory = { id: string; content: string; category: string; sourceSessionId: string | null; createdAt: number };
type ActivityItem = { id: string; sessionId: string; sessionTitle: string; trigger: "chat" | "schedule"; status: string; errorCode: string | null; summary: string | null; createdAt: number; startedAt: number | null; completedAt: number | null };
type Schedule = { id: string; sessionId: string; title: string; prompt: string; cronExpression: string | null; timeZone: string; runAt: number | null; nextRunAt: number; status: "active" | "paused" | "completed" | "failed"; lastRunAt: number | null };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${cloudBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string } & T;
  if (!response.ok) throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`);
  return body;
}

export function MuseSectionPage({ section }: { section: Section }) {
  const title = section === "goals" ? "你的目标" : section === "activity" ? "活动" : "记忆";
  const subtitle = section === "goals"
    ? "把长期想做的事拆成小步，持续向前。"
    : section === "activity" ? "查看 OpenMuse 对话与定时任务的执行记录。"
      : "OpenMuse 记住的内容由你决定，可以随时查看和删除。";
  return <AppPageShell active={section} contentClassName="pb-28" innerClassName="max-w-lg">
    <header className="px-1 pb-5 pt-2">
      <div className="mb-1.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground"><SectionIcon section={section} />{section}</div>
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </header>
    {section === "goals" ? <GoalsContent /> : null}
    {section === "activity" ? <ActivityContent /> : null}
    {section === "memory" ? <MemoryContent /> : null}
  </AppPageShell>;
}

function SectionIcon({ section }: { section: Section }) {
  if (section === "goals") return <Target size={13} />;
  if (section === "activity") return <Activity size={13} />;
  return <Lightbulb size={13} />;
}

function GoalsContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setGoals((await api<{ goals: Goal[] }>("/api/v1/goals")).goals); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法加载目标。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const create = async () => {
    const title = window.prompt("你想持续推进什么目标？")?.trim();
    if (!title) return;
    try {
      const result = await api<{ goal: Goal }>("/api/v1/goals", { method: "POST", body: JSON.stringify({ title }) });
      setGoals((current) => [result.goal, ...current]); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法创建目标。"); }
  };
  const complete = async (goal: Goal) => {
    try {
      const result = await api<{ goal: Goal }>(`/api/v1/goals/${encodeURIComponent(goal.id)}`, { method: "PATCH", body: JSON.stringify({ status: "completed", progress: 100 }) });
      setGoals((current) => current.map((item) => item.id === goal.id ? result.goal : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法更新目标。"); }
  };

  return <div className="space-y-3">
    <div className="flex items-center justify-between px-1 pb-1 text-[10px] text-muted-foreground"><span>{goals.filter((goal) => goal.status === "active").length} 个进行中的目标</span><button className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[10px] font-medium text-background" onClick={() => void create()}><Plus size={14} />新建目标</button></div>
    {loading ? <GlassPanel intensity="subtle" className="p-4 text-[10px] text-muted-foreground">正在加载目标…</GlassPanel> : null}
    {error ? <p role="alert" className="px-1 text-[10px] text-red-600">{error}</p> : null}
    {!loading && goals.length === 0 ? <GlassPanel intensity="subtle" className="p-4 text-[10px] leading-relaxed text-muted-foreground">还没有目标。创建一个目标，OpenMuse 就能帮你持续跟进。</GlassPanel> : null}
    {goals.map((goal) => <GlassPanel key={goal.id} intensity="subtle" className="p-4">
      <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700"><Target size={17} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-[12px] font-semibold text-foreground">{goal.title}</h2><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{goal.description || (goal.status === "completed" ? "已完成" : "持续推进中")}</p></div><span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{goal.progress}%</span></div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-600/70" style={{ width: `${goal.progress}%` }} /></div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-2 text-[9.5px] text-muted-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-lg bg-background text-primary/70"><Check size={12} /></span><span className="min-w-0 flex-1 truncate">{goal.nextAction || (goal.dueAt ? `截止于 ${new Date(goal.dueAt).toLocaleDateString()}` : goal.status === "completed" ? "目标已完成" : "下一步还没有设置")}</span>{goal.status === "active" ? <button onClick={() => void complete(goal)} aria-label={`完成${goal.title}`} className="rounded-full p-1 hover:bg-background"><ArrowRight size={13} /></button> : null}</div>
    </GlassPanel>)}
  </div>;
}

function ActivityContent() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [activityBody, scheduleBody] = await Promise.all([
        api<{ activities: ActivityItem[] }>("/api/v1/activity"),
        api<{ schedules: Schedule[] }>("/api/v1/schedules"),
      ]);
      setActivities(activityBody.activities);
      setSchedules(scheduleBody.schedules);
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法加载活动记录。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const createSchedule = async () => {
    const title = window.prompt("定时任务名称：")?.trim();
    if (!title) return;
    const prompt = window.prompt("每次运行时要完成什么？")?.trim();
    if (!prompt) return;
    const cronExpression = window.prompt("Cron 时间规则（5 段），例如每天上午 9 点：0 9 * * *", "0 9 * * *")?.trim();
    if (!cronExpression) return;
    try {
      let sessions = (await api<{ sessions: Array<{ id: string }> }>("/api/v1/sessions")).sessions;
      if (!sessions.length) sessions = [(await api<{ session: { id: string } }>("/api/v1/sessions", { method: "POST", body: JSON.stringify({}) })).session];
      const result = await api<{ schedule: Schedule }>("/api/v1/schedules", {
        method: "POST",
        body: JSON.stringify({ sessionId: sessions[0]!.id, title, prompt, cronExpression, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      setSchedules((current) => [result.schedule, ...current]); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法创建定时任务。"); }
  };
  const setScheduleStatus = async (schedule: Schedule, status: "active" | "paused") => {
    try {
      await api(`/api/v1/schedules/${encodeURIComponent(schedule.id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, status } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法更新定时任务。"); }
  };
  const deleteSchedule = async (schedule: Schedule) => {
    try {
      await api(`/api/v1/schedules/${encodeURIComponent(schedule.id)}`, { method: "DELETE" });
      setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法删除定时任务。"); }
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-foreground"><span>定时任务</span><button onClick={() => void createSchedule()} className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[10px] font-medium text-background"><Plus size={14} />添加</button></div>
    {loading ? <GlassPanel intensity="subtle" className="p-4 text-[10px] text-muted-foreground">正在加载活动…</GlassPanel> : null}
    {error ? <p role="alert" className="px-1 text-[10px] text-red-600">{error}</p> : null}
    {!loading && schedules.length ? <GlassPanel intensity="subtle" className="divide-y divide-border/40 px-3">
      {schedules.map((schedule) => <div key={schedule.id} className="flex items-start gap-2.5 py-3 first:pt-3 last:pb-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Clock3 size={13} /></span><div className="min-w-0 flex-1"><h3 className="text-[10px] font-medium text-foreground/90">{schedule.title}</h3><p className="mt-0.5 text-[9px] text-muted-foreground">{schedule.status === "active" ? `下次运行：${new Date(schedule.nextRunAt).toLocaleString()}` : schedule.status === "paused" ? "已暂停" : schedule.status}</p><p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground/75">{schedule.prompt}</p></div>{schedule.status === "active" || schedule.status === "paused" ? <button aria-label={schedule.status === "active" ? "暂停任务" : "恢复任务"} onClick={() => void setScheduleStatus(schedule, schedule.status === "active" ? "paused" : "active")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-muted">{schedule.status === "active" ? <Pause size={13} /> : <Play size={13} />}</button> : null}<button aria-label="删除任务" onClick={() => void deleteSchedule(schedule)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><Trash2 size={13} /></button></div>)}
    </GlassPanel> : null}
    {!loading && !activities.length ? <GlassPanel intensity="subtle" className="p-4 text-[10px] leading-relaxed text-muted-foreground">完成对话或运行定时任务后，活动记录会显示在这里。</GlassPanel> : null}
    {!loading && activities.length ? <section><div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold text-foreground"><span>最近活动</span><span className="text-[9px] font-normal text-muted-foreground">{activities.length} 条</span></div><GlassPanel intensity="subtle" className="divide-y divide-border/40 px-3">
      {activities.map((item) => <TimelineItem key={item.id} icon={item.status === "completed" ? <Check size={13} /> : item.status === "running" ? <Activity size={13} /> : <Clock3 size={13} />} title={item.sessionTitle || (item.trigger === "schedule" ? "定时任务" : "对话")} detail={item.summary || activityLabel(item)} time={new Date(item.createdAt).toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} tone={item.status === "completed" ? "done" : item.status === "running" ? "working" : item.status === "failed" ? "failed" : "planned"} />)}
    </GlassPanel></section> : null}
  </div>;
}

function activityLabel(item: ActivityItem) {
  if (item.status === "running") return "正在执行…";
  if (item.status === "queued") return "等待执行";
  if (item.status === "failed") return "执行失败，可在对话中重试。";
  if (item.status === "cancelled") return "已停止";
  return item.trigger === "schedule" ? "定时任务已完成。" : "对话已完成。";
}

function TimelineItem({ icon, title, detail, time, tone }: { icon: ReactNode; title: string; detail: string; time: string; tone: string }) {
  return <div className="flex items-start gap-2.5 py-3 first:pt-3 last:pb-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone === "done" ? "bg-emerald-500/10 text-emerald-700" : tone === "working" ? "bg-sky-500/10 text-sky-700" : tone === "failed" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}>{icon}</span><div className="min-w-0 flex-1"><h3 className="text-[10px] font-medium text-foreground/90">{title}</h3><p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{detail}</p></div><time className="shrink-0 pt-1 text-[8px] text-muted-foreground/70">{time}</time></div>;
}

function MemoryContent() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setMemories((await api<{ memories: Memory[] }>("/api/v1/me/memories")).memories); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法加载记忆。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const create = async () => {
    const content = window.prompt("添加一条 OpenMuse 可以记住的内容：")?.trim();
    if (!content) return;
    try {
      const result = await api<{ memory: Memory }>("/api/v1/me/memories", { method: "POST", body: JSON.stringify({ content }) });
      setMemories((current) => [result.memory, ...current]); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法保存记忆。"); }
  };
  const remove = async (memory: Memory) => {
    try {
      await api(`/api/v1/me/memories/${encodeURIComponent(memory.id)}`, { method: "DELETE" });
      setMemories((current) => current.filter((item) => item.id !== memory.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法删除记忆。"); }
  };
  const edit = async (memory: Memory) => {
    const content = window.prompt("编辑这条记忆：", memory.content)?.trim();
    if (!content || content === memory.content) return;
    try {
      const result = await api<{ memory: Memory }>(`/api/v1/me/memories/${encodeURIComponent(memory.id)}`, { method: "PATCH", body: JSON.stringify({ content }) });
      setMemories((current) => current.map((item) => item.id === memory.id ? result.memory : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法更新记忆。"); }
  };
  return <div className="space-y-3">
    <div className="flex justify-end px-1"><button onClick={() => void create()} className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[10px] font-medium text-background"><Plus size={14} />添加记忆</button></div>
    {loading ? <GlassPanel intensity="subtle" className="p-4 text-[10px] text-muted-foreground">正在加载记忆…</GlassPanel> : null}
    {error ? <p role="alert" className="px-1 text-[10px] text-red-600">{error}</p> : null}
    {!loading && !memories.length ? <GlassPanel intensity="subtle" className="p-4 text-[10px] leading-relaxed text-muted-foreground">还没有长期记忆。你可以手动添加，也可以在对话中让 OpenMuse 记住重要背景。</GlassPanel> : null}
    {memories.length ? <GlassPanel intensity="subtle" className="divide-y divide-border/40 px-3">
      {memories.map((memory) => <div key={memory.id} className="flex items-start gap-2.5 py-3 first:pt-3 last:pb-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/65 text-muted-foreground"><Lightbulb size={14} /></span><div className="min-w-0 flex-1"><h2 className="text-[10px] font-medium text-foreground">{memory.category}</h2><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{memory.content}</p><small className="mt-1.5 block text-[8px] text-muted-foreground/65">{new Date(memory.createdAt).toLocaleDateString()}</small></div><button aria-label="编辑记忆" onClick={() => void edit(memory)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-muted"><Pencil size={13} /></button><button aria-label="删除记忆" onClick={() => void remove(memory)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-600"><Trash2 size={13} /></button></div>)}
    </GlassPanel> : null}
    <div className="flex items-start gap-2 rounded-2xl border border-border/40 bg-card/45 p-3 text-[9px] leading-relaxed text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700/70" />你可以随时查看、删除这些记忆，也可以在对话里告诉 OpenMuse“忘掉这件事”。</div>
  </div>;
}

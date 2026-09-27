"use client";

import { Bell, ChevronRight, History, Lock, LogOut, Palette, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BottomSheetModal } from "@/components/future-lens/ds/bottom-sheet-modal";
import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import { ModalDialog } from "@/components/future-lens/ds/modal-dialog";
import { PillButton } from "@/components/future-lens/ds/pill-button";
import { PRIVACY_URL, USER_AGREEMENT_URL } from "@/components/future-lens/ds/protocol-agreement";
import { Switch } from "@/components/future-lens/ds/switch";
import { AppPageShell } from "@/components/mobile/app-page-shell";
import { AccountProfileEditor } from "@/components/mobile/account-profile-editor";
import { ProfileRow } from "@/components/mobile/profile-row";
import { useAccountSummary } from "@/hooks/use-account-summary";
import { useCloudResource } from "@/hooks/use-cloud-resource";
import { authClient } from "@/lib/cloud/auth-client";
import { resolveAvatarUrl } from "@/lib/cloud/avatar";
import { DesignTokens } from "@/lib/future-lens/design-tokens";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";
import { openInAppBrowser } from "@/lib/native/open-in-app-browser";

type PointsTransaction = { id: string; type: string; amount: number; balanceAfter: number; description?: string | null; createdAt: string };
type PointsResponse = { transactions: PointsTransaction[] };
type PlanOffer = { id: string; channel: "apple" | "google_play" | "web" | null; purchaseMethod: "cash" | "points"; priceMinor: number | null; currency: string; pointsCost: number | null };
type Plan = { id: string; displayName: string; description: string | null; kind: "points" | "membership" | "agent_subscription"; pointsAmount: number | null; billingCycle: "monthly" | "quarterly" | "yearly" | "lifetime" | "custom" | null; durationDays: number | null; offers: PlanOffer[] };
type PlansResponse = { plans: Plan[] };

export function AccountView() {
  const router = useRouter();
  const { language, setLanguage, textScaleRaw, setTextScale, theme, setTheme } = useAppConfig();
  const isZh = language === "zh" || language === "zh-Hant";
  const t = translations[language];
  const account = useAccountSummary();
  const signedIn = account.status === "ready" && account.user;
  const [editOpen, setEditOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pointsFilter, setPointsFilter] = useState<"all" | "spend" | "earn">("all");
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const points = useCloudResource<PointsResponse>(pointsOpen ? "/api/v1/me/points?limit=50" : null);
  const plans = useCloudResource<PlansResponse>(rechargeOpen || subscriptionOpen ? "/api/v1/plans" : null);
  const activeEntitlement = account.entitlements.find((item) => item.status === "active");

  useEffect(() => {
    setNotifySystem(localStorage.getItem("app-notifications-push") !== "false");
    setNotifyEmail(localStorage.getItem("app-notifications-email") !== "false");
  }, []);
  const filteredTransactions = useMemo(() => (points.data?.transactions ?? []).filter((item) => pointsFilter === "all" || (pointsFilter === "spend" ? item.amount < 0 : item.amount >= 0)), [points.data, pointsFilter]);
  const creditPlans = useMemo(() => (plans.data?.plans ?? []).filter((item) => item.kind === "points"), [plans.data]);
  const subscriptionPlans = useMemo(() => (plans.data?.plans ?? []).filter((item) => item.kind !== "points"), [plans.data]);
  const requireAuth = (action: () => void) => signedIn ? action() : router.push("/auth?next=/account");
  const openSubModal = (setter: (value: boolean) => void) => { setSettingsOpen(false); setTimeout(() => setter(true), 100); };

  return (
    <AppPageShell active="account" contentClassName="overflow-hidden p-0" innerClassName="h-full max-w-lg px-3">
      <div className={`h-full overflow-y-auto pb-32 scrollbar-hide ${DesignTokens.mobile.safeTopWithSpacing}`}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 mb-5 group">
          <div className="relative flex-shrink-0">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => requireAuth(() => setEditOpen(true))} className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-0.5 ring-1 ring-border shadow-xl shadow-slate-300/40 dark:shadow-none group-hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] dark:shadow-none">{account.user?.image ? <img src={resolveAvatarUrl(account.user.image)} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center"><UserRound size={19} className="text-muted-foreground" /></div>}</div>
            </motion.button>
            {signedIn ? <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-md pointer-events-none"><div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" /></div> : null}
          </div>
          <div className="flex-1 min-w-0 pt-1.5"><button onClick={() => requireAuth(() => setEditOpen(true))} className="flex items-center gap-2 w-full text-left"><h2 className="font-semibold text-foreground truncate text-[14.5px]">{signedIn ? account.user?.name : t.not_signed_in}</h2><ChevronRight size={14} className="text-muted-foreground shrink-0" /></button><p className="mt-1 text-[11px] text-muted-foreground truncate">{signedIn ? account.user?.phoneNumber : t.not_signed_in_hint}</p></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.25 }}>
          <GlassPanel intensity="medium" className="rounded-2xl p-3.5 mb-2 transition-all duration-200 border border-white/10 dark:border-white/5 shadow-glass-soft">
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] text-muted-foreground">iPoints</p><p className="text-[20px] leading-tight font-semibold text-foreground tabular-nums">{account.points?.balance ?? 0}</p><p className="text-[10px] text-muted-foreground mt-0.5">{activeEntitlement?.displayName ?? t.subscription_value}</p></div><div className="flex items-center gap-1.5 shrink-0"><button type="button" onClick={() => requireAuth(() => setRechargeOpen(true))} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-200/80 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"><Sparkles size={12} className="shrink-0 opacity-90" strokeWidth={2} /><span className="whitespace-nowrap">{isZh ? "iPoints 充值" : "Top up iPoints"}</span></button><button type="button" onClick={() => requireAuth(() => setPointsOpen(true))} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-colors" aria-label={t.transactions}><History size={13} /></button></div></div>
          </GlassPanel>
        </motion.div>

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4 mb-2 px-1">{isZh ? "工具" : "Tools"}</h3>
        <GlassPanel intensity="medium" className="rounded-2xl p-1.5 mb-2 transition-all duration-200 hover:border-border/70 active:scale-[0.99]"><div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-xl">
          <ProfileRow inCard icon={<Sparkles size={16} />} label={t.subscription} sublabel={activeEntitlement?.displayName ?? t.subscription_value} onClick={() => requireAuth(() => setSubscriptionOpen(true))} />
          <ProfileRow inCard icon={<Palette size={16} />} label={t.personalization} onClick={() => setPersonalizationOpen(true)} />
          <ProfileRow inCard icon={<Settings size={16} />} label={isZh ? "设置" : "Settings"} onClick={() => setSettingsOpen(true)} />
        </div></GlassPanel>

        <AccountProfileEditor isOpen={editOpen} user={account.user} onClose={() => setEditOpen(false)} onSaved={account.refresh} />

        <ModalDialog isOpen={personalizationOpen} onClose={() => setPersonalizationOpen(false)} variant="action-sheet" title={t.personalization}><div className="flex flex-col gap-3 pt-2">
          <ChoiceSection title={t.language} values={["zh", "zh-Hant", "en"]} selected={language} labels={["简体中文", "繁體中文", "English"]} onSelect={(value) => setLanguage(value as "zh" | "zh-Hant" | "en")} />
          <ChoiceSection title={t.text_scale} values={["0.9", "1.05", "1.1"]} selected={String(textScaleRaw)} labels={[t.text_small, t.text_default, t.text_large]} onSelect={(value) => setTextScale(Number(value))} />
          <ChoiceSection title={t.theme} values={["light", "dark", "system"]} selected={theme} labels={[t.theme_light, t.theme_dark, t.theme_system]} onSelect={(value) => setTheme(value as "light" | "dark" | "system")} />
        </div></ModalDialog>

        <ModalDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} variant="action-sheet" title={isZh ? "设置" : "Settings"}><div className="flex flex-col gap-6 pt-2"><div className="space-y-3"><h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t.account_name}</h4><SettingsModalRow icon={<Bell size={16} />} label={t.notifications} onClick={() => openSubModal(setNotificationsOpen)} /><SettingsModalRow icon={<ShieldCheck size={16} />} label={t.privacy} onClick={() => openSubModal(setPrivacyOpen)} /></div><div className="space-y-3"><h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t.security}</h4><SettingsModalRow icon={<Lock size={16} />} label={t.security} onClick={() => openSubModal(setSecurityOpen)} /></div>{signedIn ? <button onClick={() => void authClient.signOut().then(() => account.refresh()).then(() => setSettingsOpen(false))} className="w-full p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium flex items-center justify-center gap-2 transition-colors mt-2"><LogOut size={16} />{t.logout}</button> : null}</div></ModalDialog>

        <ModalDialog isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} variant="action-sheet" title={t.notifications}><div className="flex flex-col gap-4 pt-2 pb-8 w-full"><ToggleRow icon={<Settings size={16} />} label={t.notification_push} checked={notifySystem} onChange={(value) => { setNotifySystem(value); localStorage.setItem("app-notifications-push", String(value)); }} /><ToggleRow icon={<Bell size={16} />} label={t.notification_email} checked={notifyEmail} onChange={(value) => { setNotifyEmail(value); localStorage.setItem("app-notifications-email", String(value)); }} /></div></ModalDialog>

        <ModalDialog isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} variant="action-sheet" title={t.privacy}><div className="flex flex-col gap-3 pt-2 pb-8"><SettingsModalRow icon={<ShieldCheck size={16} />} label={t.user_agreement} onClick={() => void openInAppBrowser(USER_AGREEMENT_URL)} /><SettingsModalRow icon={<Lock size={16} />} label={t.privacy_policy} onClick={() => void openInAppBrowser(PRIVACY_URL)} /></div></ModalDialog>

        <ModalDialog isOpen={securityOpen} onClose={() => setSecurityOpen(false)} variant="action-sheet" title={t.security}><div className="space-y-4 pt-2 pb-8"><p className="text-[13px] text-muted-foreground px-1">{t.security_hint}</p><PillButton variant="secondary" onClick={() => void authClient.revokeOtherSessions().then(() => setSecurityOpen(false))}>{t.revoke_sessions}</PillButton></div></ModalDialog>

        <ModalDialog isOpen={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} variant="action-sheet" title={t.subscription}><div className="space-y-3 pt-2 pb-8">{account.entitlements.length ? account.entitlements.map((item) => <div key={item.id} className="rounded-xl bg-secondary/30 border border-border/50 p-4"><div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{item.displayName ?? item.kind}</span><span className="text-[11px] text-emerald-500">{item.status}</span></div></div>) : <p className="py-4 text-center text-[13px] text-muted-foreground">{t.no_subscription}</p>}{plans.loading ? <p className="py-4 text-center text-[13px] text-muted-foreground">{t.loading}</p> : subscriptionPlans.map((item) => <PlanRow key={item.id} plan={item} isZh={isZh} />)}</div></ModalDialog>

        <ModalDialog isOpen={rechargeOpen} onClose={() => setRechargeOpen(false)} variant="action-sheet" title={isZh ? "iPoints 充值" : "Top up iPoints"}><div className="space-y-4 pt-2 pb-8"><div className="rounded-2xl bg-secondary/30 border border-border/50 p-4"><span className="text-[12px] text-muted-foreground">{t.points_balance}</span><div className="mt-1 text-[28px] font-semibold tabular-nums">{account.points?.balance ?? 0}</div></div>{plans.loading ? <p className="py-4 text-center text-[13px] text-muted-foreground">{t.loading}</p> : creditPlans.length ? <div className="space-y-2">{creditPlans.map((item) => <PlanRow key={item.id} plan={item} isZh={isZh} />)}</div> : <p className="py-4 text-center text-[13px] text-muted-foreground">{isZh ? "暂时没有可购买的积分套餐" : "No credit plans are available"}</p>}<p className="text-[12px] text-muted-foreground px-1">{isZh ? "实际购买由原生 iOS App Store 处理。" : "Purchases are completed through the native iOS App Store."}</p></div></ModalDialog>


        <BottomSheetModal isOpen={pointsOpen} onClose={() => setPointsOpen(false)} title={isZh ? "iPoints 流水" : "iPoints transactions"} showClose contentClassName="px-0 flex flex-col min-h-0"><div className="flex flex-col flex-1 min-h-0 overflow-hidden"><div className="px-4 py-3 border-b border-border/20 shrink-0"><div className="flex items-center gap-2">{(["all", "spend", "earn"] as const).map((id) => <button key={id} type="button" onClick={() => setPointsFilter(id)} className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors border ${pointsFilter === id ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary/20 text-muted-foreground border-border/40 hover:text-foreground"}`}>{id === "all" ? (isZh ? "全部" : "All") : id === "spend" ? (isZh ? "消耗" : "Spend") : (isZh ? "获得" : "Earn")}</button>)}</div></div><div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">{points.loading || !points.data ? <p className="text-[13px] text-muted-foreground py-6 text-center">{t.loading}</p> : filteredTransactions.length === 0 ? <p className="text-[13px] text-muted-foreground py-6 text-center">{t.no_transactions}</p> : <ul className="space-y-2 pb-2">{filteredTransactions.map((item) => <li key={item.id} className="rounded-xl border border-border/50 bg-secondary/20 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[13px] text-foreground font-medium truncate">{item.description || (isZh ? "iPoints 变动" : "iPoints change")}</span><span className={`text-[13px] font-semibold tabular-nums ${item.amount < 0 ? "text-rose-500" : "text-emerald-500"}`}>{item.amount < 0 ? "-" : "+"}{Math.abs(item.amount)}</span></div><div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground"><span>{new Date(item.createdAt).toLocaleString()}</span><span>{isZh ? "余额" : "Balance"}: {item.balanceAfter}</span></div></li>)}</ul>}</div></div></BottomSheetModal>
      </div>
    </AppPageShell>
  );
}

function PlanRow({ plan, isZh }: { plan: Plan; isZh: boolean }) {
  const cycle = plan.billingCycle === "monthly" ? (isZh ? "月付" : "Monthly") : plan.billingCycle === "quarterly" ? (isZh ? "季付" : "Quarterly") : plan.billingCycle === "yearly" ? (isZh ? "年付" : "Yearly") : plan.billingCycle === "lifetime" ? (isZh ? "买断" : "Lifetime") : plan.billingCycle === "custom" ? (isZh ? "自定义" : "Custom") : null;
  const pointsOffer = plan.offers.find((offer) => offer.purchaseMethod === "points");
  const hasCashPurchase = plan.offers.some((offer) => offer.purchaseMethod === "cash");
  return <div className="rounded-xl bg-secondary/30 border border-border/50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[13px] font-semibold">{plan.displayName}</div>{plan.description ? <div className="mt-1 text-[11px] text-muted-foreground">{plan.description}</div> : null}</div><div className="shrink-0 text-right"><div className="text-[13px] font-semibold tabular-nums">{plan.pointsAmount === null ? "—" : `${plan.pointsAmount} iPoints`}</div><div className="mt-1 text-[11px] text-muted-foreground">{pointsOffer ? `${pointsOffer.pointsCost} iPoints` : hasCashPurchase ? (isZh ? "现金购买" : "Cash purchase") : (isZh ? "暂未开放购买" : "Unavailable")}{cycle ? ` · ${cycle}` : ""}</div></div></div></div>;
}

function ChoiceSection({ title, values, selected, labels, onSelect }: { title: string; values: readonly string[]; selected: string; labels: readonly string[]; onSelect: (value: string) => void }) {
  return <div className="space-y-2"><h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{title}</h4><div className="grid grid-cols-3 gap-2">{values.map((value, index) => <button key={value} onClick={() => onSelect(value)} className={`p-2.5 rounded-xl border transition-all flex items-center justify-center text-[13px] ${selected === value ? "bg-primary/10 border-primary text-primary font-medium" : "bg-secondary/30 border-border/50 text-foreground hover:bg-secondary/50"}`}>{labels[index]}</button>)}</div></div>;
}

function SettingsModalRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors"><span className="flex items-center gap-3">{icon}<span className="text-[13px] font-medium">{label}</span></span><ChevronRight size={14} className="text-muted-foreground" /></button>;
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-foreground shadow-sm">{icon}</div><span className="text-[13px] font-medium">{label}</span></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

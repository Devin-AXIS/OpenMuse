"use client";

import { ImagePlus, Images } from "lucide-react";

import { CapsuleTabs } from "@/components/future-lens/ds/capsule-tabs";
import { FormInput } from "@/components/future-lens/ds/form-input";
import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import type { HtmlArtifactSelection } from "@/lib/chat/html-artifact-bridge";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

const COLORS = ["#111827", "#ffffff", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
const FONT_SCALES = [0.9, 1, 1.2];

type TextSelection = Extract<HtmlArtifactSelection, { kind: "text" }>;
type ImageSelection = Extract<HtmlArtifactSelection, { kind: "image" }>;

type Props = {
  selection: HtmlArtifactSelection | null;
  onTextChange: (next: Partial<TextSelection>) => void;
  onImageChange: (next: Partial<ImageSelection>) => void;
  onPickImage: (mode: "replace" | "insert") => void;
};

function ToolbarAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-border/40 bg-card/65 px-2.5 text-[11px] font-medium text-foreground shadow-sm transition-all active:scale-95 active:bg-muted/70">{icon}<span>{label}</span></button>;
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  return <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label={label}>{COLORS.map((color) => <button key={color} type="button" aria-label={`${label} ${color}`} onClick={() => onChange(color)} className={cn("h-7 w-7 shrink-0 rounded-full border border-border/70 p-1 shadow-sm transition-transform active:scale-90", value.toLowerCase() === color && "ring-2 ring-primary ring-offset-1 ring-offset-background")}><span className="block h-full w-full rounded-full" style={{ backgroundColor: color }} /></button>)}</div>;
}

export function HtmlArtifactToolbar({ selection, onTextChange, onImageChange, onPickImage }: Props) {
  const { language } = useAppConfig();
  const t = translations[language];

  if (!selection) return null;

  if (selection.kind === "image") return <GlassPanel intensity="high" className="pointer-events-auto mx-auto max-w-sm rounded-2xl p-2">
    <div className="flex items-center gap-1.5"><CapsuleTabs tabs={[t.artifact_image_contain, t.artifact_image_cover]} activeTab={selection.fit === "cover" ? 1 : 0} onTabChange={(index) => onImageChange({ fit: index ? "cover" : "contain" })} size="xs" className="mb-0 min-w-0 flex-1" /><ToolbarAction label={t.artifact_replace_image} icon={<Images size={14} />} onClick={() => onPickImage("replace")} /><ToolbarAction label={t.artifact_add_image} icon={<ImagePlus size={14} />} onClick={() => onPickImage("insert")} /></div>
  </GlassPanel>;

  const ratio = selection.fontSize / selection.originalFontSize;
  const sizeIndex = ratio < 0.96 ? 0 : ratio > 1.1 ? 2 : 1;
  return <GlassPanel intensity="high" className="pointer-events-auto mx-auto max-w-sm rounded-2xl p-2">
    <div className="flex items-center gap-1.5"><FormInput aria-label={t.artifact_text_content} value={selection.text} onChange={(event) => onTextChange({ text: event.target.value })} className="h-9 min-h-0 rounded-full py-1" /><ToolbarAction label={t.artifact_add_image} icon={<ImagePlus size={14} />} onClick={() => onPickImage("insert")} /></div>
    <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-2"><CapsuleTabs tabs={[t.text_small, t.text_default, t.text_large]} activeTab={sizeIndex} onTabChange={(index) => onTextChange({ fontSize: selection.originalFontSize * FONT_SCALES[index] })} size="xs" className="mb-0 w-32 shrink-0" /><ColorRow label={t.artifact_text_color} value={selection.color} onChange={(color) => onTextChange({ color })} /></div>
    {selection.role === "button" ? <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-2"><span className="shrink-0 px-1 text-[11px] text-muted-foreground">{t.artifact_button_color}</span><ColorRow label={t.artifact_button_color} value={selection.backgroundColor} onChange={(backgroundColor) => onTextChange({ backgroundColor })} /></div> : null}
  </GlassPanel>;
}

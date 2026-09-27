"use client";

import type { ChatEditableFile, ChatEditableFileWriteResult, ChatFileContent } from "@ipollowork/chat-client";
import { Braces, ChevronRight, Code2, Download, File, FileImage, FileText, Loader2, MonitorPlay, Presentation, Sheet, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button";
import type { ChatArtifact, ChatArtifactType } from "@/lib/chat/artifact-display";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

const LazyBottomSheetModal = lazy(() => import("@/components/future-lens/ds/bottom-sheet-modal").then((module) => ({ default: module.BottomSheetModal })));
const LazyChatMarkdown = lazy(() => import("./chat-markdown").then((module) => ({ default: module.ChatMarkdown })));
const LazyHtmlArtifactScreen = lazy(() => import("./html-artifact-screen").then((module) => ({ default: module.HtmlArtifactScreen })));

type ReadArtifact = (path: string) => Promise<ChatFileContent>;

function ArtifactIcon({ type, className }: { type: ChatArtifactType; className?: string }) {
  const props = { className: cn("h-4 w-4", className), strokeWidth: 1.8 };
  if (type === "html") return <MonitorPlay {...props} />;
  if (type === "code") return <Code2 {...props} />;
  if (type === "document") return <FileText {...props} />;
  if (type === "sheet") return <Sheet {...props} />;
  if (type === "slides") return <Presentation {...props} />;
  if (type === "image") return <FileImage {...props} />;
  if (type === "pdf") return <FileText {...props} />;
  return <File {...props} />;
}

function GeneratingEffect({ type }: { type: ChatArtifactType }) {
  if (type === "sheet") {
    return <span className="grid h-7 w-10 grid-cols-4 gap-0.5" aria-hidden>{Array.from({ length: 12 }, (_, index) => <i key={index} className="rounded-[1px] bg-primary/20 motion-safe:animate-pulse" style={{ animationDelay: `${index * 45}ms` }} />)}</span>;
  }
  if (type === "slides") {
    return <span className="relative h-7 w-10" aria-hidden><i className="absolute inset-x-1 top-0 h-5 rounded border border-primary/20 bg-primary/10 motion-safe:animate-pulse" /><i className="absolute inset-x-0 bottom-0 h-5 rounded border border-primary/30 bg-background/70" /></span>;
  }
  if (type === "code" || type === "html") {
    return <span className="flex h-7 w-10 flex-col justify-center gap-1" aria-hidden>{["w-8", "w-5", "w-7"].map((width, index) => <i key={width} className={cn("h-0.5 rounded-full bg-primary/45 motion-safe:animate-pulse", width)} style={{ animationDelay: `${index * 120}ms` }} />)}<i className="absolute h-3 w-px translate-x-9 bg-primary motion-safe:animate-pulse" /></span>;
  }
  if (type === "document") {
    return <span className="flex h-7 w-10 flex-col justify-center gap-1" aria-hidden><i className="h-0.5 w-9 rounded-full bg-primary/35 motion-safe:animate-pulse" /><i className="h-0.5 w-7 rounded-full bg-primary/25 motion-safe:animate-pulse [animation-delay:120ms]" /><i className="h-3 w-px translate-x-8 bg-primary motion-safe:animate-pulse" /></span>;
  }
  return <span className="flex h-7 w-10 items-center justify-center" aria-hidden><ArtifactIcon type={type} className="text-primary/70 motion-safe:animate-pulse" /></span>;
}

function binaryUrl(content: ChatFileContent): string | null {
  if (content.type !== "binary" || !content.content) return null;
  return `data:${content.mimeType || "application/octet-stream"};base64,${content.content}`;
}

function PreviewBody({ artifact, content }: { artifact: ChatArtifact; content: ChatFileContent }) {
  const { language } = useAppConfig();
  const t = translations[language];
  const url = binaryUrl(content);
  if (artifact.type === "image") {
    const source = url ?? (artifact.name.toLowerCase().endsWith(".svg") ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content.content)}` : null);
    return source ? <div className="flex min-h-full items-center justify-center p-4"><img src={source} alt={artifact.name} className="max-h-full max-w-full rounded-xl object-contain" /></div> : <p className="p-6 text-center text-[13px] text-muted-foreground">{t.artifact_binary_hint}</p>;
  }
  if (artifact.type === "pdf" && url) return <iframe title={artifact.name} src={url} className="h-full min-h-[70vh] w-full bg-white" />;
  if (content.type === "binary") return <p className="p-6 text-center text-[13px] text-muted-foreground">{t.artifact_binary_hint}</p>;
  if (artifact.type === "html") return <iframe title={artifact.name} srcDoc={content.content} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-full min-h-[75vh] w-full bg-white" />;
  if (artifact.type === "document" && /\.(?:md|markdown)$/iu.test(artifact.name)) {
    return <div className="p-4"><Suspense fallback={<pre className="whitespace-pre-wrap text-[13px] leading-relaxed">{content.content}</pre>}><LazyChatMarkdown content={content.content} bodyFontSize={13} /></Suspense></div>;
  }
  return <pre className="min-h-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-foreground">{content.content}</pre>;
}

export function ChatArtifactCard({ artifact, readArtifact, downloadArtifact, readEditableArtifact, writeEditableArtifact }: { artifact: ChatArtifact; readArtifact: ReadArtifact; downloadArtifact: (path: string) => Promise<void>; readEditableArtifact: (path: string) => Promise<ChatEditableFile>; writeEditableArtifact: (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => Promise<ChatEditableFileWriteResult> }) {
  const { language } = useAppConfig();
  const t = translations[language];
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<ChatFileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [version, setVersion] = useState(artifact.version);
  useEffect(() => setVersion((current) => Math.max(current, artifact.version)), [artifact.version]);
  const generating = artifact.status !== "completed";
  const typeLabel = {
    html: t.artifact_html, code: t.artifact_code, document: t.artifact_document, sheet: t.artifact_sheet,
    slides: t.artifact_slides, image: t.artifact_image, pdf: t.artifact_pdf, file: t.artifact_file,
  }[artifact.type];

  const showPreview = async () => {
    if (generating) return;
    setOpen(true);
    if (artifact.type === "html") return;
    if (content || loading) return;
    setLoading(true);
    setError(false);
    try {
      setContent(await readArtifact(artifact.path));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      await downloadArtifact(artifact.path);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <GlassPanel intensity="subtle" className="my-1 rounded-2xl">
        <button type="button" disabled={generating} onClick={() => void showPreview()} className="flex min-h-[72px] w-full items-center gap-3 px-3 py-2.5 text-left disabled:cursor-default">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/50 text-primary"><ArtifactIcon type={artifact.type} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-foreground">{artifact.name}</span><span className="shrink-0 rounded-full border border-border/50 bg-background/45 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">v{version}</span></span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>{typeLabel}</span><span aria-hidden>·</span><span>{generating ? t.artifact_generating : t.artifact_ready}</span>{generating ? <Loader2 className="h-3 w-3 animate-spin text-primary/70" /> : null}</span>
          </span>
          {generating ? <GeneratingEffect type={artifact.type} /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" strokeWidth={1.75} />}
        </button>
      </GlassPanel>
      {open && artifact.type === "html" ? <Suspense fallback={null}><LazyHtmlArtifactScreen artifact={artifact} version={version} onClose={() => setOpen(false)} onVersion={(nextVersion) => setVersion((current) => Math.max(current, nextVersion))} readFile={readEditableArtifact} writeFile={writeEditableArtifact} downloadFile={downloadArtifact} /></Suspense> : null}
      {open && artifact.type !== "html" ? (
        <Suspense fallback={null}>
          <LazyBottomSheetModal isOpen={open} onClose={() => setOpen(false)} title={`${artifact.name} · v${version}`} contentClassName="bg-background/15" headerRight={<div className="flex items-center gap-1.5"><HeaderIconButton disabled={downloading} ariaLabel={t.artifact_download} title={t.artifact_download} onClick={() => void download()}>{downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={2} />}</HeaderIconButton><HeaderIconButton ariaLabel={t.close} onClick={() => setOpen(false)}><X size={16} /></HeaderIconButton></div>}>
            {loading ? <div className="flex h-full min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : null}
            {error ? <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center"><Braces className="h-6 w-6 text-muted-foreground" /><p className="text-[13px] text-muted-foreground">{t.artifact_load_failed}</p></div> : null}
            {content ? <PreviewBody artifact={artifact} content={content} /> : null}
            {downloadError ? <p className="p-3 text-center text-[11px] text-destructive">{t.artifact_download_failed}</p> : null}
          </LazyBottomSheetModal>
        </Suspense>
      ) : null}
    </>
  );
}

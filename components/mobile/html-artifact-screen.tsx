"use client";

import { ChatFileError, type ChatEditableFile, type ChatEditableFileWriteResult } from "@ipollowork/chat-client";
import { ArrowLeft, Download, Loader2, Pencil, Undo2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button";
import { ModalDialog } from "@/components/future-lens/ds/modal-dialog";
import { HtmlArtifactToolbar } from "@/components/mobile/html-artifact-toolbar";
import { prepareArtifactImage } from "@/lib/chat/artifact-image";
import { editableHtml, isHtmlArtifactBridgeMessage, type HtmlArtifactSelection } from "@/lib/chat/html-artifact-bridge";
import type { ChatArtifact } from "@/lib/chat/artifact-display";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

type Props = {
  artifact: ChatArtifact;
  version: number;
  onClose: () => void;
  onVersion: (version: number) => void;
  readFile: (path: string) => Promise<ChatEditableFile>;
  writeFile: (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => Promise<ChatEditableFileWriteResult>;
  downloadFile: (path: string) => Promise<void>;
};

export function HtmlArtifactScreen({ artifact, version, onClose, onVersion, readFile, writeFile, downloadFile }: Props) {
  const { language } = useAppConfig();
  const t = translations[language];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageActionRef = useRef<"replace" | "insert">("insert");
  const serializeRef = useRef<{ id: string; resolve: (html: string) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const automaticRetriesRef = useRef(0);
  const [channel] = useState(() => crypto.randomUUID());
  const [snapshot, setSnapshot] = useState<ChatEditableFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<HtmlArtifactSelection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void readFile(artifact.path).then((file) => { if (active) { setSnapshot(file); if (file.version && file.version > 0) onVersion(file.version); } }).catch((cause) => {
      if (!active) return;
      if (cause instanceof ChatFileError && cause.status === 401) setError(t.chat_reconnecting);
      else if (cause instanceof ChatFileError && cause.status === 403) setError(t.permission_title);
      else setError(t.artifact_load_failed);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [artifact.path, onVersion, readFile, t.artifact_load_failed, t.chat_reconnecting, t.permission_title]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (!error || snapshot || automaticRetriesRef.current >= 2) return;
    automaticRetriesRef.current += 1;
    const timer = setTimeout(() => load(), 1_200);
    return () => clearTimeout(timer);
  }, [error, load, snapshot]);

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({ channel, ...message }, "*");
  }, [channel]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !isHtmlArtifactBridgeMessage(event.data, channel)) return;
      if (event.data.type === "ipw-selection") setSelection(event.data.selection);
      if (event.data.type === "ipw-cleared") setSelection(null);
      if (event.data.type === "ipw-ready") post({ type: "ipw-mode", enabled: editing });
      if (event.data.type === "ipw-serialized" && serializeRef.current?.id === event.data.requestId) {
        const pending = serializeRef.current;
        serializeRef.current = null;
        clearTimeout(pending.timer);
        pending.resolve(event.data.html);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [channel, editing, post]);

  useEffect(() => {
    post({ type: "ipw-mode", enabled: editing });
    if (!editing) setSelection(null);
  }, [editing, post]);

  useEffect(() => () => {
    if (serializeRef.current) clearTimeout(serializeRef.current.timer);
  }, []);

  const preview = useMemo(() => snapshot ? editableHtml(snapshot.content, channel) : "", [channel, snapshot]);

  const changeText = (next: Partial<Extract<HtmlArtifactSelection, { kind: "text" }>>) => {
    if (selection?.kind !== "text") return;
    const updated = { ...selection, ...next };
    setSelection(updated);
    setDirty(true);
    post({ type: "ipw-change", ...updated });
  };

  const changeImage = (next: Partial<Extract<HtmlArtifactSelection, { kind: "image" }>>) => {
    if (selection?.kind !== "image") return;
    const updated = { ...selection, ...next };
    setSelection(updated);
    setDirty(true);
    post({ type: "ipw-change", ...updated });
  };

  const pickImage = (mode: "replace" | "insert") => {
    imageActionRef.current = mode;
    imageInputRef.current?.click();
  };

  const applyImage = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const src = await prepareArtifactImage(file);
      setDirty(true);
      if (imageActionRef.current === "replace" && selection?.kind === "image") changeImage({ src });
      else post({ type: "ipw-insert-image", src });
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "ARTIFACT_IMAGE_TOO_LARGE" ? t.artifact_image_too_large : t.artifact_image_invalid);
    }
  };

  const serialize = () => new Promise<string>((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { serializeRef.current = null; reject(new Error("SERIALIZE_TIMEOUT")); }, 3_000);
    serializeRef.current = { id, resolve, timer };
    post({ type: "ipw-serialize", requestId: id });
  });

  const publish = async () => {
    if (!snapshot || saving) return;
    if (!dirty) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      const html = await serialize();
      const result = await writeFile({ path: snapshot.path, content: html, baseUpdatedAt: snapshot.updatedAt, baseRevision: snapshot.revision });
      setSnapshot({ ...result, content: html, writable: snapshot.writable });
      setDirty(false);
      setEditing(false);
      setSelection(null);
      if (result.version && result.version > 0) onVersion(result.version);
    } catch (cause) {
      setError(cause instanceof ChatFileError && cause.status === 409 ? t.artifact_edit_conflict : t.artifact_edit_failed);
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadFile(artifact.path);
    } catch {
      setError(t.artifact_download_failed);
    } finally {
      setDownloading(false);
    }
  };

  const undo = () => {
    if (!dirty) return;
    setDirty(false);
    setSelection(null);
    setError(null);
    setRenderKey((value) => value + 1);
  };

  const back = () => {
    if (!editing) { onClose(); return; }
    setEditing(false);
    setSelection(null);
    setDirty(false);
    setError(null);
    setRenderKey((value) => value + 1);
  };

  return (
    <ModalDialog isOpen onClose={back} variant="chat-fullscreen" level="OVERLAY">
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="relative z-20 shrink-0 border-b border-border/35 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex min-h-[52px] items-center justify-between gap-2 px-3">
            <HeaderIconButton variant="back" ariaLabel={t.back} onClick={back}><ArrowLeft size={17} strokeWidth={2} /></HeaderIconButton>
            <div className="min-w-0 flex-1 text-center"><h1 className="truncate text-[14.5px] font-semibold tracking-tight text-foreground">{artifact.name}</h1><p className="text-[10px] text-muted-foreground">v{version}{editing ? ` · ${t.artifact_edit}` : ""}</p></div>
            {editing ? <div className="flex items-center gap-1.5"><HeaderIconButton disabled={!dirty || saving} ariaLabel={t.artifact_undo} title={t.artifact_undo} onClick={undo}><Undo2 size={16} strokeWidth={2} /></HeaderIconButton><HeaderIconButton active ariaLabel={saving ? t.artifact_saving : t.artifact_save} title={saving ? t.artifact_saving : t.artifact_save} disabled={!dirty || saving} onClick={() => void publish()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} strokeWidth={2} />}</HeaderIconButton></div> : <div className="flex items-center gap-1.5"><HeaderIconButton disabled={!snapshot || downloading} ariaLabel={t.artifact_download} title={t.artifact_download} onClick={() => void download()}>{downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={2} />}</HeaderIconButton>{snapshot?.writable ? <HeaderIconButton ariaLabel={t.artifact_edit} title={t.artifact_edit} onClick={() => { setEditing(true); setError(null); }}><Pencil size={16} strokeWidth={2} /></HeaderIconButton> : null}</div>}
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
          {loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : null}
          {!loading && snapshot ? <iframe key={`${snapshot.updatedAt}:${renderKey}`} ref={iframeRef} title={artifact.name} srcDoc={preview} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-full w-full border-0 bg-white" /> : null}
          {!loading && !snapshot ? <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-[13px] text-muted-foreground">{error || t.artifact_load_failed}</p><button type="button" onClick={() => load()} className="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-[12px] font-medium text-foreground shadow-glass backdrop-blur-xl active:scale-95">{t.retry}</button></div> : null}

          <input id="html-artifact-image-input" ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { void applyImage(event.target.files?.[0]); event.target.value = ""; }} />
          {editing ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><HtmlArtifactToolbar selection={selection} onTextChange={changeText} onImageChange={changeImage} onPickImage={pickImage} />{error ? <p className="mx-auto mt-1 max-w-sm text-center text-[11px] text-destructive">{error}</p> : null}</div> : null}
        </div>
      </div>
    </ModalDialog>
  );
}

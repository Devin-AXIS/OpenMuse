"use client";

import type { ChatInput } from "@ipollowork/chat-client";
import { ArrowUp, Camera, FileText, ImageIcon, Loader2, Plus, Square, X } from "lucide-react";
import { motion } from "framer-motion";
import { memo, useLayoutEffect, useRef, useState } from "react";

import { ModalDialog } from "@/components/future-lens/ds/modal-dialog";
import { translations } from "@/lib/future-lens/i18n";
import { useAppConfig } from "@/lib/future-lens/config-context";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

type ComposerFile = NonNullable<ChatInput["files"]>[number] & { localId: string };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("FILE_READ_FAILED"));
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export const ChatComposer = memo(function ChatComposer({ busy, onSend, onStop }: {
  busy: boolean;
  onSend: (input: ChatInput) => Promise<boolean> | boolean;
  onStop: () => Promise<unknown> | void;
}) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { language } = useAppConfig();
  const t = translations[language];

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 22), 109)}px`;
  }, [message]);

  const addFile = async (file?: File) => {
    if (!file || readingFile) return;
    setShowAttachments(false);
    setFileError(null);
    if (files.length >= MAX_ATTACHMENTS) { setFileError(t.attachment_limit); return; }
    if (file.size > MAX_ATTACHMENT_BYTES) { setFileError(t.attachment_too_large); return; }
    setReadingFile(true);
    try {
      const url = await readAsDataUrl(file);
      setFiles((current) => [...current, { localId: crypto.randomUUID(), mime: file.type || "application/octet-stream", filename: file.name, url }]);
    } catch {
      setFileError(t.error_generic);
    } finally {
      setReadingFile(false);
    }
  };

  const submit = async () => {
    const text = message.trim();
    if ((!text && !files.length) || busy || readingFile) return;
    const sent = await onSend({ text, files: files.map(({ localId: _, ...file }) => file) });
    if (!sent) return;
    setMessage("");
    setFiles([]);
    setFileError(null);
  };
  return (
    <>
      <input ref={imageInputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { void addFile(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { void addFile(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={fileInputRef} className="sr-only" type="file" onChange={(event) => { void addFile(event.target.files?.[0]); event.target.value = ""; }} />
      <div>
        {fileError ? <p className="mb-1 px-12 text-[11px] text-destructive">{fileError}</p> : null}
        <div className="flex w-full items-end gap-2">
          <motion.button whileTap={{ scale: 0.9 }} type="button" disabled={busy || readingFile} onClick={() => setShowAttachments(true)} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-foreground shadow-glass backdrop-blur-xl transition-colors hover:bg-card/90 disabled:opacity-50" aria-label={t.attach_file}>
            {readingFile ? <Loader2 size={19} className="animate-spin" /> : <Plus size={20} strokeWidth={2} />}
          </motion.button>
          <div className="min-h-[44px] flex-1 rounded-[22px] border border-border/50 bg-card/80 shadow-glass backdrop-blur-xl transition-all duration-300">
            {files.length ? (
              <div className="flex gap-2 overflow-x-auto px-2.5 pt-1.5">
                {files.map((file) => (
                  <div key={file.localId} className="flex max-w-[130px] shrink-0 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/50 px-2 py-1.5">
                    <FileText size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate text-[11px] text-foreground">{file.filename || t.file}</span>
                    <button type="button" onClick={() => setFiles((current) => current.filter((item) => item.localId !== file.localId))} aria-label={t.close}><X size={13} /></button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex min-h-[42px] items-end gap-2 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder={t.chat_placeholder}
                rows={1}
                className="max-h-[109px] min-h-[22px] w-full flex-1 resize-none overflow-y-auto bg-transparent py-0.5 text-[15px] leading-[1.5] text-foreground caret-blue-500 placeholder:text-muted-foreground/60 focus:outline-none"
              />
              {busy ? (
                <button type="button" onClick={() => void onStop()} className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full" aria-label={t.chat_stop}>
                  <Loader2 className="absolute h-[28px] w-[28px] animate-spin text-primary/55" strokeWidth={1.75} />
                  <span className="relative z-[1] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-foreground text-background shadow-sm"><Square size={10} strokeWidth={2.5} className="fill-current" /></span>
                </button>
              ) : message.trim() || files.length ? (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }} onClick={() => void submit()} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground text-background" aria-label={t.chat_send}>
                  <ArrowUp size={18} strokeWidth={3} />
                </motion.button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <ModalDialog isOpen={showAttachments} onClose={() => setShowAttachments(false)} variant="action-sheet" level="OVERLAY">
        <div className="flex flex-col gap-5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-medium text-foreground">{t.source}</h3>
            <button type="button" onClick={() => setShowAttachments(false)} aria-label={t.close} className="rounded-full bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-secondary"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 px-1">
            <AttachmentButton icon={<ImageIcon size={20} strokeWidth={1.5} />} label={t.image} onClick={() => { setShowAttachments(false); imageInputRef.current?.click(); }} />
            <AttachmentButton icon={<Camera size={20} strokeWidth={1.5} />} label={t.camera} onClick={() => { setShowAttachments(false); cameraInputRef.current?.click(); }} />
            <AttachmentButton icon={<FileText size={20} strokeWidth={1.5} />} label={t.file} onClick={() => { setShowAttachments(false); fileInputRef.current?.click(); }} />
          </div>
        </div>
      </ModalDialog>
    </>
  );
});

function AttachmentButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border/50 bg-muted text-muted-foreground transition-colors group-hover:bg-secondary">{icon}</div>
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

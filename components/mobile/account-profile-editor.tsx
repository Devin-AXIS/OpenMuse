"use client";

import { Camera, User } from "lucide-react";
import { useEffect, useState } from "react";

import { ModalDialog } from "@/components/future-lens/ds/modal-dialog";
import { PillButton } from "@/components/future-lens/ds/pill-button";
import { TextInput } from "@/components/future-lens/ds/text-input";
import type { AccountUser } from "@/hooks/use-account-summary";
import { prepareAvatar, resolveAvatarUrl } from "@/lib/cloud/avatar";
import { cloudRequest } from "@/lib/cloud/request";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

export function AccountProfileEditor({ isOpen, user, onClose, onSaved }: { isOpen: boolean; user: AccountUser | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { language } = useAppConfig();
  const t = translations[language];
  const isZh = language === "zh" || language === "zh-Hant";
  const [name, setName] = useState("");
  const [preview, setPreview] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [preparingAvatar, setPreparingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(user?.name ?? "");
    setPreview(resolveAvatarUrl(user?.image));
    setAvatarBlob(null);
    setError(null);
  }, [isOpen, user?.image, user?.name]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const selectAvatar = async (file?: File) => {
    if (!file) return;
    setPreparingAvatar(true); setError(null);
    try {
      const blob = await prepareAvatar(file);
      setAvatarBlob(blob);
      setPreview(URL.createObjectURL(blob));
    } catch { setError(isZh ? "请选择 5MB 以内的有效图片" : "Choose a valid image under 5 MB"); }
    finally { setPreparingAvatar(false); }
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      if (avatarBlob) await cloudRequest("/api/v1/me/avatar", { method: "POST", body: avatarBlob, headers: { "Content-Type": avatarBlob.type } });
      await cloudRequest("/api/v1/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      await onSaved();
      onClose();
    } catch { setError(t.save_failed); }
    finally { setSaving(false); }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={() => { if (!saving) onClose(); }} variant="action-sheet">
      <div className="flex flex-col items-center gap-6 pt-4 px-1">
        <input type="file" accept="image/*" className="hidden" id="account-avatar-upload" disabled={preparingAvatar || saving} onChange={(event) => { void selectAvatar(event.target.files?.[0]); event.target.value = ""; }} />
        <label htmlFor="account-avatar-upload" className={`relative block group ${preparingAvatar || saving ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-1 ring-2 ring-border shadow-xl">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">{preparingAvatar ? <div className="text-sm text-muted-foreground">{isZh ? "处理中..." : "Processing..."}</div> : preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="text-4xl">👾</div>}</div>
          </div>
          <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg pointer-events-none"><Camera size={14} /></div>
        </label>
        <div className="w-full space-y-4">
          <TextInput label={t.name} placeholder={isZh ? "请输入姓名" : "Enter your name"} leftIcon={<User size={16} />} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          {error ? <p role="alert" className="text-[11px] text-destructive px-1">{error}</p> : null}
          <div className="pt-2 flex gap-3"><PillButton variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>{t.close}</PillButton><PillButton variant="primary" className="flex-1" onClick={() => void save()} disabled={saving || preparingAvatar || !name.trim()}>{saving ? (isZh ? "保存中..." : "Saving...") : t.save}</PillButton></div>
        </div>
      </div>
    </ModalDialog>
  );
}

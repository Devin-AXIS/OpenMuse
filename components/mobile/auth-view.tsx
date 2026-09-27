"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AppBackground } from "@/components/future-lens/ds/app-background";
import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import { MobileInput } from "@/components/future-lens/ds/mobile-input";
import { PillButton } from "@/components/future-lens/ds/pill-button";
import { ProtocolAgreement } from "@/components/future-lens/ds/protocol-agreement";
import { VerifyCodeInput } from "@/components/future-lens/ds/verify-code-input";
import { authClient } from "@/lib/cloud/auth-client";
import { normalizePhoneNumber } from "@/lib/cloud/phone-number";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

export function AuthView() {
  const searchParams = useSearchParams();
  const { language } = useAppConfig();
  const t = translations[language];
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+86");
  const [code, setCode] = useState(process.env.NEXT_PUBLIC_AUTH_TEST_PHONE_OTP ?? "");
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeUserAgreement, setAgreeUserAgreement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    if (!agreePrivacy || !agreeUserAgreement) { setError(t.agreement_required); return; }
    const normalizedPhone = normalizePhoneNumber(phone, countryCode);
    if (!normalizedPhone) { setError(t.phone_invalid); return; }
    setBusy(true); setError(null); setNotice(null);
    const result = await authClient.phoneNumber.sendOtp({ phoneNumber: normalizedPhone });
    setBusy(false);
    if (result.error) { setError(t.code_send_failed); return; }
    setStep("code"); setNotice(process.env.NEXT_PUBLIC_AUTH_TEST_PHONE_OTP ? t.test_code_hint : t.code_sent);
  };

  const verify = async () => {
    const normalizedPhone = normalizePhoneNumber(phone, countryCode);
    if (!normalizedPhone) { setError(t.phone_invalid); return; }
    setBusy(true); setError(null);
    const result = await authClient.phoneNumber.verify({ phoneNumber: normalizedPhone, code });
    setBusy(false);
    if (result.error) { setError(t.code_invalid); return; }
    const requested = searchParams.get("next");
    window.location.replace(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/");
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-background text-foreground">
      <AppBackground />
      <div className="relative z-10 flex h-full overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="m-auto w-full max-w-sm">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-foreground text-background shadow-[0_10px_30px_-12px_rgba(15,23,42,.5)]"><Sparkles size={24} /></div>
            <h1 className="text-[22px] font-bold tracking-tight">{t.auth_title}</h1>
            <p className="mt-1.5 text-[12px] text-muted-foreground">{t.auth_subtitle}</p>
          </div>
          <GlassPanel intensity="high" className="space-y-4 p-4">
            <MobileInput label={t.phone} countryCode={countryCode} onCountryCodeChange={setCountryCode} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/gu, ""))} placeholder={t.phone_placeholder} autoComplete="tel" disabled={step === "code"} className={step === "code" ? "pointer-events-none opacity-70" : undefined} autoFocus />
            {step === "code" ? <VerifyCodeInput label={t.verification_code} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} onSendCode={() => void sendCode()} /> : null}
            {step === "phone" ? <ProtocolAgreement agreePrivacy={agreePrivacy} agreeUserAgreement={agreeUserAgreement} onAgreePrivacyChange={setAgreePrivacy} onAgreeUserAgreementChange={setAgreeUserAgreement} language={language} className="px-0" /> : null}
            {notice ? <p role="status" className="rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">{notice}</p> : null}
            {error ? <p role="alert" className="rounded-xl bg-destructive/8 px-3 py-2 text-[11px] text-destructive">{error}</p> : null}
            <PillButton disabled={busy || !normalizePhoneNumber(phone, countryCode) || (step === "code" && code.length !== 6)} onClick={() => void (step === "phone" ? sendCode() : verify())} icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}>{busy ? t.auth_busy : step === "phone" ? t.send_code : t.sign_in}</PillButton>
            {step === "code" ? <button type="button" onClick={() => { setStep("phone"); setCode(process.env.NEXT_PUBLIC_AUTH_TEST_PHONE_OTP ?? ""); setNotice(null); setError(null); }} className="w-full py-1 text-center text-[11px] font-medium text-muted-foreground">{t.change_phone}</button> : null}
          </GlassPanel>
        </div>
      </div>
    </main>
  );
}

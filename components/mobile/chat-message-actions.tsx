"use client";

import { Check, Copy, Play, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useEffect, useState } from "react";

import type { Language } from "@/lib/future-lens/i18n";
import { translations } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

const ACTION_CLASS = "p-1 rounded hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-40 [&_svg]:shrink-0";

export const ChatMessageActions = memo(function ChatMessageActions({ text, language }: { text: string; language: Language }) {
  const t = translations[language];
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSpeechSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);

  async function copyText() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function toggleSpeech() {
    if (!speechSupported || !text) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : language === "zh-Hant" ? "zh-TW" : "zh-CN";
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="mt-1 flex items-center gap-0.5 text-muted-foreground/80">
      <button type="button" onClick={() => void copyText()} disabled={!text} className={ACTION_CLASS} aria-label={t.action_copy} title={t.action_copy}>
        {copied ? <Check className="h-[13px] w-[13px] text-primary" strokeWidth={1.5} /> : <Copy className="h-[13px] w-[13px]" strokeWidth={1.25} />}
      </button>
      {speechSupported ? (
        <button type="button" onClick={toggleSpeech} disabled={!text} className={cn(ACTION_CLASS, playing && "text-primary")} aria-label={t.chat_message_play} title={t.chat_message_play}>
          {playing ? <Square className="h-[13px] w-[13px] fill-current" strokeWidth={1.25} /> : <Play className="h-[13px] w-[13px]" strokeWidth={1.25} />}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => { setLiked((value) => !value); if (disliked) setDisliked(false); }}
        className={cn(ACTION_CLASS, liked && "text-primary")}
        aria-label={t.chat_message_like}
        title={t.chat_message_like}
      >
        <ThumbsUp className={cn("h-[13px] w-[13px]", liked && "fill-current")} strokeWidth={1.25} />
      </button>
      <button
        type="button"
        onClick={() => { setDisliked((value) => !value); if (liked) setLiked(false); }}
        className={cn(ACTION_CLASS, disliked && "text-primary")}
        aria-label={t.share_dislike}
        title={t.share_dislike}
      >
        <ThumbsDown className={cn("h-[13px] w-[13px]", disliked && "fill-current")} strokeWidth={1.25} />
      </button>
    </div>
  );
});

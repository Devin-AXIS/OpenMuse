"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { useAppConfig } from "@/lib/future-lens/config-context";
import { DesignTokens } from "@/lib/future-lens/design-tokens";
import { openInAppBrowser } from "@/lib/native/open-in-app-browser";
import { cn } from "@/lib/utils";

export function hasChatMarkdown(value: string) {
  return /(^|\n)#{1,6}\s|(^|\n)\s*(?:[-*+]\s|\d+\.\s|>\s|```)|\[[^\]]+\]\([^\)]+\)|\*\*[^*]+\*\*|`[^`]+`|\|.+\|/m.test(value);
}

/** Direct, safe subset of AINO's unified Markdown renderer for chat text only. */
export function ChatMarkdown({ content, bodyFontSize = DesignTokens.fontScale.bodyContent * 1.13 }: { content: string; bodyFontSize?: number }) {
  const { textScale } = useAppConfig();
  const contentBase = bodyFontSize <= 14 ? bodyFontSize * 0.9 : bodyFontSize;
  const contentPx = contentBase * textScale;
  return (
    <div className="min-w-0 overflow-hidden leading-relaxed text-foreground" style={{ fontSize: `${contentPx}px` }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-foreground">{children}</p>,
          h1: ({ children }) => <h1 className="font-bold mb-2 mt-4 first:mt-0 text-foreground leading-tight" style={{ fontSize: `${contentPx * 1.2}px` }}>{children}</h1>,
          h2: ({ children }) => <h2 className="font-semibold mb-1.5 mt-3 first:mt-0 text-foreground leading-tight" style={{ fontSize: `${contentPx * 1.08}px` }}>{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold mb-1.5 mt-2.5 first:mt-0 text-foreground leading-tight" style={{ fontSize: `${contentPx}px` }}>{children}</h3>,
          ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed text-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className, children, ...props }) => {
            const code = String(children).replace(/\n$/u, "");
            if (className?.startsWith("language-")) return <code className={className} {...props}>{children}</code>;
            return <code className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[0.95em] font-mono text-foreground" {...props}>{code}</code>;
          },
          pre: ({ children }) => <pre className="my-3 max-h-[min(72vh,36rem)] overflow-auto rounded-xl border border-border/70 bg-muted/45 p-3 leading-relaxed" style={{ fontSize: `${12 * textScale * 0.9}px` }}>{children}</pre>,
          blockquote: ({ children }) => <blockquote className="backdrop-blur-xl bg-white/20 dark:bg-zinc-800/30 border-l-4 border-primary/40 rounded-r-md p-4 my-3 text-foreground italic">{children}</blockquote>,
          a: ({ href, children, ...props }) => <a href={href} onClick={(event) => { if (href && /^https?:\/\//iu.test(href)) { event.preventDefault(); void openInAppBrowser(href); } }} rel="noopener noreferrer" className="text-primary hover:underline break-all" {...props}>{children}</a>,
          table: ({ children }) => <div className="my-3 -mx-3 px-3 overflow-x-auto scrollbar-hide rounded-lg overflow-hidden backdrop-blur-xl bg-white/20 dark:bg-zinc-800/30 border border-white/10"><table className="w-full min-w-[600px] border-collapse" style={{ fontSize: `${12 * textScale * 0.9}px` }}>{children}</table></div>,
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          tr: ({ children }) => <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-foreground/80 whitespace-nowrap">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatPlainText({ content, className }: { content: string; className?: string }) {
  return <p className={cn("whitespace-pre-wrap", className)}>{content}</p>;
}

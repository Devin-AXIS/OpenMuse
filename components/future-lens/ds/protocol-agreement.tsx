"use client"

import React from "react"
import { openInAppBrowser } from "@/lib/native/open-in-app-browser"
import { cn } from "@/lib/utils"

const LEGAL_BASE_URL = "https://app.ipollo.net"
export const PRIVACY_URL = `${LEGAL_BASE_URL}/privacy.html`
export const USER_AGREEMENT_URL = `${LEGAL_BASE_URL}/terms.html`

export async function openProtocolUrl(url: string) {
  if (typeof window === "undefined") return
  await openInAppBrowser(url)
}

interface ProtocolLinkProps {
  href: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
}

function ProtocolLink({ href, children, onClick }: ProtocolLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 阻止冒泡，避免触发 label 的勾选
    openProtocolUrl(href)
    onClick?.(e)
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-baseline text-muted-foreground font-medium",
        "hover:text-foreground/90 active:opacity-80 transition-colors",
      )}
    >
      {children}
    </button>
  )
}

export interface ProtocolAgreementProps {
  agreePrivacy: boolean
  agreeUserAgreement: boolean
  onAgreePrivacyChange: (checked: boolean) => void
  onAgreeUserAgreementChange: (checked: boolean) => void
  language?: "zh" | "zh-Hant" | "en"
  className?: string
}

/**
 * 登录时的隐私协议和用户协议勾选组件
 * 合并为单一圆形选择框，参考 ELYS 等应用的简洁样式
 */
export function ProtocolAgreement({
  agreePrivacy,
  agreeUserAgreement,
  onAgreePrivacyChange,
  onAgreeUserAgreementChange,
  language = "zh",
  className,
}: ProtocolAgreementProps) {
  const isZh = language === "zh" || language === "zh-Hant"
  const checked = agreePrivacy && agreeUserAgreement

  const handleToggle = () => {
    const next = !checked
    onAgreePrivacyChange(next)
    onAgreeUserAgreementChange(next)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        e.preventDefault()
        e.stopPropagation()
        handleToggle()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleToggle()
        }
      }}
      className={cn(
        "flex items-center gap-2.5 cursor-pointer group select-none w-full max-w-md px-2 py-3",
        "touch-manipulation active:opacity-90",
        className,
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 圆形单选框样式：外圈 + 选中时内圈实心点 */}
      <span
        role="checkbox"
        aria-checked={checked}
        className={cn(
          "flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
          checked
            ? "border-foreground/60 bg-foreground/5"
            : "border-muted-foreground/50 bg-transparent group-hover:border-muted-foreground/70",
        )}
      >
        {checked && (
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/80" />
        )}
      </span>
      <span className="text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
        {isZh ? "我已阅读并同意" : "I have read and agree to"}{" "}
        <ProtocolLink href={USER_AGREEMENT_URL}>
          {isZh ? "《用户协议》" : "User Agreement"}
        </ProtocolLink>
        {isZh ? "和" : " and "}
        <ProtocolLink href={PRIVACY_URL}>
          {isZh ? "《隐私政策》" : "Privacy Policy"}
        </ProtocolLink>
      </span>
    </div>
  )
}

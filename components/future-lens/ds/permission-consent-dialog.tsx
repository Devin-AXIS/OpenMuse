"use client"

import type React from "react"
import { ModalDialog } from "./modal-dialog"
import { PillButton } from "./pill-button"

export interface PermissionConsentDialogProps {
  isOpen: boolean
  title: string
  description: string
  icon?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  requireSystemPrompt?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function PermissionConsentDialog({
  isOpen,
  title,
  description,
  icon,
  confirmLabel,
  cancelLabel,
  requireSystemPrompt = false,
  onConfirm,
  onCancel,
}: PermissionConsentDialogProps) {
  const handleDismiss = requireSystemPrompt ? onConfirm : onCancel

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={() => handleDismiss?.()}
      variant="action-sheet"
      level="OVERLAY"
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex items-start gap-3 px-1">
          {icon ? (
            <div className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-primary/12 text-primary flex items-center justify-center">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 px-1 pb-1">
          <PillButton onClick={onConfirm} variant="primary">
            {confirmLabel}
          </PillButton>
          {!requireSystemPrompt && onCancel && cancelLabel ? (
            <PillButton onClick={onCancel} variant="secondary">
              {cancelLabel}
            </PillButton>
          ) : null}
        </div>
      </div>
    </ModalDialog>
  )
}

/**
 * Z-Index 常量（已整合到 DesignTokens.zIndex）
 *
 * @deprecated 请使用 DesignTokens.zIndex 替代
 * 保留此文件以保持向后兼容，新代码请使用：
 * ```tsx
 * import { DesignTokens } from '@/lib/future-lens/design-tokens'
 * const zIndex = DesignTokens.zIndex.modal
 * ```
 *
 * 映射关系：
 * - Z_INDEX.BASE -> DesignTokens.zIndex.base
 * - Z_INDEX.DRAWER -> DesignTokens.zIndex.drawer
 * - Z_INDEX.MODAL -> DesignTokens.zIndex.modal
 * - Z_INDEX.OVERLAY -> DesignTokens.zIndex.overlay
 * - Z_INDEX.TOAST -> DesignTokens.zIndex.toast
 * - Z_INDEX.ALERT -> DesignTokens.zIndex.alert
 */
export const Z_INDEX = {
  BASE: 0,
  DRAWER: 50, // Level 1: Main drawers (Chat, etc.)
  MODAL: 100, // Level 2: Standard modals
  OVERLAY: 200, // Level 3: Top-level sheets (Attachments, etc.)
  TOAST: 300, // Level 4: Notifications
  ALERT: 400, // Level 5: Critical dialogs / Pickers
} as const

/**
 * Z-Index 层级类型（已整合到 DesignTokens）
 *
 * @deprecated 请使用 DesignTokens 中的 ZIndexLevel 类型替代
 */
export type ZIndexLevel = keyof typeof Z_INDEX

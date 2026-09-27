/**
 * 原生风格动画配置
 * 用于 BottomSheet、Modal 等组件的过渡动画，App 端与 Web 页统一采用 iOS 风格。
 * - Sheet/Modal：iOS 系统模态曲线 + 时长，两端一致。
 */

import type { Transition } from "framer-motion"

/** iOS 系统常用「呈现」曲线：减速到位，与系统 Sheet/Modal 一致（cubic-bezier 近似） */
const IOS_PRESENT_EASE = [0.32, 0.72, 0, 1] as [number, number, number, number]

/** 底部弹窗滑入/滑出：App 与 Web 统一用 iOS 曲线 + 时长，手感一致 */
export function getSheetTransition(): Transition {
  return {
    type: "tween",
    duration: 0.42,
    ease: IOS_PRESENT_EASE,
  }
}

/** 遮罩淡入淡出：与 sheet 同步，iOS 节奏 */
export function getBackdropTransition(): Transition {
  return { duration: 0.25, ease: IOS_PRESENT_EASE }
}

/** Tab 内容淡入/滑入：比 sheet 略短，贴近 iOS 页面切换节奏 */
export function getContentRevealTransition(): Transition {
  return { duration: 0.28, ease: IOS_PRESENT_EASE }
}

/** 通用按压反馈：列表项/卡片点击时轻微缩放，交互感更强（iOS 约 0.97–0.98） */
export const TAP_SCALE = 0.98

/** 按压反馈动画时长（秒），用于 active 态 transition，贴近 iOS 触控反馈节奏 */
export const TAP_FEEDBACK_DURATION = 0.12

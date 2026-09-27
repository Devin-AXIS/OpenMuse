import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将多语言格式的字段转换为字符串
 * 支持格式：{en: "", zh: ""} 或普通字符串
 * 优先使用中文（zh），如果没有则使用英文（en）
 *
 * @param value - 可能是字符串或多语言对象 {zh: string, en: string}
 * @returns 字符串值
 *
 * @example
 * ```typescript
 * getI18nString("普通字符串") // "普通字符串"
 * getI18nString({zh: "中文", en: "English"}) // "中文"
 * getI18nString({en: "English"}) // "English"
 * getI18nString(null) // ""
 * ```
 */
export function getI18nString(value: any): string {
  if (value === null || value === undefined) {
    return ""
  }

  // 如果是字符串，直接返回
  if (typeof value === 'string') {
    return value
  }

  // 如果是对象，检查是否是多语言格式
  if (typeof value === 'object' && !Array.isArray(value)) {
    // 检查是否是多语言对象（有 zh 或 en 键）
    if ('zh' in value || 'en' in value) {
      // 优先使用中文，如果没有则使用英文
      return value.zh || value.en || ""
    }
    // 其他对象类型，尝试转换为字符串
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  // 其他类型，转换为字符串
  return String(value)
}

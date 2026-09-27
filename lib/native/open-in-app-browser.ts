import { AppLauncher } from "@capacitor/app-launcher"
import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"
import type { PluginListenerHandle } from "@capacitor/core"
import {
  DefaultSystemBrowserOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser"
import type { WebViewOptions } from "@capacitor/inappbrowser"

let iosInAppBrowserClosedListener: PluginListenerHandle | undefined

/** 供外链拦截与打开逻辑共用：trim、补全 // 为 https: */
export function normalizeHttpUrl(url: string): string | null {
  const raw = url.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith("//")) return `https:${raw}`
  return null
}

export type OpenInAppBrowserOptions = {
  /**
   * 历史兼容：曾用于 @capacitor/browser 工具栏色。
   * InAppBrowser WebView 不使用该字段，可忽略。
   */
  toolbarColor?: string
}

/** App 内嵌全屏 WebView（非 SFSafariView / Custom Tabs）。 */
function buildExternalWebViewOptions(): WebViewOptions {
  const isIos = Capacitor.getPlatform() === "ios"
  return {
    ...DefaultWebViewOptions,
    /** iOS：原生库中间槽会整段显示 URL，易与右侧分享按钮重叠；关闭后由 AinoInAppBrowserChrome 显示短标题/域名。Android 仍用原生 URL 条。 */
    showURL: !isIos,
    showToolbar: true,
    showNavigationButtons: false,
    // 原生栏仅支持文案槽位（无 SF Symbol），用装饰性单字符「❮」表达返回/关闭，避免显示英文 Close
    closeButtonText: "\u276E",
    android: {
      ...DefaultWebViewOptions.android,
      hardwareBack: true,
    },
  }
}

async function attachIosInAppBrowserShareAccessory(): Promise<void> {
  if (Capacitor.getPlatform() !== "ios") return
  try {
    const { AinoInAppBrowserChrome } = await import("./aino-in-app-browser-chrome")
    await AinoInAppBrowserChrome.attachShareAccessory()
    await iosInAppBrowserClosedListener?.remove()
    const handle = await InAppBrowser.addListener("browserClosed", async () => {
      try {
        const { AinoInAppBrowserChrome: Chrome } = await import("./aino-in-app-browser-chrome")
        await Chrome.detachShareAccessory()
      } catch {
        /* noop */
      }
      await handle.remove()
      if (iosInAppBrowserClosedListener === handle) {
        iosInAppBrowserClosedListener = undefined
      }
    })
    iosInAppBrowserClosedListener = handle
  } catch (err) {
    console.warn("[openInAppBrowser] iOS share accessory:", err)
  }
}

/**
 * 原生壳：在应用内 WebView 全屏打开 http(s) 外链；
 * 浏览器环境仍用 window.open。
 *
 * 注意：原生壳内不得对 http(s) 调用 window.open —— iOS 会走 WKUIDelegate.createWebView，
 * Capacitor 默认会直接 UIApplication.shared.open，跳到系统 Safari。
 */
export async function openInAppBrowser(url: string, _options?: OpenInAppBrowserOptions): Promise<void> {
  if (typeof window === "undefined") return

  const normalized = normalizeHttpUrl(url)
  if (!normalized) {
    console.warn("[openInAppBrowser] unsupported url:", url)
    return
  }

  if (!Capacitor.isNativePlatform()) {
    window.open(normalized, "_blank", "noopener,noreferrer")
    return
  }

  try {
    await InAppBrowser.openInWebView({
      url: normalized,
      options: buildExternalWebViewOptions(),
    })
    await attachIosInAppBrowserShareAccessory()
    return
  } catch (err) {
    console.error("[openInAppBrowser] openInWebView failed:", err)
  }

  try {
    await InAppBrowser.openInSystemBrowser({
      url: normalized,
      options: DefaultSystemBrowserOptions,
    })
    return
  } catch (err) {
    console.error("[openInAppBrowser] openInSystemBrowser failed:", err)
  }

  try {
    await InAppBrowser.openInExternalBrowser({ url: normalized })
    return
  } catch (err) {
    console.error("[openInAppBrowser] openInExternalBrowser failed:", err)
  }

  try {
    await Browser.open({ url: normalized })
    return
  } catch (err) {
    console.error("[openInAppBrowser] Browser.open failed:", err)
  }

  try {
    await AppLauncher.openUrl({ url: normalized })
    return
  } catch (err) {
    console.error("[openInAppBrowser] AppLauncher.openUrl failed:", err)
  }

  try {
    window.location.assign(normalized)
  } catch (err) {
    console.error("[openInAppBrowser] location.assign failed:", err)
  }
}

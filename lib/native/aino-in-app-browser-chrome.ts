import { registerPlugin } from "@capacitor/core"

export interface AinoInAppBrowserChromePlugin {
  attachShareAccessory(): Promise<void>
  detachShareAccessory(): Promise<void>
}

export const AinoInAppBrowserChrome = registerPlugin<AinoInAppBrowserChromePlugin>(
  "AinoInAppBrowserChrome",
  {
    web: {
      attachShareAccessory: async () => {},
      detachShareAccessory: async () => {},
    },
  },
)

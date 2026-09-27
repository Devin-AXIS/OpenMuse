"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Language } from "./i18n";

type Theme = "light" | "dark" | "system";

type AppConfig = {
  language: Language;
  textScale: number;
  textScaleRaw: number;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTextScale: (scale: number) => void;
  setTheme: (theme: Theme) => void;
};

const ConfigContext = createContext<AppConfig | null>(null);
const DEFAULT_TEXT_SCALE = 1.05;
const STANDARD_FONT_SCALE = 1.1 * 1.05;

export const DEFAULT_EFFECTIVE_SCALE = STANDARD_FONT_SCALE;

export function textScaleFactor(rawScale: number) {
  if (rawScale <= 0.9) return STANDARD_FONT_SCALE * 0.95;
  if (rawScale >= 1.1) return STANDARD_FONT_SCALE * 1.2;
  return STANDARD_FONT_SCALE;
}

function isLanguage(value: string | null): value is Language {
  return value === "zh" || value === "zh-Hant" || value === "en";
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function fSize(basePx: number, scale = DEFAULT_EFFECTIVE_SCALE): number {
  return basePx * scale;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");
  const [textScaleRaw, setTextScaleState] = useState(DEFAULT_TEXT_SCALE);
  const [theme, setThemeState] = useState<Theme>("system");
  const effectiveTextScale = textScaleFactor(textScaleRaw);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("app-language");
    const savedScale = Number(localStorage.getItem("app-text-scale"));
    const savedTheme = localStorage.getItem("app-theme");
    if (isLanguage(savedLanguage)) setLanguageState(savedLanguage);
    if (Number.isFinite(savedScale) && savedScale > 0) setTextScaleState(savedScale);
    if (isTheme(savedTheme)) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolveTheme(theme);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.classList.toggle("light", resolved === "light");
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === "zh-Hant" ? "zh-Hant" : language;
    document.documentElement.style.fontSize = "100%";
    document.documentElement.style.setProperty("--app-font-scale", String(effectiveTextScale));
  }, [effectiveTextScale, language]);

  const value = useMemo<AppConfig>(() => ({
    language,
    textScale: effectiveTextScale,
    textScaleRaw,
    theme,
    setLanguage(next) {
      setLanguageState(next);
      localStorage.setItem("app-language", next);
    },
    setTextScale(next) {
      setTextScaleState(next);
      localStorage.setItem("app-text-scale", String(next));
    },
    setTheme(next) {
      setThemeState(next);
      localStorage.setItem("app-theme", next);
    },
  }), [effectiveTextScale, language, textScaleRaw, theme]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export const AppConfigProvider = ConfigProvider;

export function useAppConfig(): AppConfig {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("useAppConfig must be used within ConfigProvider");
  return config;
}

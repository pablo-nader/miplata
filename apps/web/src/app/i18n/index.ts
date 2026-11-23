import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";

export const supportedLanguages = ["es", "en"] as const;
export type Language = (typeof supportedLanguages)[number];

export const defaultLanguage: Language = "es";

export const resources = { es: { translation: es }, en: { translation: en } };

export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    const match = supportedLanguages.find((language) => language === base);
    if (match) return match;
  }
  return defaultLanguage;
}

export function createI18n(language: Language) {
  const instance = i18n.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: defaultLanguage,
    interpolation: { escapeValue: false },
  });
  return instance;
}

export function syncDocumentLanguage(language: Language, target: Document = document) {
  target.documentElement.lang = language;
}

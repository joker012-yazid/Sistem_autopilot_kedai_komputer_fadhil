import type { Language } from "../features/caredesk/domain/domain";

const languageKey = "fadhil-caredesk-language";

export function getCurrentLanguage(): Language {
  if (typeof window === "undefined") {
    return "bm";
  }
  return window.localStorage.getItem(languageKey) === "en" ? "en" : "bm";
}

export function setCurrentLanguage(language: Language): Language {
  window.localStorage.setItem(languageKey, language);
  return language;
}

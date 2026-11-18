import en from "./en.json";

export type MessageKey = keyof typeof en;
export type Lang = "en" | "pcm" | "ha" | "yo" | "ig";

// Other languages are partial overrides of English; missing keys fall back to English.
const catalogs: Partial<Record<Lang, Partial<Record<MessageKey, string>>>> = { en };

/** t("status.verified.detail", { n: 3 }) → "3 witnesses agree" */
export function t(key: MessageKey, vars?: Record<string, string | number>, lang: Lang = "en"): string {
  const text = catalogs[lang]?.[key] ?? en[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
}

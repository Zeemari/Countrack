"use client";

import { LangContext, type Lang } from "@/lib/i18n";

/** Lets client components rendered on the server know the page language (see currentLang). */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  if (!LangContext) return children;
  return <LangContext value={lang}>{children}</LangContext>;
}

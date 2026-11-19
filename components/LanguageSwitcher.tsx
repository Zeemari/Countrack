"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { currentLang, LANGS, t, type Lang } from "@/lib/i18n";
import { switchLang } from "@/lib/i18n/path";

/** Header language menu. Saves the choice in a cookie and reloads the same page in that language. */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lang = currentLang();
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  function choose(code: Lang) {
    setOpen(false);
    if (code === lang) return;
    switchLang(code);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("lang.label")}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-frame-ink/20 px-3 text-sm font-semibold text-frame-ink transition hover:bg-frame-ink/10"
      >
        <Languages aria-hidden className="size-4" />
        <span className="uppercase">{active.code}</span>
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-border bg-surface p-1.5 text-text shadow-lift animate-pop-in">
          {LANGS.map((l) => (
            <li key={l.code} role="none">
              <button
                role="menuitemradio"
                aria-checked={l.code === lang}
                lang={l.code}
                onClick={() => choose(l.code)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-surface-2 font-mono text-[11px] font-bold uppercase">{l.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{l.name}</span>
                  {l.name !== l.english && <span className="block text-xs text-muted">{l.english}</span>}
                </span>
                {l.code === lang && <Check aria-hidden className="size-4 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CircleCheck, Scale } from "lucide-react";
import { signed } from "@/lib/format";
import { t } from "@/lib/i18n";

const WALL = 142;
const MAX = 400;

/** Hands-on version of the wall-vs-announced check. Example numbers only. */
export function MatchDemo() {
  const [announced, setAnnounced] = useState(241);
  const diff = announced - WALL;
  const match = diff === 0;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center md:gap-12">
      <div className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("home.demo.wall")}</span>
          <span className="flex items-center gap-4">
            <input readOnly value={WALL} className="field w-24 shrink-0 text-center font-mono font-bold tabular-nums" />
            <span className="h-2 flex-1 rounded-full bg-brand" style={{ maxWidth: `${(WALL / MAX) * 100}%` }} />
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("home.demo.announced")}</span>
          <span className="flex items-center gap-4">
            <input
              inputMode="numeric"
              value={announced}
              onChange={(e) => setAnnounced(Math.min(MAX, Number(e.target.value.replace(/\D/g, "")) || 0))}
              className="field w-24 shrink-0 text-center font-mono font-bold tabular-nums"
            />
            <input
              type="range"
              min={0}
              max={MAX}
              value={announced}
              onChange={(e) => setAnnounced(Number(e.target.value))}
              className="range flex-1"
              style={{ "--fill": `${(announced / MAX) * 100}%` } as React.CSSProperties}
              aria-label={t("home.demo.announced")}
            />
          </span>
        </label>
        <button onClick={() => setAnnounced(WALL)} className="self-start text-sm font-semibold text-brand underline-offset-4 hover:underline">
          {t("home.demo.same")} →
        </button>
      </div>

      <div
        aria-live="polite"
        className={`flex min-w-60 flex-col items-center gap-2 rounded-[1.5rem] px-8 py-7 text-center transition-colors duration-300 ${
          match ? "bg-brand text-brand-ink" : "bg-frame text-frame-ink"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {match ? <CircleCheck aria-hidden className="size-5" /> : <Scale aria-hidden className="size-5 text-accent" />}
          {match ? t("home.demo.match") : t("home.demo.diff")}
        </span>
        <span className={`display text-6xl tabular-nums ${match ? "" : "text-accent"}`}>{match ? "0" : signed(diff)}</span>
        <span className="text-xs opacity-75">{match ? t("diff.match") : t("home.demo.votes", { n: Math.abs(diff) })}</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import type { FeedEvent } from "@/lib/feed";
import { t } from "@/lib/i18n";

const KEY = "countrack.adminKey";
const readKey = () => {
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const saveKey = (v: string) => {
  try {
    window.sessionStorage.setItem(KEY, v);
  } catch {
    /* private mode: ask again next time */
  }
};
const forgetKey = () => {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
};

/** The small bin on a feed item's corner. Sits outside the item's link so it never opens the unit. */
export function HideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("feed.hide")}
      title={t("feed.hide")}
      className="absolute -top-3 right-3 z-20 grid size-8 place-items-center rounded-full border border-border bg-surface text-muted shadow-card transition hover:border-review-text hover:text-review-text focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
    >
      <Trash2 aria-hidden className="size-4" />
    </button>
  );
}

/**
 * Asks for the admin passcode (remembered for this browser tab) and removes one item from the
 * public feed. The record itself is kept; the server only stops listing it.
 */
export function HideFeedDialog({ event, onHidden, onClose }: { event: FeedEvent; onHidden: (id: string) => void; onClose: () => void }) {
  const [key, setKey] = useState(readKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hide(close: () => void) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/feed/hide", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ id: event.id }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (res?.ok) {
      saveKey(key);
      onHidden(event.id);
      return close();
    }
    if (body?.error === "wrong_key") {
      forgetKey();
      return setError(t("feed.hide.wrongKey"));
    }
    setError(
      body?.error === "not_configured" ? t("feed.hide.notSet")
      : body?.error === "not_migrated" ? t("feed.hide.notMigrated")
      : t("feed.hide.failed"),
    );
  }

  return (
    <Modal title={t("feed.hide.title")} onClose={onClose}>
      {(close) => (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void hide(close);
          }}
        >
          <p className="text-sm text-muted">{t("feed.hide.body")}</p>
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
            <span className="font-mono text-xs text-muted">{event.unit.code}</span>
            <span className="block font-semibold">{event.unit.name}</span>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t("feed.hide.key")}</span>
            <span className="relative block">
              <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                aria-invalid={!!error}
                className="field pl-11"
              />
            </span>
          </label>
          {error && <p role="alert" className="rounded-2xl bg-review-bg px-4 py-3 text-sm text-review-text">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="btn btn-secondary">{t("feed.hide.cancel")}</button>
            <button disabled={busy || !key} className="btn bg-review-text text-review-bg hover:opacity-90">
              {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />} {t("feed.hide.confirm")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

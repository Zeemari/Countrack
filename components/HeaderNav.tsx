"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera } from "lucide-react";
import { NAV } from "@/components/nav-items";
import { t } from "@/lib/i18n";
import { useCaptures } from "@/lib/offline/hooks";

const LINKS = [NAV.units, NAV.queue, NAV.collate];

/** Plain text links for wider screens; phones use the bottom bar instead. */
export function HeaderNav() {
  const path = usePathname();
  const pending = useCaptures()?.filter((c) => c.status !== "done").length ?? 0;
  return (
    <nav aria-label={t("nav.main")} className="hidden items-center gap-1 md:flex">
      {LINKS.map((item) => {
        const active = item.match(path);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active ? "bg-frame-ink/12 text-frame-ink" : "text-frame-muted hover:text-frame-ink"
            }`}
          >
            {item.short}
            {item === NAV.queue && pending > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{pending}</span>
            )}
          </Link>
        );
      })}
      <Link href="/capture" className="btn btn-gold mr-1 ml-2 min-h-9 px-4 text-sm">
        <Camera aria-hidden className="size-4" /> {t("nav.capture")}
      </Link>
    </nav>
  );
}

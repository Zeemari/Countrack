"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { NAV, type NavItem } from "@/components/nav-items";
import { t } from "@/lib/i18n";
import { useAppPath } from "@/lib/i18n/path";
import { useCaptures } from "@/lib/offline/hooks";

/** Phone navigation: a floating dark pill with a raised capture button. Hidden on wider screens (see HeaderNav). */
export function BottomNav() {
  const path = useAppPath();
  const pending = useCaptures()?.filter((c) => c.status !== "done").length ?? 0;

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-full border border-frame-ink/10 bg-frame/90 text-frame-ink shadow-lift backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        <Tab item={NAV.home} path={path} />
        <Tab item={NAV.units} path={path} />
        <li className="flex justify-center">
          <Link
            href="/capture"
            aria-label={t(NAV.capture.short)}
            aria-current={NAV.capture.match(path) ? "page" : undefined}
            className="grid size-13 place-items-center rounded-full bg-accent text-black shadow-lift transition active:scale-95"
          >
            <Camera aria-hidden className="size-6" />
          </Link>
        </li>
        <Tab item={NAV.queue} path={path} badge={pending} />
        <Tab item={NAV.collate} path={path} />
      </ul>
    </nav>
  );
}

function Tab({ item, path, badge = 0 }: { item: NavItem; path: string; badge?: number }) {
  const Icon = item.icon;
  const active = item.match(path);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition ${active ? "text-accent" : "text-frame-muted"}`}
      >
        <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
        {t(item.short)}
        {badge > 0 && (
          <span className="absolute -top-0.5 right-3 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

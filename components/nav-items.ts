import { AlertTriangle, Camera, ClipboardPen, CloudUpload, House, MapPin, ScanSearch, type LucideIcon } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

/** Labels are message keys, translated where they render (this module loads before any language is known). */
export type NavItem = { href: string; short: MessageKey; long: MessageKey; icon: LucideIcon; match: (p: string) => boolean };

export const NAV = {
  home: { href: "/", short: "nav.home", long: "nav.home.long", icon: House, match: (p) => p === "/" },
  units: { href: "/units", short: "nav.units", long: "nav.units.long", icon: MapPin, match: (p) => p.startsWith("/units") },
  capture: { href: "/capture", short: "nav.capture", long: "nav.capture.long", icon: Camera, match: (p) => p.startsWith("/capture") },
  queue: {
    href: "/queue", short: "nav.queue", long: "nav.queue.long", icon: CloudUpload,
    match: (p) => p.startsWith("/queue") || p.startsWith("/review"),
  },
  irev: { href: "/irev", short: "nav.irev", long: "nav.irev.long", icon: ScanSearch, match: (p) => p.startsWith("/irev") },
  collate: { href: "/collation", short: "nav.collate", long: "nav.collate.long", icon: ClipboardPen, match: (p) => p.startsWith("/collation") },
  incidents: { href: "/incidents", short: "nav.incidents", long: "nav.incidents", icon: AlertTriangle, match: (p) => p.startsWith("/incidents") },
} satisfies Record<string, NavItem>;

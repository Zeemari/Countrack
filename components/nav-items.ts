import { AlertTriangle, Camera, ClipboardPen, CloudUpload, House, MapPin, ScanSearch, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";

export type NavItem = { href: string; short: string; long: string; icon: LucideIcon; match: (p: string) => boolean };

export const NAV = {
  home: { href: "/", short: t("nav.home"), long: t("nav.home.long"), icon: House, match: (p) => p === "/" },
  units: { href: "/units", short: t("nav.units"), long: t("nav.units.long"), icon: MapPin, match: (p) => p.startsWith("/units") },
  capture: { href: "/capture", short: t("nav.capture"), long: t("nav.capture.long"), icon: Camera, match: (p) => p.startsWith("/capture") },
  queue: {
    href: "/queue", short: t("nav.queue"), long: t("nav.queue.long"), icon: CloudUpload,
    match: (p) => p.startsWith("/queue") || p.startsWith("/review"),
  },
  irev: { href: "/irev", short: t("nav.irev"), long: t("nav.irev.long"), icon: ScanSearch, match: (p) => p.startsWith("/irev") },
  collate: { href: "/collation", short: t("nav.collate"), long: t("nav.collate.long"), icon: ClipboardPen, match: (p) => p.startsWith("/collation") },
  incidents: { href: "/incidents", short: t("nav.incidents"), long: t("nav.incidents"), icon: AlertTriangle, match: (p) => p.startsWith("/incidents") },
} satisfies Record<string, NavItem>;

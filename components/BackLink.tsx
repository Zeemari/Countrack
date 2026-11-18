import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";

export function BackLink({ href, label = t("nav.home") }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-10 items-center gap-1.5 self-start rounded-full px-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
    >
      <ArrowLeft aria-hidden className="size-4" /> {label}
    </Link>
  );
}

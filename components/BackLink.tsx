import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";

export function BackLink({ href, label = t("nav.home") }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-brand">
      <ArrowLeft aria-hidden className="size-5" /> {label}
    </Link>
  );
}

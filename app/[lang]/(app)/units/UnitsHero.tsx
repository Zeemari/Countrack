import Link from "next/link";
import { MapPin, ScanSearch } from "lucide-react";
import { HeroPanel } from "@/components/HeroPanel";
import { t } from "@/lib/i18n";

/** The units page header: shared by the browser, its loading state and its empty/error states. */
export function UnitsHero({ children }: { children?: React.ReactNode }) {
  return (
    <HeroPanel
      id="units-doodles"
      eyebrow={t("units.eyebrow")}
      eyebrowIcon={MapPin}
      live
      title={t("units.hero.title")}
      highlight={t("units.hero.title2")}
      highlightClass="text-e-reps"
      subtitle={t("units.subtitle")}
      aside={
        <Link href="/irev" className="btn btn-gold min-h-12 w-fit shrink-0 px-5 text-sm">
          <ScanSearch aria-hidden className="size-4" /> {t("units.irevAction")}
        </Link>
      }
    >
      {children}
    </HeroPanel>
  );
}

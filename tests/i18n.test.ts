import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import ha from "@/lib/i18n/ha.json";
import ig from "@/lib/i18n/ig.json";
import pcm from "@/lib/i18n/pcm.json";
import yo from "@/lib/i18n/yo.json";
import { LANGS, negotiateLang } from "@/lib/i18n/langs";
import { t } from "@/lib/i18n";
import { stripLang } from "@/lib/i18n/path";

const catalogs: Record<string, Record<string, string>> = { pcm, ha, yo, ig };
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
// Developer-only setup messages stay English everywhere.
const DEV_ONLY = /^(home\.setup\.|units\.empty\.(body|hint))/;

describe.each(Object.entries(catalogs))("%s catalog", (code, catalog) => {
  it("only uses keys that exist in English", () => {
    expect(Object.keys(catalog).filter((k) => !(k in en))).toEqual([]);
  });

  it("keeps every {placeholder} from the English text", () => {
    const broken = Object.entries(catalog).filter(([k, v]) => vars(v).join() !== vars(en[k as keyof typeof en]).join());
    expect(broken.map(([k]) => k)).toEqual([]);
  });

  it("translates every user-facing string", () => {
    const missing = Object.keys(en).filter((k) => !DEV_ONLY.test(k) && !(k in catalog) && k !== "app.name");
    expect(missing, `${code} is missing these keys`).toEqual([]);
  });
});

describe("language helpers", () => {
  it("lists every catalog as a language", () => {
    expect(LANGS.map((l) => l.code).sort()).toEqual(["en", ...Object.keys(catalogs)].sort());
  });

  it("negotiates from Accept-Language", () => {
    expect(negotiateLang("ha-NG,ha;q=0.9,en;q=0.8")).toBe("ha");
    expect(negotiateLang("fr-FR,yo;q=0.5")).toBe("yo");
    expect(negotiateLang("en-GB,ig;q=0.9")).toBe("en");
    expect(negotiateLang("de,fr")).toBe("en");
    expect(negotiateLang(null)).toBe("en");
  });

  it("translates with an explicit language and falls back to English", () => {
    expect(t("lang.label", undefined, "ha")).toBe("Harshe");
    expect(t("app.name", undefined, "yo")).toBe("CounTrack");
    expect(t("units.showing", { from: 1, to: 12, total: 99 }, "pcm")).toBe("Dey show 1–12 out of 99 units");
  });

  it("strips the language prefix from paths", () => {
    expect(stripLang("/ha/units")).toBe("/units");
    expect(stripLang("/pcm")).toBe("/");
    expect(stripLang("/units/SIM-001")).toBe("/units/SIM-001");
  });
});

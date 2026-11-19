import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { FinalizePrompt } from "@/components/FinalizePrompt";
import { Footer } from "@/components/Footer";
import { Preloader } from "@/components/Preloader";
import { SyncManager } from "@/components/SyncManager";
import { LangProvider } from "@/components/LangProvider";
import { LANG_CODES } from "@/lib/i18n/langs";
import { requestLang } from "@/lib/i18n/server";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext", "vietnamese"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext", "vietnamese"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin", "latin-ext", "vietnamese"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  title: "CounTrack",
  description: "Turn photos of polling-unit result sheets into tamper-evident evidence.",
  appleWebApp: { capable: true, title: "CounTrack", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c2418" },
    { media: "(prefers-color-scheme: dark)", color: "#050d08" },
  ],
};

/** Every language is prerendered; the proxy picks one per visitor without changing the URL. */
export function generateStaticParams() {
  return LANG_CODES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await requestLang();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <Preloader />
          <AppHeader />
          <SyncManager />
          <FinalizePrompt />
          <main className="flex w-full flex-1 flex-col">{children}</main>
          <Footer />
          <Suspense>
            <BottomNav />
          </Suspense>
        </LangProvider>
      </body>
    </html>
  );
}

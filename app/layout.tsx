import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SimulatedBanner } from "@/components/SimulatedBanner";
import { SyncManager } from "@/components/SyncManager";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CounTrack",
  description: "Turn photos of polling-unit result sheets into tamper-evident evidence.",
  appleWebApp: { capable: true, title: "CounTrack", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6b3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SimulatedBanner />
        <SyncManager />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">{children}</main>
      </body>
    </html>
  );
}

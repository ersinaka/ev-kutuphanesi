import type { Metadata, Viewport } from "next";
import { Caveat, Nunito } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const caveat = Caveat({
  variable: "--font-sketch",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ev Kütüphanesi",
  description: "Ev Kütüphanesi",
  applicationName: "Ev Kütüphanesi",
  appleWebApp: {
    capable: true,
    title: "Ev Kütüphanesi",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6f6a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${caveat.variable} ${nunito.variable} h-full antialiased`}
    >
      <body>
        <div className="app-shell">
          <div className="room-glow" aria-hidden />
          <div className="sketch-doodles" aria-hidden />
          <SiteNav />
          <main className="app-main">{children}</main>
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}

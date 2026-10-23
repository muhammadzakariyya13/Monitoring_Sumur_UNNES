import type { Metadata, Viewport } from "next";
import { UiPreferencesProvider } from "@/components/ui-preferences";
import { AuthProvider } from "@/components/auth";
import "./globals.css";
import "./theme.css";
import "@/components/ui.css";
import "@/components/dashboard.css";
export const metadata: Metadata = {
  title: "SIMARA — Sistem Informasi Monitoring Air",
  description: "SIMARA — Sistem Informasi Monitoring Air Universitas Negeri Semarang",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SIMARA",
    statusBarStyle: "default",
  },
  icons: { icon: { url: "/logo-simara.svg", type: "image/svg+xml" }, apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  themeColor: "#082f55",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var p=JSON.parse(localStorage.getItem('simara-ui-preferences')||'{}');document.documentElement.dataset.theme=p.theme==='dark'?'dark':'light';document.documentElement.lang=p.language==='en'?'en':'id'}catch{}` }} /></head>
      <body>
        <UiPreferencesProvider><AuthProvider>{children}</AuthProvider></UiPreferencesProvider>
      </body>
    </html>
  );
}
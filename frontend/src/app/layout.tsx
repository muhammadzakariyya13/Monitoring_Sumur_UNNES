import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth";
import "./globals.css";
import "@/components/ui.css";
import "@/components/dashboard.css";
export const metadata: Metadata = {
  title: "Tirta UNNES · Monitoring Air",
  description: "Monitoring penggunaan air sumur Universitas Negeri Semarang",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tirta UNNES",
    statusBarStyle: "default",
  },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
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
    <html lang="id">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

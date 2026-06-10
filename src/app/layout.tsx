import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "La Polla — Mundial 2026",
  description: "Portal de Pronósticos para el Mundial FIFA 2026. Simula el torneo, compite en grupos de amigos y sigue los partidos en vivo.",
};

export const viewport: Viewport = {
  themeColor: "#022c22", // Emerald-950
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable}`}>
      <body className="antialiased bg-neutral-950 text-neutral-100 font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}

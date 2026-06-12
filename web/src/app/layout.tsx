import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { clerkDisponible } from "@/lib/auth";

// Fraunces: serif cálida y con personalidad, para títulos.
// Nunito Sans: redondeada y muy legible, para el cuerpo.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000"
  ),
  title: {
    default: "AdoptAR — Adopción de animales en Argentina",
    template: "%s | AdoptAR",
  },
  description:
    "Plataforma argentina sin fines de lucro para adoptar perros, gatos y otros animales, encontrar hogares de tránsito y ayudar a refugios de todo el país.",
  openGraph: {
    siteName: "AdoptAR",
    locale: "es_AR",
    type: "website",
  },
};

// Color de la barra del navegador (mismo crema del fondo del sitio)
export const viewport: Viewport = {
  themeColor: "#faf4ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contenido = (
    <html
      lang="es"
      className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Métricas anónimas de Vercel (plan free, sin cookies) */}
        <Analytics />
      </body>
    </html>
  );

  // Clerk (login) en español, solo si hay claves configuradas.
  // Sin claves, la app corre igual en modo demo.
  if (!clerkDisponible()) return contenido;
  return <ClerkProvider localization={esES}>{contenido}</ClerkProvider>;
}

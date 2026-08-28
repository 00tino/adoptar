import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BannerVitrina from "@/components/BannerVitrina";
import { clerkDisponible } from "@/lib/auth";

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
    "Plataforma argentina sin fines de lucro para adoptar perros, gatos y otros animales, encontrar hogares de tránsito y ayudar a refugios.",
  openGraph: {
    siteName: "AdoptAR",
    locale: "es_AR",
    type: "website",
  },
};

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
        <BannerVitrina />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );

  if (!clerkDisponible()) return contenido;
  return <ClerkProvider localization={esES}>{contenido}</ClerkProvider>;
}

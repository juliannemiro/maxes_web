import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritosProvider } from "@/context/FavoritosContext";
import { PurchaseModeProvider } from "@/context/PurchaseModeContext";
import AnalyticsActivity from "@/components/analytics/AnalyticsActivity";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
        ? "https://maxes-web.vercel.app"
        : "http://localhost:3785");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MAXES | Tus insumos en un solo lugar",
    template: "%s | MAXES",
  },
  description: "Catálogo web de Maxes Insumos para armar pedidos y consultar productos.",
  applicationName: "MAXES",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "MAXES",
    title: "MAXES | Tus insumos en un solo lugar",
    description: "Explorá el catálogo de Maxes Insumos y armá tu pedido online.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MAXES | Tus insumos en un solo lugar",
    description: "Explorá el catálogo de Maxes Insumos y armá tu pedido online.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <AnalyticsActivity />
        <PurchaseModeProvider>
          <FavoritosProvider>
            <CartProvider>{children}</CartProvider>
          </FavoritosProvider>
        </PurchaseModeProvider>
      </body>
    </html>
  );
}

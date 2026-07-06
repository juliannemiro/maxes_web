import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import { FavoritosProvider } from "../context/FavoritosContext";
import { PurchaseModeProvider } from "../context/PurchaseModeContext";

export const metadata: Metadata = {
  title: "MAXES | Tus insumos en un solo lugar",
  description: "Catálogo web de Maxes Insumos para armar pedidos y consultar productos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <PurchaseModeProvider>
          <FavoritosProvider>
            <CartProvider>{children}</CartProvider>
          </FavoritosProvider>
        </PurchaseModeProvider>
      </body>
    </html>
  );
}

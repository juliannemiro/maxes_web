"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { TipoCompra } from "../lib/obtenerPrecio";

interface PurchaseModeContextType {
  tipoCompra: TipoCompra;
  setTipoCompra: (value: TipoCompra) => void;
}

const STORAGE_KEY = "maxes_tipo_compra";

const PurchaseModeContext = createContext<PurchaseModeContextType | undefined>(undefined);

export function PurchaseModeProvider({ children }: { children: React.ReactNode }) {
  const [tipoCompra, setTipoCompra] = useState<TipoCompra>(() => {
    if (typeof window === "undefined") {
      return "mayorista";
    }

    const savedTipoCompra = window.localStorage.getItem(STORAGE_KEY);
    return savedTipoCompra === "minorista" ? "minorista" : "mayorista";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tipoCompra);
  }, [tipoCompra]);

  return (
    <PurchaseModeContext.Provider value={{ tipoCompra, setTipoCompra }}>
      {children}
    </PurchaseModeContext.Provider>
  );
}

export function usePurchaseMode() {
  const context = useContext(PurchaseModeContext);
  if (context === undefined) {
    throw new Error("usePurchaseMode must be used within a PurchaseModeProvider");
  }
  return context;
}

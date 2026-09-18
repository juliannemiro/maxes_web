"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { TipoPrecio } from "@/utils/precio";

interface PurchaseModeContextType {
  tipoPrecio: TipoPrecio;
  setTipoPrecio: (value: TipoPrecio) => void;
}

const STORAGE_KEY = "maxes_tipo_precio";

const PurchaseModeContext = createContext<PurchaseModeContextType | undefined>(undefined);

export function PurchaseModeProvider({ children }: { children: React.ReactNode }) {
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecio>(() => {
    if (typeof window === "undefined") {
      return "mayorista";
    }

    const savedTipoPrecio = window.localStorage.getItem(STORAGE_KEY);
    return savedTipoPrecio === "minorista" ? "minorista" : "mayorista";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tipoPrecio);
  }, [tipoPrecio]);

  return (
    <PurchaseModeContext.Provider value={{ tipoPrecio, setTipoPrecio }}>
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

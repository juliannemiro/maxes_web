"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface FavoritosContextType {
  favoritos: number[];
  isHydrated: boolean;
  toggleFavorito: (articuloId: number) => void;
  isFavorito: (articuloId: number) => boolean;
  getFavoritosCount: () => number;
}

const STORAGE_KEY = "maxes_favoritos";

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

export function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedFavoritos = window.localStorage.getItem(STORAGE_KEY);
      if (savedFavoritos) {
        const parsedFavoritos = JSON.parse(savedFavoritos);

        if (Array.isArray(parsedFavoritos)) {
          setFavoritos(
            parsedFavoritos.filter((id): id is number => Number.isInteger(id))
          );
        }
      }
    } catch (error) {
      console.error("Error loading favoritos from localStorage", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));
  }, [favoritos, isHydrated]);

  const toggleFavorito = (articuloId: number) => {
    setFavoritos((currentFavoritos) =>
      currentFavoritos.includes(articuloId)
        ? currentFavoritos.filter((id) => id !== articuloId)
        : [...currentFavoritos, articuloId]
    );
  };

  const isFavorito = (articuloId: number) => favoritos.includes(articuloId);

  const getFavoritosCount = () => favoritos.length;

  return (
    <FavoritosContext.Provider
      value={{
        favoritos,
        isHydrated,
        toggleFavorito,
        isFavorito,
        getFavoritosCount,
      }}
    >
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const context = useContext(FavoritosContext);
  if (context === undefined) {
    throw new Error("useFavoritos must be used within a FavoritosProvider");
  }
  return context;
}

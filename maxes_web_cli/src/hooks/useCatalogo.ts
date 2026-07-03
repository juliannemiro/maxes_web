"use client";

import { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";
import { Articulo, CarruselHome, Configuracion, Rubro } from "../types";
import { groupArticulosByCategoria, normalizeCatalogText } from "../lib/catalogo";
import { obtenerPrecio } from "../lib/obtenerPrecio";
import { usePurchaseMode } from "../context/PurchaseModeContext";

interface UseCatalogoResult {
  rubros: Rubro[];
  articulos: Articulo[];
  carruseles: CarruselHome[];
  config: Configuracion | null;
  search: string;
  setSearch: (value: string) => void;
  selectedRubro: number | undefined;
  setSelectedRubro: (value: number | undefined) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  isLoading: boolean;
  shouldGroupByRubro: boolean;
  groupedArticulos: Array<[string, Articulo[]]>;
  tipoCompra: "mayorista" | "minorista";
}

function getArticuloTimestamp(articulo: Articulo) {
  const time = new Date(articulo.fecha_publicacion).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareByRelevancia(a: Articulo, b: Articulo) {
  if (a.destacado !== b.destacado) {
    return a.destacado ? -1 : 1;
  }

  return getArticuloTimestamp(b) - getArticuloTimestamp(a);
}

export function useCatalogo(): UseCatalogoResult {
  const { tipoCompra } = usePurchaseMode();
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [carruseles, setCarruseles] = useState<CarruselHome[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState("default");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCatalogo() {
      setIsLoading(true);

      try {
        const [rubrosRes, carruselesRes, configRes, articulosRes] = await Promise.all([
          apiService.getRubros().catch(() => ({ rubros: [] })),
          apiService.getCarruseles().catch(() => ({ carruseles: [] })),
          apiService.getConfig().catch(() => ({ config: null })),
          apiService.getArticulos({ limit: 200 }).catch(() => ({
            articulos: [],
            pagination: { totalCount: 0, totalPages: 1, currentPage: 1, limit: 200 },
          })),
        ]);

        setRubros(rubrosRes.rubros);
        setCarruseles(carruselesRes.carruseles);
        setConfig("config" in configRes ? configRes.config : null);
        setArticulos(articulosRes.articulos);
      } catch (error) {
        console.error("Error loading catalog:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalogo();
  }, []);

  const filteredArticulos = useMemo(() => {
    const searchTerm = normalizeCatalogText(search.trim());

    const filtered = articulos.filter((articulo) => {
      const matchesSearch =
        !searchTerm ||
        normalizeCatalogText(articulo.descripcion_publica || "").includes(searchTerm) ||
        normalizeCatalogText(articulo.codigo || "").includes(searchTerm);

      const matchesCategory = !selectedRubro || articulo.rubro_id === selectedRubro;

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => obtenerPrecio(a, tipoCompra) - obtenerPrecio(b, tipoCompra));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => obtenerPrecio(b, tipoCompra) - obtenerPrecio(a, tipoCompra));
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => getArticuloTimestamp(b) - getArticuloTimestamp(a));
    } else {
      sorted.sort(compareByRelevancia);
    }

    return sorted;
  }, [articulos, search, selectedRubro, sortBy, tipoCompra]);

  const shouldGroupByRubro = Boolean(selectedRubro);
  const groupedArticulos = useMemo(
    () => (shouldGroupByRubro ? groupArticulosByCategoria(filteredArticulos) : []),
    [filteredArticulos, shouldGroupByRubro]
  );

  return {
    rubros,
    articulos: filteredArticulos,
    carruseles,
    config,
    search,
    setSearch,
    selectedRubro,
    setSelectedRubro,
    sortBy,
    setSortBy,
    isLoading,
    shouldGroupByRubro,
    groupedArticulos,
    tipoCompra,
  };
}

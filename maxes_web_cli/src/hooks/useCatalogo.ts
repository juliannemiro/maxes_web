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
  const [articulosIniciales, setArticulosIniciales] = useState<Articulo[]>([]);
  const [carruseles, setCarruseles] = useState<CarruselHome[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState("description");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCatalogo() {
      setIsLoading(true);

      try {
        const catalogoRes = await apiService.getCatalogoInicial();

        setRubros(catalogoRes.rubros);
        setCarruseles(catalogoRes.carruseles);
        setConfig(catalogoRes.config);
        setArticulos(catalogoRes.articulos);
        setArticulosIniciales(catalogoRes.articulos);
      } catch (error) {
        console.error("Error loading catalog:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalogo();
  }, []);

  useEffect(() => {
    const searchTerm = search.trim();

    if (!searchTerm && selectedRubro === undefined) {
      const resetTimeoutId = window.setTimeout(() => {
        setArticulos(articulosIniciales);
      }, 0);

      return () => window.clearTimeout(resetTimeoutId);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiService.getArticulos({
          rubro_id: selectedRubro,
          search: searchTerm || undefined,
          limit: 5000,
        });

        if (!controller.signal.aborted) {
          setArticulos(response.articulos);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error filtering catalog:", error);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [articulosIniciales, search, selectedRubro]);

  const filteredArticulos = useMemo(() => {
    const searchTerms = normalizeCatalogText(search.trim()).split(/\s+/).filter(Boolean);

    const filtered = articulos.filter((articulo) => {
      const searchableText = normalizeCatalogText([
        articulo.articulo_des,
        articulo.descripcion_publica,
        articulo.codigo,
      ].filter(Boolean).join(" "));
      const matchesSearch = searchTerms.every((term) => searchableText.includes(term));

      const matchesCategory = !selectedRubro || articulo.rubro_id === selectedRubro;

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => obtenerPrecio(a, tipoCompra) - obtenerPrecio(b, tipoCompra));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => obtenerPrecio(b, tipoCompra) - obtenerPrecio(a, tipoCompra));
    } else if (sortBy === "description") {
      sorted.sort((a, b) =>
        (a.descripcion_publica || a.codigo || "").localeCompare(
          b.descripcion_publica || b.codigo || "",
          "es",
          { sensitivity: "base" }
        )
      );
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

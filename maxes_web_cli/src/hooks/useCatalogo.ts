"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  isLoadingMore: boolean;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  shouldGroupByRubro: boolean;
  groupedArticulos: Array<[string, Articulo[]]>;
  tipoCompra: "mayorista" | "minorista";
}

interface UseCatalogoOptions {
  loadAll?: boolean;
}

const PAGE_SIZE = 50;
const ALL_ARTICLES_LIMIT = 5000;

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

export function useCatalogo({ loadAll = false }: UseCatalogoOptions = {}): UseCatalogoResult {
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [initialTotalCount, setInitialTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const activeQueryRef = useRef("");

  useEffect(() => {
    async function loadCatalogo() {
      setIsLoading(true);

      try {
        const catalogoRes = await apiService.getCatalogoInicial();

        setRubros(catalogoRes.rubros);
        setCarruseles(catalogoRes.carruseles);
        setConfig(catalogoRes.config);
        const articulosData = loadAll
          ? await apiService.getArticulos({ page: 1, limit: ALL_ARTICLES_LIMIT })
          : catalogoRes;

        setArticulos(articulosData.articulos);
        setArticulosIniciales(articulosData.articulos);
        setTotalCount(articulosData.pagination.totalCount);
        setInitialTotalCount(articulosData.pagination.totalCount);
      } catch (error) {
        console.error("Error loading catalog:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalogo();
  }, [loadAll]);

  useEffect(() => {
    const searchTerm = search.trim();
    const queryKey = `${selectedRubro ?? "all"}:${searchTerm}:${sortBy}:${tipoCompra}`;
    activeQueryRef.current = queryKey;

    if (!searchTerm && selectedRubro === undefined && sortBy === "description") {
      const resetTimeoutId = window.setTimeout(() => {
        setArticulos(articulosIniciales);
        setTotalCount(initialTotalCount);
        setCurrentPage(1);
      }, 0);

      return () => window.clearTimeout(resetTimeoutId);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiService.getArticulos({
          rubro_id: selectedRubro,
          search: searchTerm || undefined,
          page: 1,
          limit: loadAll ? ALL_ARTICLES_LIMIT : PAGE_SIZE,
          sort_by: sortBy,
          tipo_compra: tipoCompra,
        });

        if (!controller.signal.aborted && activeQueryRef.current === queryKey) {
          setArticulos(response.articulos);
          setTotalCount(response.pagination.totalCount);
          setCurrentPage(1);
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
  }, [articulosIniciales, initialTotalCount, loadAll, search, selectedRubro, sortBy, tipoCompra]);

  const hasMore = articulos.length < totalCount;
  const loadMore = useCallback(() => {
    if (loadAll || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const queryKey = activeQueryRef.current;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    void apiService.getArticulos({
      rubro_id: selectedRubro,
      search: search.trim() || undefined,
      page: nextPage,
      limit: PAGE_SIZE,
      sort_by: sortBy,
      tipo_compra: tipoCompra,
    }).then((response) => {
      if (activeQueryRef.current !== queryKey) {
        return;
      }

      setArticulos((current) => {
        const existingIds = new Set(current.map((articulo) => articulo.id));
        return [
          ...current,
          ...response.articulos.filter((articulo) => !existingIds.has(articulo.id)),
        ];
      });
      setTotalCount(response.pagination.totalCount);
      setCurrentPage(nextPage);
    }).catch((error) => {
      console.error("Error loading more catalog articles:", error);
    }).finally(() => {
      if (activeQueryRef.current === queryKey) {
        setIsLoadingMore(false);
      }
    });
  }, [currentPage, hasMore, isLoading, isLoadingMore, loadAll, search, selectedRubro, sortBy, tipoCompra]);

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
    isLoadingMore,
    totalCount,
    hasMore,
    loadMore,
    shouldGroupByRubro,
    groupedArticulos,
    tipoCompra,
  };
}

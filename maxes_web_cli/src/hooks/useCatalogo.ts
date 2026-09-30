"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiService } from "@/services/api";
import { Articulo, CarruselHome, CategoriaDetalle, Configuracion, Categoria } from "@/types";
import { groupArticulosByCategoria, normalizeCatalogText } from "@/utils/catalogo";
import { obtenerPrecio } from "@/utils/precio";
import { usePurchaseMode } from "@/context/PurchaseModeContext";

interface UseCatalogoResult {
  categorias: Categoria[];
  categoriaDetalles: CategoriaDetalle[];
  articulos: Articulo[];
  carruseles: CarruselHome[];
  config: Configuracion | null;
  search: string;
  setSearch: (value: string) => void;
  selectedCategoria: number | undefined;
  setSelectedCategoria: (value: number | undefined) => void;
  selectedCategoriaDetalle: number | undefined;
  setSelectedCategoriaDetalle: (value: number | undefined) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  shouldGroupByCategoria: boolean;
  groupedArticulos: Array<[string, Articulo[]]>;
  tipoPrecio: "mayorista" | "minorista";
}

interface UseCatalogoOptions {
  loadAll?: boolean;
}

const PAGE_SIZE = 50;
const ALL_ARTICLES_LIMIT = 5000;
const CATALOG_FILTERS_STORAGE_KEY = "maxes_catalog_filters_v1";

type StoredCatalogFilters = { search?: string; selectedCategoria?: number; selectedCategoriaDetalle?: number; sortBy?: string };

function storedCatalogFilters(): StoredCatalogFilters {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(CATALOG_FILTERS_STORAGE_KEY) || "{}") as StoredCatalogFilters;
    return {
      search: typeof value.search === "string" ? value.search : "",
      selectedCategoria: Number.isInteger(value.selectedCategoria) && Number(value.selectedCategoria) > 0 ? Number(value.selectedCategoria) : undefined,
      selectedCategoriaDetalle: Number.isInteger(value.selectedCategoriaDetalle) && Number(value.selectedCategoriaDetalle) > 0 ? Number(value.selectedCategoriaDetalle) : undefined,
      sortBy: typeof value.sortBy === "string" ? value.sortBy : "description",
    };
  } catch {
    return {};
  }
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

export function useCatalogo({ loadAll = false }: UseCatalogoOptions = {}): UseCatalogoResult {
  const { tipoPrecio } = usePurchaseMode();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaDetalles, setCategoriaDetalles] = useState<CategoriaDetalle[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [articulosIniciales, setArticulosIniciales] = useState<Articulo[]>([]);
  const [carruseles, setCarruseles] = useState<CarruselHome[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<number | undefined>(undefined);
  const [selectedCategoriaDetalle, setSelectedCategoriaDetalle] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState("description");
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [initialTotalCount, setInitialTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const activeQueryRef = useRef("");

  useEffect(() => {
    const filters = storedCatalogFilters();
    setSearch(filters.search || "");
    setSelectedCategoria(filters.selectedCategoria);
    setSelectedCategoriaDetalle(filters.selectedCategoriaDetalle);
    setSortBy(filters.sortBy || "description");
    setFiltersRestored(true);
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    window.localStorage.setItem(CATALOG_FILTERS_STORAGE_KEY, JSON.stringify({ search, selectedCategoria, selectedCategoriaDetalle, sortBy }));
  }, [filtersRestored, search, selectedCategoria, selectedCategoriaDetalle, sortBy]);

  useEffect(() => {
    async function loadCatalogo() {
      setIsLoading(true);

      try {
        const catalogoRes = await apiService.getCatalogoInicial();

        setCategorias(catalogoRes.categorias);
        setCategoriaDetalles(catalogoRes.categoria_detalles);
        setCarruseles(catalogoRes.carruseles);
        setConfig(catalogoRes.config);
        // Los filtros se conservan entre visitas, pero un catálogo puede
        // cambiar de ambiente o despublicar una categoría/detalle. No dejar
        // que un ID obsoleto o incompatible oculte todos los artículos.
        setSelectedCategoria((actual) => {
          if (actual === undefined || catalogoRes.categorias.some((categoria) => categoria.id === actual)) {
            return actual;
          }
          return undefined;
        });
        setSelectedCategoriaDetalle((actual) => {
          if (actual === undefined) return actual;
          const detalle = catalogoRes.categoria_detalles.find(
            (item) => item.categoriaDetalleOrigenId === actual
          );
          if (!detalle) return undefined;
          return selectedCategoria === undefined || detalle.categoriaOrigenId === selectedCategoria
            ? actual
            : undefined;
        });
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
    const queryKey = `${selectedCategoria ?? "all"}:${selectedCategoriaDetalle ?? "all"}:${searchTerm}:${sortBy}:${tipoPrecio}`;
    activeQueryRef.current = queryKey;

    if (!searchTerm && selectedCategoria === undefined && selectedCategoriaDetalle === undefined && sortBy === "description") {
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
          categoria_id: selectedCategoria,
          categoria_detalle_id: selectedCategoriaDetalle,
          search: searchTerm || undefined,
          page: 1,
          limit: loadAll ? ALL_ARTICLES_LIMIT : PAGE_SIZE,
          sort_by: sortBy,
          tipo_precio: tipoPrecio,
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
  }, [articulosIniciales, initialTotalCount, loadAll, search, selectedCategoria, selectedCategoriaDetalle, sortBy, tipoPrecio]);

  const hasMore = articulos.length < totalCount;
  const loadMore = useCallback(() => {
    if (loadAll || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const queryKey = activeQueryRef.current;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    void apiService.getArticulos({
      categoria_id: selectedCategoria,
      categoria_detalle_id: selectedCategoriaDetalle,
      search: search.trim() || undefined,
      page: nextPage,
      limit: PAGE_SIZE,
      sort_by: sortBy,
      tipo_precio: tipoPrecio,
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
  }, [currentPage, hasMore, isLoading, isLoadingMore, loadAll, search, selectedCategoria, selectedCategoriaDetalle, sortBy, tipoPrecio]);

  const filteredArticulos = useMemo(() => {
    const searchTerms = normalizeCatalogText(search.trim()).split(/\s+/).filter(Boolean);

    const filtered = articulos.filter((articulo) => {
      const searchableText = normalizeCatalogText([
        articulo.articulo_des,
        articulo.descripcion_publica,
        articulo.codigo,
      ].filter(Boolean).join(" "));
      const matchesSearch = searchTerms.every((term) => searchableText.includes(term));

      const matchesCategory = !selectedCategoria || articulo.categoria_id === selectedCategoria;
      const matchesDetail = !selectedCategoriaDetalle || articulo.categoria_detalle_id === selectedCategoriaDetalle;

      return matchesSearch && matchesCategory && matchesDetail;
    });

    const sorted = [...filtered];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => obtenerPrecio(a, tipoPrecio) - obtenerPrecio(b, tipoPrecio));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => obtenerPrecio(b, tipoPrecio) - obtenerPrecio(a, tipoPrecio));
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
  }, [articulos, search, selectedCategoria, selectedCategoriaDetalle, sortBy, tipoPrecio]);

  const shouldGroupByCategoria = Boolean(selectedCategoria);
  const groupedArticulos = useMemo(
    () => (shouldGroupByCategoria ? groupArticulosByCategoria(filteredArticulos) : []),
    [filteredArticulos, shouldGroupByCategoria]
  );

  return {
    categorias,
    categoriaDetalles,
    articulos: filteredArticulos,
    carruseles,
    config,
    search,
    setSearch,
    selectedCategoria,
    setSelectedCategoria,
    selectedCategoriaDetalle,
    setSelectedCategoriaDetalle,
    sortBy,
    setSortBy,
    isLoading,
    isLoadingMore,
    totalCount,
    hasMore,
    loadMore,
    shouldGroupByCategoria,
    groupedArticulos,
    tipoPrecio,
  };
}

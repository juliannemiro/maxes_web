"use client";

import { useEffect, useRef, useState } from "react";
import Carrusel from "@/components/catalogo/Carrusel";
import CatalogNavigation from "@/components/catalogo/CatalogNavigation";
import ProductoCard from "@/components/catalogo/ProductoCard";
import CartDrawer from "@/components/pedido/CartDrawer";
import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import FloatingActions from "@/components/layout/FloatingActions";
import Footer from "@/components/layout/Footer";
import { useCatalogo } from "@/hooks/useCatalogo";
import { apiService } from "@/services/api";
import { Articulo } from "@/types";
import ProductoModal from "@/components/catalogo/ProductoModal";

interface CatalogoHomeProps {
  sharedArticuloCodigo?: string;
}

export default function CatalogoHome({ sharedArticuloCodigo }: CatalogoHomeProps = {}) {
  const [sharedArticulo, setSharedArticulo] = useState<Articulo | null>(null);
  const [novedadesActive, setNovedadesActive] = useState(false);
  const {
    categorias,
    categoriaDetalles,
    articulos,
    carruseles,
    config,
    search,
    setSearch,
    selectedCategoria,
    setSelectedCategoria,
    selectedCategoriaDetalle,
    setSelectedCategoriaDetalle,
    featuredOnly,
    setFeaturedOnly,
    sortBy,
    setSortBy,
    isLoading,
    isLoadingMore,
    totalCount,
    hasMore,
    loadMore,
  } = useCatalogo();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const selectedCategoriaName =
    categorias.find((categoria) => categoria.id === selectedCategoria)?.nombre ||
    categorias.find((categoria) => categoria.id === selectedCategoria)?.codigo ||
    "";
  const detallesDisponibles = categoriaDetalles.filter(
    (detalle) => selectedCategoria === undefined || detalle.categoriaOrigenId === selectedCategoria
  );
  const selectedDetalleName = detallesDisponibles.find(
    (detalle) => detalle.categoriaDetalleOrigenId === selectedCategoriaDetalle
  )?.nombre || "";
  const sortOptions = [
    { value: "price_asc", label: "Menor precio" },
    { value: "price_desc", label: "Mayor precio" },
    { value: "description", label: "Descripción" },
  ];

  useEffect(() => {
    if (!sharedArticuloCodigo) {
      return;
    }

    let active = true;
    void apiService.getArticuloByCodigo(sharedArticuloCodigo).then(({ articulo }) => {
      if (active) {
        setSharedArticulo(articulo);
      }
    }).catch((error) => {
      console.error("Error loading shared article:", error);
    });

    return () => {
      active = false;
    };
  }, [sharedArticuloCodigo]);

  const closeSharedArticulo = () => {
    setSharedArticulo(null);
    if (sharedArticuloCodigo) {
      window.history.replaceState(null, "", "/");
    }
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleSelectCategoria = (categoriaId: number | undefined) => {
    setSelectedCategoria(categoriaId);
    setSelectedCategoriaDetalle(undefined);
  };

  const handleSelectCategoriaDetalle = (categoriaDetalleId: number | undefined) => {
    setSelectedCategoriaDetalle(categoriaDetalleId);
  };

  const handleToggleNovedades = () => {
    const nextNovedadesActive = !novedadesActive;
    setNovedadesActive(nextNovedadesActive);
    setSortBy(nextNovedadesActive ? "newest" : featuredOnly ? "relevance" : "description");
  };

  const handleToggleDestacados = () => {
    const nextFeaturedOnly = !featuredOnly;
    setFeaturedOnly(nextFeaturedOnly);
    setSortBy(novedadesActive ? "newest" : nextFeaturedOnly ? "relevance" : "description");
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategoria(undefined);
    setSelectedCategoriaDetalle(undefined);
    setFeaturedOnly(false);
    setNovedadesActive(false);
    setSortBy("description");
  };

  const handleRemoveNovedades = () => {
    setNovedadesActive(false);
    setSortBy(featuredOnly ? "relevance" : "description");
  };

  const handleRemoveDestacados = () => {
    setFeaturedOnly(false);
    setSortBy(novedadesActive ? "newest" : "description");
  };

  const activeFilters = [
    novedadesActive ? { id: "novedades", label: "Novedades", onRemove: handleRemoveNovedades } : null,
    featuredOnly ? { id: "destacados", label: "Destacados", onRemove: handleRemoveDestacados } : null,
    selectedCategoriaName ? { id: "categoria", label: selectedCategoriaName, onRemove: () => handleSelectCategoria(undefined) } : null,
    selectedDetalleName ? { id: "subcategoria", label: selectedDetalleName, onRemove: () => handleSelectCategoriaDetalle(undefined) } : null,
    search.trim() ? { id: "busqueda", label: search.trim(), onRemove: () => setSearch("") } : null,
  ].filter((filter): filter is { id: string; label: string; onRemove: () => void } => filter !== null);
  if (config?.mantenimiento) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
        <div className="max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-[var(--color-foreground)]">Sitio en mantenimiento</h1>
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            Estamos actualizando el catálogo. Volvé a intentar en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="top" className="min-h-screen bg-[var(--color-background)]">
      <TopBar
        direccionLocal={config?.direccion_local}
        whatsappContact={config?.whatsapp_contacto}
      />

      <Header search={search} onSearch={setSearch} onSearchSubmit={setSearch} showCart />

      <CatalogNavigation
        categorias={categorias}
        categoriaDetalles={categoriaDetalles}
        selectedCategoria={selectedCategoria}
        selectedCategoriaDetalle={selectedCategoriaDetalle}
        novedadesActive={novedadesActive}
        destacadosActive={featuredOnly}
        onSelectCategoria={handleSelectCategoria}
        onSelectCategoriaDetalle={handleSelectCategoriaDetalle}
        onToggleNovedades={handleToggleNovedades}
        onToggleDestacados={handleToggleDestacados}
        onReset={handleResetFilters}
      />

      <section className="px-3 pt-4 sm:px-4 sm:pt-6">
        <Carrusel carruseles={carruseles} />
      </section>

      <main id="catalogo-productos" className="w-full scroll-mt-36 px-3 pb-16 pt-5 sm:px-4 sm:pt-8 xl:px-6">
        <div className="mb-4 border-y border-black/10 bg-[var(--color-primary)] px-3 py-3 text-[var(--color-primary-foreground)] shadow-sm sm:mb-6 sm:px-4 sm:py-2">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeFilters.length === 0 ? (
                <h1 className="shrink-0 whitespace-nowrap text-sm font-black uppercase leading-tight text-[var(--color-foreground)] sm:text-base">
                  Catálogo completo
                  <span className="ml-1 text-xs font-bold text-black/65 sm:hidden">({totalCount} art.)</span>
                  <span className="ml-2 hidden text-sm font-bold text-black/65 sm:inline">({totalCount} artículos)</span>
                </h1>
              ) : (
                <>
                  <p className="shrink-0 whitespace-nowrap text-sm font-black uppercase leading-tight text-[var(--color-foreground)] sm:text-base">Filtros aplicados</p>
                  {activeFilters.map((filter) => (
                    <button key={filter.id} type="button" onClick={filter.onRemove} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-black/15 bg-white/80 px-2.5 text-xs font-bold text-[var(--color-foreground)] transition hover:bg-white">
                      <span>{filter.label}</span>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                    </button>
                  ))}
                </>
              )}
            </div>

            <div className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto sm:gap-2">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-black/65 sm:block">
                Ordenar
              </p>
              <select
                aria-label="Ordenar"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-black/15 bg-white/80 px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none sm:hidden"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="hidden flex-wrap items-center overflow-hidden rounded-md border border-black/15 bg-white/45 sm:flex">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortBy(option.value)}
                    className={`h-9 px-3 text-sm font-semibold transition ${
                      sortBy === option.value
                        ? "bg-black text-white"
                        : "text-[var(--color-foreground)] hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-[430px] animate-pulse rounded-lg border border-[var(--color-border)] bg-white p-4" />
            ))}
          </div>
        ) : articulos.length === 0 ? (
          <p className="py-16 text-center text-[var(--color-muted-foreground)]">
            No se encontraron productos para tu búsqueda.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              {articulos.map((articulo) => (
                <ProductoCard key={articulo.id} articulo={articulo} />
              ))}
            </div>
            <div ref={loadMoreRef} className="flex min-h-24 items-center justify-center py-6">
              {isLoadingMore && (
                <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
                  Cargando más productos...
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <CartDrawer />
      <FloatingActions whatsappContact={config?.whatsapp_contacto} />
      <Footer direccionLocal={config?.direccion_local} telefono={config?.whatsapp_contacto} />
      {sharedArticulo && (
        <ProductoModal articulo={sharedArticulo} isOpen onClose={closeSharedArticulo} />
      )}
    </div>
  );
}

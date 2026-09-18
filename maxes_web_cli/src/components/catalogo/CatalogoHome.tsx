"use client";

import { useEffect, useRef, useState } from "react";
import Carrusel from "@/components/catalogo/Carrusel";
import CategoryCarousel from "@/components/catalogo/CategoryCarousel";
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
  const {
    rubros,
    articulos,
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
  } = useCatalogo();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const selectedRubroName =
    rubros.find((rubro) => rubro.id === selectedRubro)?.nombre ||
    rubros.find((rubro) => rubro.id === selectedRubro)?.codigo ||
    "";
  const activeFilterLabel = [selectedRubroName.toUpperCase(), search.trim()]
    .filter(Boolean)
    .join(" · ") || "TODOS LOS ARTICULOS";
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

  const handleSelectRubro = (rubroId: number | undefined) => {
    setSelectedRubro(rubroId);

    window.setTimeout(() => {
      document.getElementById("catalogo-productos")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

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

      <Header
        search={search}
        onSearch={setSearch}
        rubros={rubros}
        selectedRubro={selectedRubro}
        onSelectRubro={handleSelectRubro}
        showCart
      />

      <section className="px-4 pt-6">
        <Carrusel carruseles={carruseles} />
      </section>

      <section className="mt-6">
        <CategoryCarousel
          rubros={rubros}
          selectedRubro={selectedRubro}
          onSelect={handleSelectRubro}
        />
      </section>

      <main id="catalogo-productos" className="w-full scroll-mt-36 px-4 pb-16 pt-8 xl:px-6">
        <div className="mb-6 border-y border-black/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-primary-foreground)] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black uppercase leading-tight text-[var(--color-foreground)] sm:text-xl lg:text-2xl">
                {activeFilterLabel}
                <span className="ml-1 whitespace-nowrap text-xs font-bold text-black/65 sm:hidden">
                  ({totalCount} Art.)
                </span>
                <span className="ml-2 hidden whitespace-nowrap text-base font-bold text-black/65 sm:inline">
                  ({totalCount} artículos)
                </span>
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-black/65 sm:block">
                Ordenar
              </p>
              <select
                aria-label="Ordenar"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 w-[7.5rem] rounded-md border border-black/15 bg-white/70 px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none sm:hidden"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

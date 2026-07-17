"use client";

import Link from "next/link";
import CartDrawer from "../../components/pedido/CartDrawer";
import FloatingActions from "../../components/layout/FloatingActions";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import TopBar from "../../components/layout/TopBar";
import ProductoCard from "../../components/catalogo/ProductoCard";
import { useFavoritos } from "../../context/FavoritosContext";
import { useCatalogo } from "../../hooks/useCatalogo";

export default function FavoritosPage() {
  const {
    rubros,
    articulos,
    config,
    search,
    setSearch,
    selectedRubro,
    setSelectedRubro,
    sortBy,
    setSortBy,
    isLoading,
  } = useCatalogo({ loadAll: true });
  const { favoritos, isHydrated } = useFavoritos();
  const favoritosSet = new Set(favoritos);
  const favoritosFiltrados = articulos.filter((articulo) => favoritosSet.has(articulo.id));
  const hasFavoritos = isHydrated && favoritos.length > 0;
  const sortOptions = [
    { value: "price_asc", label: "Menor precio" },
    { value: "price_desc", label: "Mayor precio" },
    { value: "description", label: "Descripción" },
  ];

  const clearFilters = () => {
    setSearch("");
    setSelectedRubro(undefined);
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
        onSelectRubro={setSelectedRubro}
        showCart
      />

      <main className="w-full px-4 pb-16 pt-8 xl:px-6">
        <div className="mb-6 border-y border-black/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-primary-foreground)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black uppercase leading-tight text-[var(--color-foreground)] sm:text-xl lg:text-2xl">
                Mis favoritos
                <span className="ml-1 whitespace-nowrap text-xs font-bold text-black/65 sm:hidden">
                  ({favoritosFiltrados.length} Art.)
                </span>
                <span className="ml-2 hidden whitespace-nowrap text-base font-bold text-black/65 sm:inline">
                  ({favoritosFiltrados.length} artículos)
                </span>
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-black/65 sm:block">
                Ordenar
              </p>
              <select
                aria-label="Ordenar favoritos"
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
              <Link
                href="/"
                className="hidden h-9 items-center rounded-md border border-black/15 bg-white/45 px-3 text-sm font-bold text-[var(--color-foreground)] transition hover:bg-white lg:inline-flex"
              >
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>

        {isLoading || !isHydrated ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[430px] animate-pulse rounded-lg border border-[var(--color-border)] bg-white p-4" />
            ))}
          </div>
        ) : !hasFavoritos ? (
          <div className="py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-foreground)]">
              Todavía no guardaste favoritos.
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Tocá el corazón amarillo de un producto para armar tu lista.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-foreground)] transition hover:brightness-95"
            >
              Ir al catálogo
            </Link>
          </div>
        ) : favoritosFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-foreground)]">
              No se encontraron favoritos con esos filtros.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-foreground)] transition hover:brightness-95"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoritosFiltrados.map((articulo) => (
              <ProductoCard key={articulo.id} articulo={articulo} />
            ))}
          </div>
        )}
      </main>

      <CartDrawer />
      <FloatingActions whatsappContact={config?.whatsapp_contacto} />
      <Footer direccionLocal={config?.direccion_local} telefono={config?.whatsapp_contacto} />
    </div>
  );
}

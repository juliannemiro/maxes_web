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
    isLoading,
  } = useCatalogo();
  const { favoritos, isHydrated } = useFavoritos();
  const favoritosSet = new Set(favoritos);
  const favoritosFiltrados = articulos.filter((articulo) => favoritosSet.has(articulo.id));
  const hasFavoritos = isHydrated && favoritos.length > 0;

  const handleSearch = (value: string) => {
    setSearch(value);

    if (value.trim()) {
      setSelectedRubro(undefined);
    }
  };

  const handleSelectRubro = (rubroId: number | undefined) => {
    setSelectedRubro(rubroId);
    setSearch("");
  };

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
        onSearch={handleSearch}
        rubros={rubros}
        selectedRubro={selectedRubro}
        onSelectRubro={handleSelectRubro}
        showCart
      />

      <main className="w-full px-4 pb-16 pt-8 xl:px-6">
        <div className="mb-6 border-y border-black/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-primary-foreground)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-black uppercase leading-tight text-[var(--color-foreground)] sm:text-xl lg:text-2xl">
                Mis favoritos
                <span className="ml-2 text-base font-bold text-black/65">
                  ({favoritosFiltrados.length} artículos)
                </span>
              </h1>
            </div>

            <Link
              href="/"
              className="rounded-md bg-black px-3 py-2 text-sm font-bold text-white transition hover:bg-black/85"
            >
              Ver catálogo
            </Link>
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

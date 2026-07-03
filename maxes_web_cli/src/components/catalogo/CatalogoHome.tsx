"use client";

import Carrusel from "./Carrusel";
import CategoryCarousel from "./CategoryCarousel";
import ProductoCard from "./ProductoCard";
import CartDrawer from "../pedido/CartDrawer";
import TopBar from "../layout/TopBar";
import Header from "../layout/Header";
import FloatingActions from "../layout/FloatingActions";
import Footer from "../layout/Footer";
import { useCatalogo } from "../../hooks/useCatalogo";
import { usePurchaseMode } from "../../context/PurchaseModeContext";

export default function CatalogoHome() {
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
    shouldGroupByRubro,
    groupedArticulos,
    tipoCompra,
  } = useCatalogo();
  const { setTipoCompra } = usePurchaseMode();

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

      <section className="px-4 pt-6">
        <Carrusel carruseles={carruseles} />
      </section>

      <section className="mt-6">
        <CategoryCarousel rubros={rubros} onSelect={setSelectedRubro} />
      </section>

      <main className="w-full px-4 pb-16 pt-8 xl:px-6">
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {search ? `Resultados para "${search}"` : ""}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="tipoCompra" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                Compra
              </label>
              <select
                id="tipoCompra"
                value={tipoCompra}
                onChange={(e) => setTipoCompra(e.target.value as "mayorista" | "minorista")}
                className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
              >
                <option value="mayorista">Mayorista</option>
                <option value="minorista">Minorista</option>
              </select>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="sortBy" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                Ordenar
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
              >
                <option value="default">Relevancia</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="newest">Más nuevos</option>
              </select>
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
        ) : !shouldGroupByRubro ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {articulos.map((articulo) => (
              <ProductoCard key={articulo.id} articulo={articulo} />
            ))}
          </div>
        ) : (
          groupedArticulos.map(([category, items]) => (
            <div key={category} className="mb-10">
              <h2 className="mb-4 rounded bg-[var(--color-primary)] px-4 py-2 text-lg font-black uppercase tracking-wide text-[var(--color-primary-foreground)]">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((articulo) => (
                  <ProductoCard key={articulo.id} articulo={articulo} />
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <CartDrawer />
      <FloatingActions whatsappContact={config?.whatsapp_contacto} />
      <Footer direccionLocal={config?.direccion_local} telefono={config?.whatsapp_contacto} />
    </div>
  );
}

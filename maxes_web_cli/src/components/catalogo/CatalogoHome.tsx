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
  } = useCatalogo();
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
                  ({articulos.length} Art.)
                </span>
                <span className="ml-2 hidden whitespace-nowrap text-base font-bold text-black/65 sm:inline">
                  ({articulos.length} artículos)
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {articulos.map((articulo) => (
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

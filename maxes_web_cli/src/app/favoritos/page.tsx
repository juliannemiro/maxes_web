"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CartDrawer from "@/components/pedido/CartDrawer";
import FloatingActions from "@/components/layout/FloatingActions";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TopBar from "@/components/layout/TopBar";
import ProductoModal from "@/components/catalogo/ProductoModal";
import CantidadSelector from "@/components/common/CantidadSelector";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useCart } from "@/context/CartContext";
import { useFavoritos } from "@/context/FavoritosContext";
import { setPendingCatalogSearch, useCatalogo } from "@/hooks/useCatalogo";
import { usePurchaseMode } from "@/context/PurchaseModeContext";
import { Articulo } from "@/types";
import { altImagenArticulo } from "@/utils/articuloImagen";
import { formatPrice, obtenerPrecio } from "@/utils/precio";
import { useEffect, useRef, useState } from "react";
import { trackFavoriteEvent } from "@/services/analytics/client";

export default function FavoritosPage() {
  const panelViewTracked = useRef(false);
  const router = useRouter();
  const [headerSearch, setHeaderSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null);
  const {
    articulos,
    config,
    setSelectedCategoria,
    sortBy,
    setSortBy,
    isLoading,
  } = useCatalogo({ loadAll: true, restoreFilters: false });
  const { favoritos, isHydrated, toggleFavorito } = useFavoritos();
  const { addToCart, cart } = useCart();
  const { tipoPrecio } = usePurchaseMode();
  const favoritosSet = new Set(favoritos);
  const favoritosFiltrados = articulos.filter((articulo) => favoritosSet.has(articulo.id));
  const hasFavoritos = isHydrated && favoritos.length > 0;
  const sortOptions = [
    { value: "price_asc", label: "Menor precio" },
    { value: "price_desc", label: "Mayor precio" },
    { value: "description", label: "Descripción" },
  ];

  useEffect(() => {
    if (!isHydrated || panelViewTracked.current) {
      return;
    }

    panelViewTracked.current = true;
    void trackFavoriteEvent({
      accion: "panel_visto",
      origen: "panel_favoritos",
      cantidad_favoritos: favoritos.length,
    }).catch(() => undefined);
  }, [favoritos.length, isHydrated]);

  const clearFilters = () => {
    setSelectedCategoria(undefined);
  };

  const handleCatalogSearch = (term: string) => {
    setPendingCatalogSearch(term);
    router.push("/");
  };

  const handleQuantityChange = (articuloId: number, value: string) => {
    setQuantities((current) => ({
      ...current,
      [articuloId]: value.replace(/\D/g, ""),
    }));
  };

  const handleQuantityStep = (articuloId: number, step: number) => {
    setQuantities((current) => {
      const currentValue = Number.parseInt(current[articuloId] || "1", 10) || 1;
      return {
        ...current,
        [articuloId]: String(Math.max(1, currentValue + step)),
      };
    });
  };

  const handleAddToCart = (articulo: Articulo) => {
    const quantity = Number.parseInt(quantities[articulo.id] || "1", 10) || 1;
    addToCart(articulo, Math.max(1, quantity));
    setQuantities((current) => ({ ...current, [articulo.id]: "1" }));
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
        search={headerSearch}
        onSearch={setHeaderSearch}
        onSearchSubmit={handleCatalogSearch}
        showCart
      />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
        <div className="mb-5 rounded-xl border border-black/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-primary-foreground)] shadow-sm sm:px-5">
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
          <div className="space-y-3" aria-label="Cargando favoritos">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[178px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-white sm:h-[196px]" />
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
          <div className="space-y-3">
            {favoritosFiltrados.map((articulo) => {
              const title =
                articulo.articulo_des?.trim() ||
                articulo.descripcion_publica?.trim() ||
                "Producto sin descripción";
              const quantity = Number.parseInt(quantities[articulo.id] || "1", 10) || 1;
              const unitPrice = obtenerPrecio(articulo, tipoPrecio);
              const cartQuantity = cart.find((item) => item.articulo.id === articulo.id)?.cantidad;

              return (
                <article
                  key={articulo.id}
                  className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[0_3px_12px_rgba(0,0,0,0.05)] transition hover:border-amber-300 hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)] sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5 sm:p-4 lg:grid-cols-[160px_minmax(0,1fr)_minmax(280px,340px)]"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedArticulo(articulo)}
                    aria-label={`Ver detalle de ${title}`}
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white transition hover:border-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:h-[150px] sm:w-[150px] lg:h-40 lg:w-40"
                  >
                    <OptimizedImage
                      src={articulo.imagen_url || "/placeholder.svg"}
                      alt={altImagenArticulo(articulo, "Producto favorito")}
                      width={160}
                      height={160}
                      sizes="(max-width: 639px) 96px, 160px"
                      className="h-full w-full object-contain p-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedArticulo(articulo)}
                    className="min-w-0 self-center text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  >
                    {articulo.marca_des && (
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {articulo.marca_des}
                      </p>
                    )}
                    <h2 className="text-base font-bold leading-snug text-[var(--color-foreground)] sm:text-xl">
                      {title}
                    </h2>
                    <p className="mt-2 text-xl font-black text-[var(--color-foreground)] sm:text-2xl">
                      {formatPrice(unitPrice)}
                    </p>
                    {cartQuantity ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        {cartQuantity} {cartQuantity === 1 ? "unidad" : "unidades"} en el carrito
                      </p>
                    ) : null}
                  </button>

                  <div className="col-span-2 border-t border-slate-100 pt-3 lg:col-span-1 lg:flex lg:min-h-40 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                          Cantidad
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-700">
                          Total: {formatPrice(unitPrice * quantity)}
                        </p>
                      </div>
                      <CantidadSelector
                        value={quantities[articulo.id] || "1"}
                        onChange={(value) => handleQuantityChange(articulo.id, value)}
                        onDecrement={() => handleQuantityStep(articulo.id, -1)}
                        onIncrement={() => handleQuantityStep(articulo.id, 1)}
                        ariaLabel={`Cantidad para ${title}`}
                        className="w-[112px] border-slate-200 bg-slate-50"
                        buttonClassName="px-2 py-2 text-sm hover:bg-amber-100"
                        valueClassName="px-1 text-sm"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorito(articulo.id)}
                        aria-label={`Eliminar ${title} de favoritos`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(articulo)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-center text-sm font-black text-[var(--color-primary-foreground)] transition hover:brightness-95"
                      >
                        Agregar al carrito
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <CartDrawer />
      {selectedArticulo && (
        <ProductoModal
          articulo={selectedArticulo}
          isOpen
          onClose={() => setSelectedArticulo(null)}
        />
      )}
      <FloatingActions whatsappContact={config?.whatsapp_contacto} />
      <Footer direccionLocal={config?.direccion_local} telefono={config?.whatsapp_contacto} />
    </div>
  );
}

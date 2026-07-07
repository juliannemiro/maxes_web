"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "../../context/CartContext";
import { useFavoritos } from "../../context/FavoritosContext";
import { Rubro } from "../../types";

interface HeaderProps {
  search?: string;
  onSearch?: (term: string) => void;
  rubros?: Rubro[];
  selectedRubro?: number;
  onSelectRubro?: (id: number | undefined) => void;
  whatsappContact?: string;
  direccionLocal?: string;
  showCart?: boolean;
}

export default function Header({
  search = "",
  onSearch,
  rubros = [],
  selectedRubro,
  onSelectRubro,
  showCart = false,
}: HeaderProps) {
  const { getItemCount, isHydrated, setOpen } = useCart();
  const {
    getFavoritosCount,
    isHydrated: favoritosHydrated,
  } = useFavoritos();
  const sortedRubros = useMemo(
    () =>
      [...rubros].sort((a, b) =>
        (a.nombre || a.codigo || "").localeCompare(b.nombre || b.codigo || "", "es", {
          sensitivity: "base",
        })
      ),
    [rubros]
  );
  const cartCount = isHydrated ? getItemCount() : 0;
  const favoritosCount = favoritosHydrated ? getFavoritosCount() : 0;
  const controlsGridClass = showCart
    ? "grid min-w-0 grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_64px] md:gap-4 lg:gap-6"
    : "grid min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-2 md:gap-4 lg:gap-6";
  const searchWrapperClass = showCart
    ? "min-w-0 md:order-1 md:col-auto"
    : "col-span-full min-w-0 md:order-1 md:col-auto";

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-foreground)] shadow-md">
      <div className="grid w-full grid-cols-1 gap-3 px-4 py-4 md:py-5 xl:px-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:py-[1.65rem]">
        <Link href="/" className="mx-auto flex shrink-0 flex-col items-center leading-none lg:mx-0 lg:items-start">
          <span className="text-3xl font-black tracking-tight text-[var(--color-header-foreground)]">
            M<span className="text-[var(--color-primary)]">@</span>XES
          </span>
          <span className="text-center text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] lg:text-left">
            Tus insumos en un solo lugar
          </span>
        </Link>

        <div className={controlsGridClass}>
          {onSelectRubro && (
            <div className="min-w-0 md:order-2 md:col-auto col-span-full">
              <label
                htmlFor="header-rubro"
                className="sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]"
              >
                Buscar por categoría
              </label>
              <div className="relative flex h-11 w-full items-center overflow-hidden rounded-md border border-transparent bg-white">
                <select
                  id="header-rubro"
                  value={selectedRubro ?? "__all__"}
                  onChange={(e) => onSelectRubro(e.target.value === "__all__" ? undefined : Number(e.target.value))}
                  aria-label="Buscar por categoría"
                  className="h-full w-full appearance-none bg-transparent px-4 pr-14 text-sm font-medium text-[var(--color-foreground)] outline-none"
                >
                  <option value="__all__">Todas las categorías</option>
                  {sortedRubros.map((rubro) => (
                    <option key={rubro.id} value={rubro.id}>
                      {rubro.nombre || rubro.codigo}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-[var(--color-primary)] px-3 text-[var(--color-primary-foreground)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </div>
          )}

          {onSearch && (
            <div className={searchWrapperClass}>
              <label
                htmlFor="header-search"
                className="sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]"
              >
                Buscar artículo
              </label>
              <div className="flex h-11 w-full items-center overflow-hidden rounded-md border border-transparent bg-white">
                <input
                  id="header-search"
                  type="search"
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="Buscá tu producto"
                  aria-label="Buscar artículo"
                  className="h-full w-full min-w-0 bg-transparent px-3 text-sm font-medium text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] sm:px-4"
                />
                <span className="flex h-full items-center bg-[var(--color-primary)] px-2 text-[var(--color-primary-foreground)] sm:px-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
              </div>
            </div>
          )}

          {showCart && (
            <div className="col-start-2 min-w-0 md:order-3 md:col-start-auto">
              <label className="sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]">
                Favoritos
              </label>
              <Link
                href="/favoritos"
                aria-label="Ver favoritos"
                className="relative flex h-11 w-full items-center justify-center rounded-md border border-transparent bg-white text-[var(--color-foreground)] transition hover:brightness-[0.98]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 text-amber-500 ${
                    favoritosCount > 0 ? "fill-amber-400" : "fill-transparent"
                  }`}
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z" />
                </svg>
                <span className="absolute -right-2 -top-2 inline-flex min-h-[1.7rem] min-w-[1.7rem] items-center justify-center rounded-full bg-amber-400 px-2 py-1 text-[0.8rem] font-black leading-none text-black">
                  {favoritosCount}
                </span>
              </Link>
            </div>
          )}

          {showCart && (
            <div className="col-start-3 min-w-0 md:order-4 md:col-start-auto">
              <label className="sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]">
                Pedido
              </label>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Ver pedido"
                className="relative flex h-11 w-full items-center justify-center rounded-md border border-transparent bg-white text-[var(--color-foreground)] transition hover:brightness-[0.98]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74L20 7H7" />
                </svg>
                <span className="absolute -right-2 -top-2 inline-flex min-h-[1.7rem] min-w-[1.7rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-1 text-[0.8rem] font-black leading-none text-[var(--color-primary-foreground)]">
                  {cartCount}
                </span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

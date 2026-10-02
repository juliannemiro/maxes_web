"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useFavoritos } from "@/context/FavoritosContext";
import { Categoria } from "@/types";
import HeaderSearch from "@/components/layout/HeaderSearch";

interface HeaderProps {
  search?: string;
  onSearch?: (term: string) => void;
  onSearchSubmit?: (term: string) => void;
  categorias?: Categoria[];
  selectedCategoria?: number;
  onSelectCategoria?: (id: number | undefined) => void;
  whatsappContact?: string;
  direccionLocal?: string;
  showCart?: boolean;
}

export default function Header({
  search = "",
  onSearch,
  onSearchSubmit,
  categorias = [],
  selectedCategoria,
  onSelectCategoria,
  showCart = false,
}: HeaderProps) {
  const { getItemCount, isHydrated, setOpen } = useCart();
  const {
    getFavoritosCount,
    isHydrated: favoritosHydrated,
  } = useFavoritos();
  const sortedCategorias = useMemo(
    () =>
      [...categorias].sort((a, b) =>
        (a.nombre || a.codigo || "").localeCompare(b.nombre || b.codigo || "", "es", {
          sensitivity: "base",
        })
      ),
    [categorias]
  );
  const cartCount = isHydrated ? getItemCount() : 0;
  const favoritosCount = favoritosHydrated ? getFavoritosCount() : 0;
  const hasCatalogControls = Boolean(onSearch || onSelectCategoria);
  const isHomeHeader = showCart && Boolean(onSearch) && !onSelectCategoria;
  const controlsGridClass = showCart
    ? isHomeHeader
      ? "grid w-full max-w-[44rem] min-w-0 justify-self-center grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-2"
      : hasCatalogControls
      ? "grid min-w-0 grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_64px] md:gap-4 lg:gap-6"
      : "flex items-center justify-end gap-2"
    : "grid min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-2 md:gap-4 lg:gap-6";
  const searchWrapperClass = isHomeHeader
    ? "min-w-0"
    : showCart
    ? "min-w-0 md:order-1 md:col-auto"
    : "col-span-full min-w-0 md:order-1 md:col-auto";

  if (isHomeHeader) {
    return (
      <header className="sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-foreground)] shadow-md">
        <div className="grid min-h-[5.75rem] w-full grid-cols-[auto_minmax(0,40rem)_auto] items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-4 sm:py-5 lg:min-h-[7.2rem] lg:py-[1.65rem] xl:px-6">
          <Link href="/" className="flex shrink-0 flex-col items-start leading-none">
            <span className="text-4xl font-black tracking-tight text-[var(--color-header-foreground)] lg:text-[2.65rem]">
              M<span className="text-[var(--color-primary)]">@</span>XES
            </span>
            <span className="hidden text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] sm:block">
              Tus insumos en un solo lugar
            </span>
          </Link>

          <HeaderSearch
            value={search}
            onChange={(value) => onSearch?.(value)}
            onSubmit={onSearchSubmit}
            className="min-w-0"
            size="large"
          />

          <div className="flex shrink-0 items-center gap-5 lg:gap-6">
            <Link href="/favoritos" aria-label="Ver favoritos" className="relative flex h-12 w-14 items-center justify-center rounded-md bg-white text-[var(--color-foreground)] transition hover:brightness-[0.98] lg:h-14 lg:w-[4.5rem]">
              <svg viewBox="0 0 24 24" className={`h-7 w-7 text-amber-500 ${favoritosCount > 0 ? "fill-amber-400" : "fill-transparent"}`} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z" />
              </svg>
              <span className="absolute -right-2 -top-2 inline-flex min-h-[1.7rem] min-w-[1.7rem] items-center justify-center rounded-full bg-amber-400 px-2 py-1 text-[0.8rem] font-black leading-none text-black">{favoritosCount}</span>
            </Link>
            <button type="button" onClick={() => setOpen(true)} aria-label="Ver pedido" className="relative flex h-12 w-14 items-center justify-center rounded-md bg-white text-[var(--color-foreground)] transition hover:brightness-[0.98] lg:h-14 lg:w-[4.5rem]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74L20 7H7" />
              </svg>
              <span className="absolute -right-2 -top-2 inline-flex min-h-[1.7rem] min-w-[1.7rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-1 text-[0.8rem] font-black leading-none text-[var(--color-primary-foreground)]">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-foreground)] shadow-md">
      <div className={`grid w-full grid-cols-1 gap-3 px-4 py-4 md:py-5 xl:px-6 ${isHomeHeader ? "sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:py-4" : "lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:py-[1.65rem]"}`}>
        <Link href="/" className={`mx-auto flex shrink-0 flex-col items-center leading-none ${isHomeHeader ? "sm:mx-0 sm:items-start" : "lg:mx-0 lg:items-start"}`}>
          <span className="text-3xl font-black tracking-tight text-[var(--color-header-foreground)]">
            M<span className="text-[var(--color-primary)]">@</span>XES
          </span>
          <span className={`text-center text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] ${isHomeHeader ? "sm:text-left" : "lg:text-left"}`}>
            Tus insumos en un solo lugar
          </span>
        </Link>

        <div className={controlsGridClass}>
          {onSelectCategoria && (
            <div className="min-w-0 md:order-2 md:col-auto col-span-full">
              <label
                htmlFor="header-categoria"
                className={isHomeHeader ? "sr-only" : "sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]"}
              >
                Buscar por categoría
              </label>
              <div className="relative flex h-11 w-full items-center overflow-hidden rounded-md border border-transparent bg-white">
                <select
                  id="header-categoria"
                  value={selectedCategoria ?? "__all__"}
                  onChange={(e) => onSelectCategoria(e.target.value === "__all__" ? undefined : Number(e.target.value))}
                  aria-label="Buscar por categoría"
                  className="h-full w-full appearance-none bg-transparent px-4 pr-20 text-sm font-medium text-[var(--color-foreground)] outline-none"
                >
                  <option value="__all__">Todas las categorías</option>
                  {sortedCategorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre || categoria.codigo}
                    </option>
                  ))}
                </select>
                {selectedCategoria !== undefined && (
                  <button
                    type="button"
                    onClick={() => onSelectCategoria(undefined)}
                    aria-label="Mostrar todas las categorías"
                    title="Mostrar todas las categorías"
                    className="absolute right-10 flex h-full w-10 items-center justify-center text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-[var(--color-primary)] px-3 text-[var(--color-primary-foreground)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </div>
          )}

          {onSearch && (
            <HeaderSearch
              value={search}
              onChange={onSearch}
              onSubmit={onSearchSubmit}
              className={searchWrapperClass}
              showLabel
            />
          )}

          {showCart && (
            <div className={`${isHomeHeader ? "col-start-2 w-[52px] min-w-0" : hasCatalogControls ? "col-start-2 min-w-0 md:order-3 md:col-start-auto" : "w-[52px] min-w-0"}`}>
              <label className={isHomeHeader ? "sr-only" : "sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]"}>
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
            <div className={`${isHomeHeader ? "col-start-3 w-[52px] min-w-0" : hasCatalogControls ? "col-start-3 min-w-0 md:order-4 md:col-start-auto" : "w-[52px] min-w-0"}`}>
              <label className={isHomeHeader ? "sr-only" : "sr-only md:not-sr-only md:mb-1.5 md:block md:text-[0.65rem] md:font-semibold md:uppercase md:tracking-[0.22em] md:text-[var(--color-muted-foreground)]"}>
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
                  className="h-6 w-6"
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

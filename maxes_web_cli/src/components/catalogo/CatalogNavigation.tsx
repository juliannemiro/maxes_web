"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Categoria, CategoriaDetalle } from "@/types";

interface CatalogNavigationProps {
  categorias: Categoria[];
  categoriaDetalles: CategoriaDetalle[];
  selectedCategoria?: number;
  selectedCategoriaDetalle?: number;
  novedadesActive: boolean;
  destacadosActive: boolean;
  onSelectCategoria: (id: number | undefined) => void;
  onSelectCategoriaDetalle: (id: number | undefined) => void;
  onToggleNovedades: () => void;
  onToggleDestacados: () => void;
  onReset: () => void;
}

export default function CatalogNavigation({
  categorias,
  categoriaDetalles,
  selectedCategoria,
  selectedCategoriaDetalle,
  novedadesActive,
  destacadosActive,
  onSelectCategoria,
  onSelectCategoriaDetalle,
  onToggleNovedades,
  onToggleDestacados,
  onReset,
}: CatalogNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCategoria, setMenuCategoria] = useState<number | undefined>(selectedCategoria);
  const navigationRef = useRef<HTMLElement>(null);
  const sortedCategorias = useMemo(
    () => [...categorias].filter((categoria) => categoria.activo).sort((a, b) => (a.nombre || a.codigo).localeCompare(b.nombre || b.codigo, "es")),
    [categorias]
  );
  const detalles = useMemo(
    () => categoriaDetalles.filter((detalle) => detalle.activo && detalle.categoriaOrigenId === menuCategoria)
      .sort((a, b) => (a.nombre || a.codigo).localeCompare(b.nombre || b.codigo, "es")),
    [categoriaDetalles, menuCategoria]
  );

  useEffect(() => setMenuCategoria(selectedCategoria), [selectedCategoria]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (navigationRef.current && !navigationRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectCategoria = (id: number | undefined) => {
    setMenuCategoria(id);
    onSelectCategoria(id);
    if (id === undefined) setIsOpen(false);
  };

  return (
    <nav ref={navigationRef} aria-label="Navegación del catálogo" className="relative z-30 border-b border-[var(--color-border)] bg-white shadow-sm">
      <div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-4 lg:px-6 [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold transition ${isOpen || selectedCategoria !== undefined ? "bg-[var(--color-primary)] text-[var(--color-foreground)]" : "hover:bg-[var(--color-muted)]"}`}>
          CATEGORÍAS
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={onToggleNovedades} aria-pressed={novedadesActive}
          className={`h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition ${novedadesActive ? "bg-[var(--color-primary)]" : "hover:bg-[var(--color-muted)]"}`}>NOVEDADES</button>
        <button type="button" onClick={onToggleDestacados} aria-pressed={destacadosActive}
          className={`h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition ${destacadosActive ? "bg-[var(--color-primary)]" : "hover:bg-[var(--color-muted)]"}`}>DESTACADOS</button>
        <button type="button" onClick={onReset} aria-label="Quitar todos los filtros" title="Quitar todos los filtros"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full border-y border-[var(--color-border)] bg-white shadow-lg">
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 divide-y divide-[var(--color-border)] px-3 sm:px-4 md:grid-cols-2 md:divide-x md:divide-y-0 lg:px-6">
            <div className="py-3 md:pr-5">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Categorías</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <button type="button" onClick={() => selectCategoria(undefined)} className="rounded px-2 py-2.5 text-left text-sm font-semibold hover:bg-[var(--color-muted)]">Todas las categorías</button>
                {sortedCategorias.map((categoria) => <button key={categoria.id} type="button" onClick={() => selectCategoria(categoria.id)} className={`rounded px-2 py-2.5 text-left text-sm transition hover:bg-[var(--color-muted)] ${menuCategoria === categoria.id ? "bg-[var(--color-primary)] font-bold" : ""}`}>{categoria.nombre || categoria.codigo}</button>)}
              </div>
            </div>
            <div className="py-3 md:pl-5">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">{menuCategoria === undefined ? "Elegí una categoría" : "Subcategorías"}</p>
              {menuCategoria === undefined ? <p className="px-2 py-2 text-sm text-[var(--color-muted-foreground)]">Seleccioná una categoría para ver sus subcategorías.</p> : detalles.length === 0 ? <p className="px-2 py-2 text-sm text-[var(--color-muted-foreground)]">Esta categoría no tiene subcategorías.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <button type="button" onClick={() => { onSelectCategoriaDetalle(undefined); setIsOpen(false); }} className="rounded px-2 py-2.5 text-left text-sm font-semibold hover:bg-[var(--color-muted)]">Todas las subcategorías</button>
                {detalles.map((detalle) => <button key={detalle.categoriaDetalleOrigenId} type="button" onClick={() => { onSelectCategoriaDetalle(detalle.categoriaDetalleOrigenId); setIsOpen(false); }} className={`rounded px-2 py-2.5 text-left text-sm transition hover:bg-[var(--color-muted)] ${selectedCategoriaDetalle === detalle.categoriaDetalleOrigenId ? "bg-[var(--color-primary)] font-bold" : ""}`}>{detalle.nombre || detalle.codigo}</button>)}
              </div>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

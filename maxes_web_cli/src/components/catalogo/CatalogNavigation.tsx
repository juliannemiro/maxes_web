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
  const [mobileStep, setMobileStep] = useState<"categorias" | "subcategorias">("categorias");
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

  // En escritorio, recorrer las categorías sólo previsualiza sus
  // subcategorías. El filtro se aplica únicamente al hacer clic.
  const previsualizarCategoria = (id: number) => setMenuCategoria(id);

  const openMobileCategories = () => {
    setMenuCategoria(selectedCategoria);
    setMobileStep("categorias");
    setIsOpen(true);
  };

  const toggleDesktopCategories = () => {
    setIsOpen((open) => {
      if (!open) setMenuCategoria(selectedCategoria);
      return !open;
    });
  };

  const selectMobileCategoria = (id: number | undefined) => {
    setMenuCategoria(id);
    onSelectCategoria(id);
    onSelectCategoriaDetalle(undefined);
    if (id === undefined) return setIsOpen(false);
    setMobileStep("subcategorias");
  };

  return (
    <nav ref={navigationRef} aria-label="Navegación del catálogo" className="relative z-30 border-b border-[var(--color-border)] bg-white shadow-sm">
      <div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-4 lg:px-6 [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-expanded={isOpen} onClick={openMobileCategories}
          className={`inline-flex h-11 shrink-0 items-center rounded-md px-3 text-sm font-bold transition sm:hidden ${isOpen || selectedCategoria !== undefined ? "bg-[var(--color-primary)] text-[var(--color-foreground)]" : "hover:bg-[var(--color-muted)]"}`}>
          CATEGORÍAS
        </button>
        <button type="button" aria-expanded={isOpen} onClick={toggleDesktopCategories}
          className={`hidden h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold transition sm:inline-flex ${isOpen || selectedCategoria !== undefined ? "bg-[var(--color-primary)] text-[var(--color-foreground)]" : "hover:bg-[var(--color-muted)]"}`}>
          CATEGORÍAS
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={onToggleNovedades} aria-pressed={novedadesActive}
          className={`h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition ${novedadesActive ? "bg-[var(--color-primary)]" : "hover:bg-[var(--color-muted)]"}`}>NOVEDADES</button>
        <button type="button" onClick={onToggleDestacados} aria-pressed={destacadosActive}
          className={`h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition ${destacadosActive ? "bg-[var(--color-primary)]" : "hover:bg-[var(--color-muted)]"}`}>DESTACADOS</button>
        <button type="button" onClick={onReset} aria-label="Quitar todos los filtros" title="Quitar todos los filtros"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] sm:flex">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full hidden border-y border-[var(--color-border)] bg-white shadow-lg sm:block">
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar categorías" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 divide-y divide-[var(--color-border)] px-3 sm:px-4 md:grid-cols-2 md:divide-x md:divide-y-0 lg:px-6">
            <div className="py-3 md:pr-5">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Categorías</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <button type="button" onClick={() => selectCategoria(undefined)} className="rounded px-2 py-2.5 text-left text-sm font-semibold hover:bg-[var(--color-muted)]">Todas las categorías</button>
                {sortedCategorias.map((categoria) => <button key={categoria.id} type="button" onMouseEnter={() => previsualizarCategoria(categoria.id)} onFocus={() => previsualizarCategoria(categoria.id)} onClick={() => selectCategoria(categoria.id)} className={`rounded px-2 py-2.5 text-left text-sm transition hover:bg-[var(--color-muted)] ${menuCategoria === categoria.id ? "bg-[var(--color-primary)] font-bold" : ""}`}>{categoria.nombre || categoria.codigo}</button>)}
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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:hidden" onClick={() => setIsOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Categorías del catálogo" className="w-full rounded-t-[24px] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="mb-3 flex items-center justify-between gap-3">
              {mobileStep === "subcategorias" ? <button type="button" onClick={() => setMobileStep("categorias")} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-slate-700"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>Categorías</button> : <h2 className="text-base font-black">Categorías</h2>}
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar categorías" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
            </div>
            {mobileStep === "categorias" ? <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1"><button type="button" onClick={() => selectMobileCategoria(undefined)} className="min-h-11 rounded-xl bg-slate-100 px-3 text-left text-sm font-bold">Todas</button>{sortedCategorias.map((categoria) => <button key={categoria.id} type="button" onClick={() => selectMobileCategoria(categoria.id)} className={`min-h-11 rounded-xl px-3 text-left text-sm font-semibold ${menuCategoria === categoria.id ? "bg-[var(--color-primary)]" : "bg-slate-50 hover:bg-slate-100"}`}>{categoria.nombre || categoria.codigo}</button>)}</div> : <div className="max-h-[55vh] overflow-y-auto pr-1"><p className="mb-3 text-sm text-slate-500">{sortedCategorias.find((categoria) => categoria.id === menuCategoria)?.nombre || "Categoría"}</p><button type="button" onClick={() => { onSelectCategoriaDetalle(undefined); setIsOpen(false); }} className="mb-2 min-h-11 w-full rounded-xl bg-[var(--color-primary)] px-3 text-left text-sm font-bold">Ver todo</button>{detalles.length === 0 ? <p className="py-4 text-sm text-slate-500">Esta categoría no tiene subcategorías.</p> : <div className="grid grid-cols-2 gap-2">{detalles.map((detalle) => <button key={detalle.categoriaDetalleOrigenId} type="button" onClick={() => { onSelectCategoriaDetalle(detalle.categoriaDetalleOrigenId); setIsOpen(false); }} className={`min-h-11 rounded-xl px-3 text-left text-sm font-semibold ${selectedCategoriaDetalle === detalle.categoriaDetalleOrigenId ? "bg-[var(--color-primary)]" : "bg-slate-50 hover:bg-slate-100"}`}>{detalle.nombre || detalle.codigo}</button>)}</div>}</div>}
          </section>
        </div>
      )}
    </nav>
  );
}

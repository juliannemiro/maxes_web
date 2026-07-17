"use client";

import { useEffect, useMemo, useState } from "react";
import { Articulo } from "../../types";
import { useCart } from "../../context/CartContext";
import CantidadSelector from "../common/CantidadSelector";
import { usePurchaseMode } from "../../context/PurchaseModeContext";
import { formatPrice, obtenerPrecio } from "../../lib/obtenerPrecio";
import OptimizedImage from "../common/OptimizedImage";

interface ProductoModalProps {
  articulo: Articulo;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductoModal({ articulo, isOpen, onClose }: ProductoModalProps) {
  const { addToCart } = useCart();
  const { tipoCompra } = usePurchaseMode();
  const [imgIndex, setImgIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [qty, setQty] = useState("1");
  const [added, setAdded] = useState(false);
  const [qtyError, setQtyError] = useState(false);

  const images = useMemo(
    () =>
      Array.from(
        new Set(
          [articulo.imagen_url, ...(articulo.imagenes?.map((image) => image.imagen_url) || [])]
            .filter(Boolean)
            .map((image) => String(image).trim())
        )
      ),
    [articulo.imagen_url, articulo.imagenes]
  );

  const gallery = images.length > 0 ? images : ["/placeholder.svg"];
  const precioActual = obtenerPrecio(articulo, tipoCompra);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleAdd = () => {
    const amount = Number.parseInt(qty, 10);
    if (Number.isNaN(amount) || amount <= 1) {
      setQtyError(true);
      return;
    }

    addToCart(articulo, amount, comment.trim());
    setAdded(true);
    setQty(String(amount));
    setQtyError(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar producto"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm transition-colors hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#fafafa_0%,#f3f3f3_100%)] p-8 sm:p-10">
            <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {gallery.map((image, index) => (
                <OptimizedImage
                  key={`${articulo.id}-modal-${image}-${index}`}
                  src={image}
                  alt={articulo.descripcion_publica || "Producto"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className={`absolute inset-0 h-full w-full object-contain p-6 transition-all duration-700 ease-out ${
                    index === imgIndex ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
                  }`}
                />
              ))}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImgIndex((current) => (current - 1 + gallery.length) % gallery.length)}
                    aria-label="Imagen anterior"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIndex((current) => (current + 1) % gallery.length)}
                    aria-label="Imagen siguiente"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {gallery.map((image, index) => (
                  <button
                    key={`${articulo.id}-thumb-${index}`}
                    type="button"
                    onClick={() => setImgIndex(index)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white transition-all ${
                      index === imgIndex
                        ? "border-[var(--color-primary)] ring-2 ring-[color:var(--color-primary)]/30"
                        : "border-slate-200"
                    }`}
                  >
                    <OptimizedImage src={image} alt={`Vista ${index + 1}`} fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="flex flex-1 flex-col p-8 sm:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Cod: {articulo.codigo || "N/D"}
                </span>
                {articulo.rubro?.nombre && (
                  <span className="rounded-full bg-[var(--color-primary)]/20 px-3 py-1 text-xs font-bold text-slate-700">
                    {articulo.rubro.nombre}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-black leading-tight text-slate-900 sm:text-[1.65rem]">
                {articulo.articulo_des || articulo.descripcion_publica || "Producto sin descripción"}
              </h2>

              {articulo.proveedor_des && (
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  {articulo.proveedor_des}
                </p>
              )}

              <p className="mt-2 text-3xl font-extrabold leading-none text-left text-slate-900">
                {formatPrice(precioActual)}
              </p>

              <div className="mt-4 flex flex-col border-t border-slate-200/80 pt-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Descripción
                </p>
                <div className="mt-2 min-h-[120px] max-h-[60vh] overflow-y-auto pr-2 text-sm leading-6 text-slate-700">
                  {articulo.descripcion_detallada || articulo.descripcion_publica || "Sin descripción disponible."}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-8 sm:p-10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="¿Comentarios?"
                  aria-label="Comentarios optativos"
                  maxLength={30}
                  className="min-w-0 flex-[1.7] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 text-sm italic text-[var(--color-foreground)] outline-none placeholder:italic focus:border-[var(--color-primary)]"
                />
                <CantidadSelector
                  value={qty}
                  onChange={(value) => {
                    const nextValue = value.replace(/\D/g, "");
                    setQty(nextValue);
                    if (nextValue === "" || Number.parseInt(nextValue, 10) <= 0) {
                      setAdded(false);
                    }
                    if (qtyError && Number.parseInt(nextValue, 10) > 1) {
                      setQtyError(false);
                    }
                  }}
                  onDecrement={() => {
                    const nextValue = String(Math.max(0, (Number.parseInt(qty || "0", 10) || 0) - 1));
                    setQty(nextValue);
                    if (Number.parseInt(nextValue, 10) <= 0) {
                      setAdded(false);
                    }
                    if (qtyError && Number.parseInt(nextValue, 10) > 1) {
                      setQtyError(false);
                    }
                  }}
                  onIncrement={() => {
                    const nextValue = String((Number.parseInt(qty || "0", 10) || 0) + 1);
                    setQty(nextValue);
                    if (qtyError && Number.parseInt(nextValue, 10) > 1) {
                      setQtyError(false);
                    }
                  }}
                  error={qtyError}
                  className="w-24 rounded-xl border-[var(--color-border)] bg-[var(--color-background)]"
                  buttonClassName="py-3 text-base"
                  valueClassName="px-1 text-sm text-[var(--color-foreground)]"
                />
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-300 hover:brightness-95 ${
                    added
                      ? "scale-[1.01] bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                      : "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  }`}
                >
                  {added ? <span className="text-[22px] leading-none">✓</span> : "Agregar"}
                </button>
              </div>

              {qtyError && (
                <p className="mt-2 text-center text-sm font-semibold text-red-600">
                  indicar cantidad
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

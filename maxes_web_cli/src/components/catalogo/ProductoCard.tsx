"use client";

import { useEffect, useState } from "react";
import { Articulo } from "../../types";
import { useCart } from "../../context/CartContext";
import CantidadSelector from "../common/CantidadSelector";
import ProductoModal from "./ProductoModal";
import { usePurchaseMode } from "../../context/PurchaseModeContext";
import { formatPrice, obtenerPrecio } from "../../lib/obtenerPrecio";

interface ProductoCardProps {
  articulo: Articulo;
}

export default function ProductoCard({ articulo }: ProductoCardProps) {
  const { addToCart, cart, updateComment, updateQuantity, setOpen } = useCart();
  const { tipoCompra } = usePurchaseMode();
  const [comment, setComment] = useState("");
  const [qty, setQty] = useState("");
  const [added, setAdded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qtyError, setQtyError] = useState(false);
  const [lastSubmittedQty, setLastSubmittedQty] = useState("");
  const [lastSubmittedComment, setLastSubmittedComment] = useState("");

  const allImages = Array.from(
    new Set(
      [articulo.imagen_url, ...(articulo.imagenes?.map((image) => image.imagen_url) || [])]
        .filter(Boolean)
        .map((image) => String(image).trim())
    )
  );

  const [imgIndex, setImgIndex] = useState(0);
  const images = allImages.length > 0 ? allImages : ["/placeholder.svg"];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!hasMultipleImages) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setImgIndex((current) => (current + 1) % images.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleImages, images.length]);

  useEffect(() => {
    const cartItem = cart.find((item) => item.articulo.id === articulo.id);

    if (!cartItem) {
      return;
    }

    const nextQty = String(cartItem.cantidad);
    const nextComment = cartItem.comentario || "";

    queueMicrotask(() => {
      setQty(nextQty);
      setComment(nextComment);
      setAdded(true);
      setLastSubmittedQty(nextQty);
      setLastSubmittedComment(nextComment);
    });
  }, [articulo.id, cart]);

  const handleAdd = () => {
    const amount = Number.parseInt(qty, 10);
    const cartItem = cart.find((item) => item.articulo.id === articulo.id);

    if (!cartItem && (Number.isNaN(amount) || amount <= 0)) {
      setQtyError(true);
      return;
    }

    if (cartItem) {
      if (Number.isNaN(amount) || amount <= 0) {
        updateQuantity(articulo.id, 0);
        setAdded(false);
        setLastSubmittedQty("");
        setLastSubmittedComment("");
        setQty("0");
        setQtyError(false);
        return;
      }

      updateQuantity(articulo.id, Number.isNaN(amount) ? 0 : amount);
      updateComment(articulo.id, comment.trim());
    } else {
      addToCart(articulo, amount, comment.trim());
    }

    setAdded(true);
    setQty(String(amount));
    setLastSubmittedQty(String(amount));
    setLastSubmittedComment(comment.trim());
    setQtyError(false);
  };

  const handleQtyChange = (nextValue: string) => {
    const normalizedValue = nextValue.replace(/\D/g, "");
    const cartItem = cart.find((item) => item.articulo.id === articulo.id);
    setQty(normalizedValue);

    if (!cartItem && (normalizedValue === "" || Number.parseInt(normalizedValue, 10) <= 0)) {
      setAdded(false);
    }

    if (qtyError && Number.parseInt(normalizedValue, 10) > 0) {
      setQtyError(false);
    }
  };

  const submittedStateChanged =
    added && (qty !== lastSubmittedQty || comment.trim() !== lastSubmittedComment);
  const actionLabel = submittedStateChanged ? "Actualizar" : added ? "✓" : "Agregar";
  const precioActual = obtenerPrecio(articulo, tipoCompra);

  return (
    <article className="flex h-full flex-col rounded-[18px] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <h3 className="flex min-h-[3rem] items-center justify-center text-center text-[16px] font-bold leading-[1.15] text-[var(--color-card-foreground)] text-balance">
        {articulo.articulo_des || articulo.descripcion_publica || "Producto sin descripción"}
      </h3>

      <p className="mt-1 text-center text-[11px] leading-none text-[var(--color-muted-foreground)]">
        {(articulo.rubro?.nombre || "NOVEDADES").toUpperCase()}
      </p>

      <div className="relative mt-1.5 aspect-[1/0.84] w-full overflow-hidden rounded-lg bg-white">
        {images.map((image, index) => (
          <img
            key={`${articulo.id}-${image}-${index}`}
            src={image || "/placeholder.svg"}
            alt={articulo.descripcion_publica || "Producto"}
            className={`absolute inset-0 h-full w-full object-contain p-2 transition-all duration-700 ease-out ${
              index === imgIndex ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
            }`}
          />
        ))}

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="absolute inset-0 z-[1]"
          aria-label={`Ver detalle de ${articulo.descripcion_publica || "producto"}`}
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setImgIndex((current) => (current - 1 + images.length) % images.length);
              }}
              aria-label="Imagen anterior"
              className="absolute left-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-white/85 p-1 text-[var(--color-muted-foreground)] shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[var(--color-foreground)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setImgIndex((current) => (current + 1) % images.length);
              }}
              aria-label="Imagen siguiente"
              className="absolute right-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-white/85 p-1 text-[var(--color-muted-foreground)] shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[var(--color-foreground)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <div className="absolute bottom-2 left-1/2 z-[2] flex -translate-x-1/2 gap-1 rounded-full bg-black/10 px-1.5 py-0.5 backdrop-blur-sm">
              {images.map((_, index) => (
                <span
                  key={`${articulo.id}-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === imgIndex ? "w-4 bg-[var(--color-primary)]" : "w-1.5 bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto">
        <p className="mt-1 text-center text-[1.15rem] font-black leading-none text-[var(--color-card-foreground)]">
          {formatPrice(precioActual)}
        </p>

        <div className="mt-1.5 flex items-stretch gap-1.5">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Comentarios?"
          aria-label="Comentarios optativos"
          maxLength={30}
          className="min-w-0 flex-[1.1] rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[11px] italic text-[var(--color-foreground)] outline-none placeholder:italic focus:border-[var(--color-primary)]"
          />
          <CantidadSelector
            value={qty}
            onChange={handleQtyChange}
            onDecrement={() => handleQtyChange(String(Math.max(0, Number.parseInt(qty || "0", 10) - 1)))}
            onIncrement={() => handleQtyChange(String((Number.parseInt(qty || "0", 10) || 0) + 1))}
            error={qtyError}
            className="w-[6.9rem] rounded-md border-[var(--color-border)] bg-[var(--color-background)]"
            buttonClassName="px-2 py-1 text-sm text-[var(--color-foreground)] hover:bg-black/5"
            valueClassName="px-1 text-[11px] font-semibold text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            className={`min-w-[5.7rem] rounded-md px-3 py-1 text-[12px] font-bold transition-all duration-300 hover:brightness-95 ${
              actionLabel === "✓"
                ? "scale-[1.03] bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                : "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            }`}
          >
            {actionLabel === "✓" ? <span className="text-[18px] leading-none">✓</span> : actionLabel}
          </button>
        </div>

        {qtyError && (
          <p className="mt-1 text-center text-[11px] font-semibold text-red-600">
            Debe ingresar cantidad
          </p>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 block w-full text-center text-[11px] font-semibold text-[var(--color-muted-foreground)] underline-offset-2 transition hover:text-[var(--color-foreground)] hover:underline"
        >
          Ver pedido
        </button>
      </div>

      {isModalOpen && (
        <ProductoModal
          articulo={articulo}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </article>
  );
}

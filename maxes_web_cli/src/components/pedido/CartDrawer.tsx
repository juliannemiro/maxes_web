"use client";

import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { usePurchaseMode } from "../../context/PurchaseModeContext";
import { formatPrice, obtenerPrecio } from "../../lib/obtenerPrecio";

function getArticuloTitulo(item: (ReturnType<typeof useCart>["cart"])[number]) {
  const articuloDes = item.articulo.articulo_des?.trim();
  if (articuloDes) {
    return articuloDes;
  }

  const descripcionPublica = item.articulo.descripcion_publica?.trim();
  if (descripcionPublica && descripcionPublica !== item.articulo.codigo) {
    return descripcionPublica;
  }

  return "Producto sin descripción";
}

export default function CartDrawer() {
  const { cart, isHydrated, isOpen, setOpen, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const { tipoCompra } = usePurchaseMode();
  const safeCart = isHydrated ? cart : [];
  const safeIsOpen = isHydrated ? isOpen : false;

  return (
    <>
      {safeIsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--color-background)] shadow-xl transition-transform duration-300 ${
          safeIsOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Tu pedido"
        aria-modal="true"
      >
        <div className="flex items-center justify-between bg-[var(--color-primary)] px-4 py-4 text-[var(--color-primary-foreground)]">
          <h2 className="text-lg font-bold">Tu Pedido</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="rounded-md p-1 hover:bg-black/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {safeCart.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[var(--color-muted-foreground)]">
              Tu pedido está vacío. Agregá productos del catálogo.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {safeCart.map((item) => (
                <li
                  key={item.articulo.id}
                  className="flex gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3"
                >
                  <img
                    src={item.articulo.imagen_url || "/placeholder.svg"}
                    alt={item.articulo.descripcion_publica || "Producto"}
                    className="h-14 w-14 shrink-0 rounded object-contain"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-card-foreground)]">
                      {getArticuloTitulo(item)}
                    </p>
                    {item.articulo.proveedor_des && (
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {item.articulo.proveedor_des}
                      </p>
                    )}
                    {item.comentario && (
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {item.comentario}
                      </p>
                    )}
                    <p className="text-sm font-bold text-[var(--color-card-foreground)]">
                      {formatPrice(obtenerPrecio(item.articulo, tipoCompra))}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.articulo.id, item.cantidad - 1)}
                        aria-label="Restar"
                        className="rounded border border-[var(--color-border)] p-1 hover:bg-[var(--color-muted)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <span className="w-6 text-center text-sm">{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.articulo.id, item.cantidad + 1)}
                        aria-label="Sumar"
                        className="rounded border border-[var(--color-border)] p-1 hover:bg-[var(--color-muted)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.articulo.id)}
                        aria-label="Eliminar"
                        className="ml-auto rounded p-1 text-red-600 hover:bg-[var(--color-muted)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-lg font-bold text-[var(--color-card-foreground)]">
            <span>Total</span>
            <span>{formatPrice(getCartTotal(tipoCompra))}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[var(--color-border)] bg-white py-3 text-center text-sm font-bold text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
            >
              Seguir comprando
            </button>

            <Link
              href="/pedido"
              className={`rounded-md py-3 text-center text-sm font-bold ${
                safeCart.length
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:brightness-95"
                  : "pointer-events-none bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
              }`}
              onClick={() => setOpen(false)}
            >
              Realizar compra
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

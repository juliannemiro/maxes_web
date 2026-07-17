"use client";

import Link from "next/link";
import CantidadSelector from "../common/CantidadSelector";
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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-[var(--color-background)] shadow-xl transition-transform duration-300 ${
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

        <div className="flex-1 overflow-y-auto">
          {safeCart.length === 0 ? (
            <p className="mx-4 mt-10 text-center text-sm text-[var(--color-muted-foreground)]">
              Tu pedido está vacío. Agregá productos del catálogo.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] bg-white">
              {safeCart.map((item) => {
                const itemTotal = obtenerPrecio(item.articulo, tipoCompra) * item.cantidad;

                return (
                  <li
                    key={item.articulo.id}
                    className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-muted)]/35"
                  >
                    <img
                      src={item.articulo.imagen_url || "/placeholder.svg"}
                      alt={item.articulo.descripcion_publica || "Producto"}
                      className="h-20 w-20 rounded-lg bg-white object-contain"
                    />

                    <div className="flex min-h-20 min-w-0 flex-col justify-center">
                      <p className="line-clamp-2 text-base font-black leading-tight text-[var(--color-card-foreground)] sm:text-sm">
                        {getArticuloTitulo(item)}
                        {item.articulo.proveedor_des && (
                          <span className="font-medium text-[var(--color-muted-foreground)]">
                            {` - ${item.articulo.proveedor_des}`}
                          </span>
                        )}
                      </p>

                      <div className="mt-3 grid grid-cols-[100px_minmax(0,1fr)_38px] items-center gap-2 sm:grid-cols-[100px_minmax(92px,1fr)_38px]">
                        <CantidadSelector
                          value={item.cantidad}
                          onChange={(value) =>
                            updateQuantity(item.articulo.id, Number.parseInt(value.replace(/\D/g, ""), 10) || 0)
                          }
                          onDecrement={() => updateQuantity(item.articulo.id, item.cantidad - 1)}
                          onIncrement={() => updateQuantity(item.articulo.id, item.cantidad + 1)}
                          ariaLabel={`Cantidad para ${getArticuloTitulo(item)}`}
                          className="w-[100px] rounded-md bg-white"
                          buttonClassName="px-1.5 py-1 text-sm hover:bg-black/5"
                          valueClassName="px-1 text-sm"
                        />

                        <span className="min-w-0 pr-1 text-right text-sm font-semibold leading-none text-slate-600">
                          {formatPrice(itemTotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.articulo.id)}
                          aria-label="Eliminar"
                          className="flex h-9 w-9 items-center justify-center justify-self-end rounded text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        >
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_38px] items-end gap-2 text-[var(--color-card-foreground)]">
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Total
            </span>
            <span className="text-2xl font-black leading-none">{formatPrice(getCartTotal(tipoCompra))}</span>
            <span aria-hidden="true" />
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

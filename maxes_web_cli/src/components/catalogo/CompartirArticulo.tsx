"use client";

import { useEffect, useRef, useState } from "react";
import { Articulo } from "../../types";
import { trackProductShared } from "../../lib/analyticsClient";

interface CompartirArticuloProps {
  articulo: Articulo;
  precio: string;
  className?: string;
  menuAlign?: "left" | "right";
}

const SHARE_PREVIEW_VERSION = "1";

export default function CompartirArticulo({
  articulo,
  precio,
  className = "",
  menuAlign = "right",
}: CompartirArticuloProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const title = articulo.articulo_des || articulo.descripcion_publica || "Artículo MAXES";
  const getProductUrl = () =>
    `${window.location.origin}/articulo/${encodeURIComponent(articulo.codigo || String(articulo.id))}?v=${SHARE_PREVIEW_VERSION}`;

  useEffect(() => {
    if (!isOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const shareOnWhatsapp = () => {
    const productUrl = getProductUrl();
    const message = `Mirá este producto en MAXES Insumos\n${title}\nPrecio: ${precio}\n${productUrl}`;
    const whatsappUrl = new URL("https://wa.me/");
    whatsappUrl.searchParams.set("text", message);
    window.open(whatsappUrl.toString(), "_blank");
    void trackProductShared({ articulo_id: articulo.id, metodo: "whatsapp" }).catch(console.error);
    setIsOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getProductUrl());
      void trackProductShared({ articulo_id: articulo.id, metodo: "copiar_link" }).catch(console.error);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1400);
    } catch (error) {
      console.error("No se pudo copiar el enlace:", error);
    }
  };

  return (
    <div ref={containerRef} className={`z-20 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Compartir producto"
        title="Compartir"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-colors hover:text-slate-900"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute top-11 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${
            menuAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={shareOnWhatsapp}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-emerald-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M16.04 3A12.8 12.8 0 0 0 5.16 22.54L3.5 28.6l6.2-1.63A12.8 12.8 0 1 0 16.04 3Zm0 23.42a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.68.97.98-3.58-.25-.4a10.62 10.62 0 1 1 8.74 4.72Zm5.82-7.95c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.58a9.58 9.58 0 0 1-1.77-2.2c-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64 0 1.56 1.14 3.06 1.3 3.27.16.21 2.24 3.42 5.43 4.8.76.32 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.14-.29-.22-.61-.38Z" />
              </svg>
            </span>
            Enviar por WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
                <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
              </svg>
            </span>
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Header from "../../../components/layout/Header";
import Footer from "../../../components/layout/Footer";
import { apiService } from "../../../services/api";
import { Articulo, Configuracion } from "../../../types";
import { useCart } from "../../../context/CartContext";
import Link from "next/link";
import { usePurchaseMode } from "../../../context/PurchaseModeContext";
import { formatPrice, obtenerPrecio } from "../../../lib/obtenerPrecio";
import OptimizedImage from "../../../components/common/OptimizedImage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id);
  const { addToCart } = useCart();
  const { tipoCompra } = usePurchaseMode();

  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Gallery and cart configuration
  const [activeImage, setActiveImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [articuloRes, configRes] = await Promise.all([
          apiService.getArticuloById(productId),
          apiService.getConfig().catch(() => ({ config: null })),
        ]);

        setArticulo(articuloRes.articulo);
        if (configRes && "config" in configRes) {
          setConfig(configRes.config);
        }

        const defaultImg = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60";
        setActiveImage(articuloRes.articulo.imagen_url || defaultImg);
      } catch (err) {
        console.error("Error loading article detail:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const handleAddToCart = () => {
    if (articulo) {
      addToCart(articulo, quantity);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-200 h-96 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="bg-slate-200 h-8 w-3/4 rounded"></div>
              <div className="bg-slate-200 h-6 w-1/4 rounded"></div>
              <div className="bg-slate-200 h-24 w-full rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!articulo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="max-w-md mx-auto py-20 text-center flex-1">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Artículo no encontrado</h2>
          <Link
            href="/"
            className="inline-block rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-foreground)]"
          >
            Volver al catálogo
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedPrice = formatPrice(obtenerPrecio(articulo, tipoCompra));

  const allImages = [
    articulo.imagen_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60",
    ...(articulo.imagenes?.map((img) => img.imagen_url) || []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header whatsappContact={config?.whatsapp_contacto} direccionLocal={config?.direccion_local} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-sky-500 transition-colors">Catálogo</Link>
          <span className="mx-2">&gt;</span>
          {articulo.rubro?.nombre && (
            <>
              <span className="text-slate-500">{articulo.rubro.nombre}</span>
              <span className="mx-2">&gt;</span>
            </>
          )}
          <span className="text-slate-600 font-medium line-clamp-1 inline">{articulo.descripcion_publica}</span>
        </div>

        {/* Product Details Split Layout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
          
          {/* Images Section */}
          <div className="space-y-4">
            {/* Primary View */}
            <div className="h-96 w-full relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
              <OptimizedImage
                src={activeImage}
                alt={articulo.descripcion_publica || "Artículo"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
              />
            </div>

            {/* Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`relative h-16 w-16 flex-shrink-0 bg-slate-50 border rounded-lg overflow-hidden transition-all ${
                      activeImage === img ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200"
                    }`}
                  >
                    <OptimizedImage src={img} alt={`Imagen ${i + 1}`} fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Code and Category tags */}
              <div className="flex items-center gap-3 text-xs mb-3">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
                  Cod: {articulo.codigo || "Sin Código"}
                </span>
                {articulo.rubro?.nombre && (
                  <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-bold">
                    {articulo.rubro.nombre}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 leading-snug">
                {articulo.descripcion_publica}
              </h1>

              {/* Price display */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Precio Estimado
                </span>
                <span className="text-3xl font-black text-slate-900">{formattedPrice}</span>
                <p className="text-[10px] text-slate-400 mt-2">
                  * Todos los valores son orientativos y quedan sujetos a revisión final en la facturación interna.
                </p>
              </div>
            </div>

            {/* Add to Cart Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 font-black text-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="px-6 font-bold text-slate-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 font-black text-lg transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 rounded-md bg-[var(--color-primary)] py-3 text-sm font-bold uppercase tracking-wider text-[var(--color-primary-foreground)] hover:brightness-95"
                >
                  Agregar al Pedido
                </button>
              </div>

              {/* Feedback Success banner */}
              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Se agregaron {quantity} unidades al pedido con éxito.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer direccionLocal={config?.direccion_local} />
    </div>
  );
}

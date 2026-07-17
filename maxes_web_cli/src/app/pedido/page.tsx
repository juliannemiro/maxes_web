"use client";

import { useState, useEffect } from "react";
import CantidadSelector from "../../components/common/CantidadSelector";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { useCart } from "../../context/CartContext";
import { useFavoritos } from "../../context/FavoritosContext";
import { apiService, PedidoCreado } from "../../services/api";
import { Articulo, Configuracion } from "../../types";
import Link from "next/link";
import { usePurchaseMode } from "../../context/PurchaseModeContext";
import { formatPrice, obtenerPrecio } from "../../lib/obtenerPrecio";
import OptimizedImage from "../../components/common/OptimizedImage";

export default function CheckoutPage() {
  const { cart, isHydrated, addToCart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { favoritos, isHydrated: favoritosHydrated } = useFavoritos();
  const { tipoCompra } = usePurchaseMode();
  const safeCart = isHydrated ? cart : [];
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loadedFavoriteArticles, setLoadedFavoriteArticles] = useState<Articulo[]>([]);
  const [favoritosExpanded, setFavoritosExpanded] = useState(false);
  const [favoriteQuantities, setFavoriteQuantities] = useState<Record<number, string>>({});
  const fieldMaxLengths = {
    nombre: 100,
    apellido: 100,
    docNumero: 20,
    docNumeroDni: 8,
    docNumeroMasked: 10,
    localidad: 150,
    email: 150,
    whatsapp: 15,
    numeroCliente: 50,
  } as const;

  // Form State
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [docTipo, setDocTipo] = useState("DNI");
  const [docNumero, setDocNumero] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [numeroCliente, setNumeroCliente] = useState("");
  const [entrega, setEntrega] = useState("retira_local");

  // UI Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<PedidoCreado | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await apiService.getConfig().catch(() => ({ config: null }));
        if (response && "config" in response) {
          setConfig(response.config);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!favoritosHydrated || favoritos.length === 0) {
      return;
    }

    let isCancelled = false;

    async function loadFavoriteArticles() {
      try {
        const response = await apiService.getArticulos({
          ids: favoritos,
          limit: favoritos.length,
        });

        if (!isCancelled) {
          setLoadedFavoriteArticles(response.articulos);
        }
      } catch (error) {
        console.error("Error loading favorite articles", error);
      }
    }

    loadFavoriteArticles();

    return () => {
      isCancelled = true;
    };
  }, [favoritos, favoritosHydrated]);

  const favoritosSet = new Set(favoritos);
  const favoriteArticles = favoritosHydrated
    ? loadedFavoriteArticles.filter((articulo) => favoritosSet.has(articulo.id))
    : [];

  const normalizeDocNumero = (value: string, tipo: string) => {
    if (tipo === "DNI") {
      return value.replace(/\D/g, "").slice(0, fieldMaxLengths.docNumeroDni);
    }

    return value.slice(0, fieldMaxLengths.docNumero);
  };

  const formatDocNumero = (value: string, tipo: string) => {
    if (tipo !== "DNI") {
      return value;
    }

    const digits = value.replace(/\D/g, "");
    if (!digits) {
      return "";
    }

    return new Intl.NumberFormat("es-AR").format(Number(digits));
  };

  const handleDocTipoChange = (value: string) => {
    setDocTipo(value);
    setDocNumero((current) => normalizeDocNumero(current, value));
  };

  const handleDocNumeroChange = (value: string) => {
    setDocNumero(normalizeDocNumero(value, docTipo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!nombre.trim()) {
      setErrorMessage("El nombre es requerido.");
      return;
    }
    if (!apellido.trim()) {
      setErrorMessage("El apellido es requerido.");
      return;
    }
    if (!docNumero.trim()) {
      setErrorMessage("El número de documento es requerido.");
      return;
    }
    if (docTipo === "DNI" && !/^\d{8}$/.test(docNumero)) {
      setErrorMessage("Si el tipo de documento es DNI, debe tener exactamente 8 números.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("El email es requerido.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Ingresá un email válido.");
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMessage("El número de WhatsApp es requerido.");
      return;
    }
    if (!/^[0-9+-]+$/.test(whatsapp.trim())) {
      setErrorMessage("El número de WhatsApp solo puede contener números, + y -.");
      return;
    }
    if (!localidad.trim()) {
      setErrorMessage("La localidad es requerida.");
      return;
    }
    if (safeCart.length === 0) {
      setErrorMessage("Tu carrito está vacío.");
      return;
    }

    setIsSubmitting(true);

    try {
      const pedidoData = {
        cliente_nombre: `${nombre.trim()} ${apellido.trim()}`.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cliente_nro: numeroCliente.trim(),
        doc_tipo: docTipo,
        doc_numero: docTipo === "DNI" ? docNumero.replace(/\D/g, "") : docNumero.trim(),
        cuit: null,
        monto_total: getCartTotal(tipoCompra),
        total: getCartTotal(tipoCompra),
        email: email.trim(),
        email_pedido: email.trim(),
        whatsapp,
        celular_pedido: whatsapp.trim(),
        localidad: localidad.trim(),
        observaciones: observaciones.trim(),
        entrega,
        tipo_despacho: entrega === "retira_local" ? "retira" : "recibe transporte",
        tipo_compra: tipoCompra,
        items: safeCart.map((item) => ({
          articulo_id: item.articulo.id,
          cantidad: item.cantidad,
          precio_unitario: obtenerPrecio(item.articulo, tipoCompra),
          comentario_cliente: item.comentario?.trim() ? item.comentario.trim().slice(0, 30) : null,
        })),
      };

      const response = await apiService.createPedido(pedidoData);

      if (response.success) {
        setOrderSuccess(response.order);
        clearCart();
      } else {
        setErrorMessage("Hubo un error al procesar el pedido. Reintente por favor.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Error al procesar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTotal = formatPrice(isHydrated ? getCartTotal(tipoCompra) : 0);
  const whatsappLink = config?.whatsapp_contacto
    ? `https://wa.me/${config.whatsapp_contacto.replace(/[^0-9]/g, "")}`
    : null;
  const favoritosCount = favoritosHydrated ? favoriteArticles.length : 0;
  const favoritosLabel =
    favoritosCount === 1
      ? "Tiene 1 producto en favoritos"
      : `Tiene ${favoritosCount} productos en favoritos`;

  const getArticuloTitulo = (item: (typeof safeCart)[number]) => {
    const articuloDes = item.articulo.articulo_des?.trim();
    if (articuloDes) {
      return articuloDes;
    }

    const descripcionPublica = item.articulo.descripcion_publica?.trim();
    if (descripcionPublica && descripcionPublica !== item.articulo.codigo) {
      return descripcionPublica;
    }

    return "Producto sin descripción";
  };

  const handleRequestRemove = (articuloId: number) => {
    setPendingRemoveId(articuloId);
  };

  const handleConfirmRemove = () => {
    if (pendingRemoveId !== null) {
      removeFromCart(pendingRemoveId);
    }
    setPendingRemoveId(null);
  };

  const handleFavoriteQuantityChange = (articuloId: number, value: string) => {
    setFavoriteQuantities((current) => ({
      ...current,
      [articuloId]: value.replace(/\D/g, ""),
    }));
  };

  const handleFavoriteQuantityStep = (articuloId: number, step: number) => {
    setFavoriteQuantities((current) => {
      const currentValue = Number.parseInt(current[articuloId] || "1", 10) || 1;
      const nextValue = Math.max(1, currentValue + step);
      return {
        ...current,
        [articuloId]: String(nextValue),
      };
    });
  };

  const handleAddFavoriteToCart = (articulo: Articulo) => {
    const cantidad = Number.parseInt(favoriteQuantities[articulo.id] || "1", 10) || 1;
    addToCart(articulo, Math.max(1, cantidad));
    setFavoriteQuantities((current) => ({
      ...current,
      [articulo.id]: "1",
    }));
  };

  // If order was successfully submitted
  if (orderSuccess) {
    const orderWhatsappLink = config?.whatsapp_contacto
      ? `https://wa.me/${config.whatsapp_contacto.replace(/[^0-9]/g, "")}?text=Hola!%20Realice%20el%20pedido%20Nº%20${orderSuccess.id}%20a%20nombre%20de%20${encodeURIComponent(orderSuccess.cliente_nombre)}.`
      : null;

    return (
      <div className="min-h-screen flex flex-col">
        <Header whatsappContact={config?.whatsapp_contacto} direccionLocal={config?.direccion_local} />
        <main className="max-w-xl mx-auto py-12 px-4 flex-1 w-full text-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-black text-slate-900 mb-2">¡Pedido Confirmado!</h1>
            <p className="text-base text-slate-500 mb-6">
              Tu pedido ha sido registrado con éxito. Un representante comercial se pondrá en contacto con vos a la brevedad.
            </p>

            {/* Receipt Summary Box */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-2 text-base text-slate-600 mb-6">
              <div><strong>Nº de Pedido:</strong> #{orderSuccess.id}</div>
              <div><strong>Cliente:</strong> {orderSuccess.cliente_nombre}</div>
              <div><strong>Doc:</strong> {orderSuccess.doc_tipo} {orderSuccess.doc_numero}</div>
              <div><strong>Total del Pedido:</strong> {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(orderSuccess.total)}</div>
            </div>

            <div className="flex flex-col gap-3">
              {orderWhatsappLink && (
                <a
                  href={orderWhatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-3.5 text-base font-bold text-white hover:bg-green-700"
                >
                  Avisar por WhatsApp
                </a>
              )}
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-400 px-4 py-3.5 text-base font-bold text-amber-950 transition-colors hover:bg-amber-300"
              >
                Volver a la página principal
              </Link>
            </div>
          </div>
        </main>
        <Footer direccionLocal={config?.direccion_local} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header whatsappContact={config?.whatsapp_contacto} direccionLocal={config?.direccion_local} />

      <main className="mx-auto flex-1 w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">

        {!isHydrated ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-slate-400 text-base">Cargando pedido...</p>
          </div>
        ) : safeCart.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No agregaste insumos</h3>
            <p className="text-slate-400 text-base mb-6 max-w-xs mx-auto">
              Navegá por nuestro catálogo y agregá los artículos que necesites.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-3.5 text-base font-bold text-[var(--color-primary-foreground)] hover:brightness-95"
            >
              Ver Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
            {/* Cart Items List */}
            <div className="space-y-4 xl:col-span-7">
              {favoritosCount > 0 && (
                <div className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-300 text-slate-950 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setFavoritosExpanded((current) => !current)}
                    aria-expanded={favoritosExpanded}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-amber-200"
                  >
                    <span className="text-base font-black">
                      {favoritosLabel}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-5 w-5 transition-transform ${
                        favoritosExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {favoritosExpanded && (
                    <div className="space-y-2 border-t border-amber-400 bg-amber-100 p-3">
                      {favoriteArticles.map((articulo) => {
                        const titulo =
                          articulo.articulo_des?.trim() ||
                          articulo.descripcion_publica?.trim() ||
                          "Producto sin descripción";
                        const cantidadFavorito =
                          Number.parseInt(favoriteQuantities[articulo.id] || "1", 10) || 1;
                        const totalFavorito = obtenerPrecio(articulo, tipoCompra) * cantidadFavorito;

                        return (
                          <div
                            key={articulo.id}
                            className="grid grid-cols-[72px_minmax(0,1fr)_96px_42px] items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 transition-colors hover:border-amber-400 sm:grid-cols-[72px_minmax(0,1fr)_112px_120px_42px] sm:gap-3 sm:p-3.5"
                          >
                            <OptimizedImage
                              src={articulo.imagen_url || "/placeholder.svg"}
                              alt={articulo.descripcion_publica || "Producto favorito"}
                              width={72}
                              height={72}
                              sizes="72px"
                              className="h-[72px] w-[72px] rounded-lg border border-amber-200 bg-white object-contain"
                            />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-base font-semibold leading-snug text-slate-800 sm:text-lg">
                                {titulo}
                              </p>
                              {articulo.proveedor_des && (
                                <p className="mt-1 hidden truncate text-sm font-semibold text-slate-600 sm:block">
                                  {articulo.proveedor_des}
                                </p>
                              )}
                              <p className="mt-1 text-sm font-black text-slate-800 sm:hidden">
                                {formatPrice(totalFavorito)}
                              </p>
                            </div>
                            <CantidadSelector
                              value={favoriteQuantities[articulo.id] || "1"}
                              onChange={(value) => handleFavoriteQuantityChange(articulo.id, value)}
                              onDecrement={() => handleFavoriteQuantityStep(articulo.id, -1)}
                              onIncrement={() => handleFavoriteQuantityStep(articulo.id, 1)}
                              ariaLabel={`Cantidad para ${titulo}`}
                              className="w-24 justify-self-end border-amber-200 bg-white sm:w-[112px]"
                              buttonClassName="px-2 py-1.5 text-sm hover:bg-amber-100 sm:px-2 sm:py-2"
                              valueClassName="px-1 text-sm"
                            />
                            <div className="hidden text-right sm:block sm:w-[120px]">
                              <span className="text-base font-bold text-slate-800">
                                {formatPrice(totalFavorito)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddFavoriteToCart(articulo)}
                              aria-label={`Agregar ${titulo} al carrito`}
                              title="Agregar"
                              className="group relative flex h-10 w-10 items-center justify-center justify-self-end rounded-full bg-amber-400 text-slate-950 shadow-sm transition hover:scale-105 hover:bg-amber-300"
                            >
                              <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden rounded bg-slate-950 px-2 py-1 text-xs font-bold text-white shadow-sm group-hover:block">
                                Agregar
                              </span>
                              <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                aria-hidden="true"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">Resumen de Compra</h2>
              </div>

              {safeCart.map((item) => {
                const itemTotal = obtenerPrecio(item.articulo, tipoCompra) * item.cantidad;
                const formattedItemTotal = formatPrice(itemTotal);
                return (
                  <div
                    key={item.articulo.id}
                    className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 sm:grid-cols-[72px_minmax(0,1fr)_150px_120px_40px] sm:items-center sm:p-3.5"
                  >
                    <OptimizedImage
                      src={item.articulo.imagen_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&auto=format&fit=crop&q=60"}
                      alt={item.articulo.descripcion_publica || ""}
                      width={72}
                      height={72}
                      sizes="72px"
                      className="h-[72px] w-[72px] object-cover rounded-lg bg-slate-50 border border-slate-100"
                    />
                    <div className="flex min-h-[72px] min-w-0 flex-col justify-between text-left sm:block">
                      <h4 className="text-base font-semibold leading-snug text-slate-800 sm:text-lg">
                        {getArticuloTitulo(item)}
                        {item.articulo.proveedor_des && (
                          <span className="font-medium text-slate-500">
                            {` - ${item.articulo.proveedor_des}`}
                          </span>
                        )}
                      </h4>
                      <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 sm:hidden">
                        <CantidadSelector
                          value={item.cantidad}
                          onChange={(value) => updateQuantity(item.articulo.id, Number.parseInt(value.replace(/\D/g, ""), 10) || 0)}
                          onDecrement={() => updateQuantity(item.articulo.id, item.cantidad - 1)}
                          onIncrement={() => updateQuantity(item.articulo.id, item.cantidad + 1)}
                          className="w-[108px] justify-self-center"
                        />
                        <span className="min-w-[92px] text-right text-base font-bold text-slate-800">{formattedItemTotal}</span>
                        <button
                          onClick={() => handleRequestRemove(item.articulo.id)}
                          className="justify-self-end text-slate-300 transition-colors hover:text-red-500"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <CantidadSelector
                      value={item.cantidad}
                      onChange={(value) => updateQuantity(item.articulo.id, Number.parseInt(value.replace(/\D/g, ""), 10) || 0)}
                      onDecrement={() => updateQuantity(item.articulo.id, item.cantidad - 1)}
                      onIncrement={() => updateQuantity(item.articulo.id, item.cantidad + 1)}
                      className="hidden w-[118px] sm:col-span-1 sm:flex sm:justify-self-center"
                    />

                    <div className="hidden text-right sm:col-span-1 sm:block sm:w-[120px]">
                      <span className="text-base font-bold text-slate-800">{formattedItemTotal}</span>
                    </div>

                    <button
                      onClick={() => handleRequestRemove(item.articulo.id)}
                      className="hidden text-slate-300 transition-colors hover:text-red-500 sm:justify-self-center sm:block"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg font-black text-slate-900 shadow-sm sm:grid-cols-[72px_minmax(0,1fr)_150px_120px_40px] sm:px-3.5">
                <span aria-hidden="true" className="hidden sm:block" />
                <span>Total del Pedido</span>
                <span aria-hidden="true" className="hidden sm:block" />
                <span className="min-w-[92px] text-right sm:w-[120px]">{formattedTotal}</span>
                <span aria-hidden="true" className="hidden sm:block" />
              </div>
            </div>

            {/* Customer Checkout Form */}
            <div className="xl:col-span-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm xl:sticky xl:top-24 space-y-6">
                <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">
                  Datos para completar el pedido
                </h3>

                {/* Form fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={fieldMaxLengths.nombre}
                        placeholder="Juan"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        required
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        maxLength={fieldMaxLengths.apellido}
                        placeholder="Pérez"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 sm:grid-cols-[104px_170px_minmax(0,1fr)] sm:gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Tipo Doc *
                      </label>
                      <select
                        value={docTipo}
                        onChange={(e) => handleDocTipoChange(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option>DNI</option>
                        <option>LC</option>
                        <option>LE</option>
                        <option>Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Nro. Doc *
                      </label>
                      <input
                        type="text"
                        required
                        value={formatDocNumero(docNumero, docTipo)}
                        onChange={(e) => handleDocNumeroChange(e.target.value)}
                        maxLength={docTipo === "DNI" ? fieldMaxLengths.docNumeroMasked : fieldMaxLengths.docNumero}
                        inputMode={docTipo === "DNI" ? "numeric" : "text"}
                        placeholder={docTipo === "DNI" ? "12.345.678" : "ABC12345"}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Localidad *
                      </label>
                      <input
                        type="text"
                        required
                        value={localidad}
                        onChange={(e) => setLocalidad(e.target.value)}
                        maxLength={fieldMaxLengths.localidad}
                        placeholder="San Justo"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={fieldMaxLengths.email}
                        placeholder="cliente@email.com"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Nro. Whatsapp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+-]/g, ""))}
                        maxLength={fieldMaxLengths.whatsapp}
                        inputMode="tel"
                        pattern="[0-9+-]+"
                        placeholder="+54 11 2847 8046"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                      
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Número de cliente
                      </label>
                      <input
                        type="text"
                        value={numeroCliente}
                        onChange={(e) => setNumeroCliente(e.target.value)}
                        maxLength={fieldMaxLengths.numeroCliente}
                        placeholder="Ver en detalle de ultima compra"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-500 block mb-2">
                        Entrega *
                      </label>
                      <select
                        required
                        value={entrega}
                        onChange={(e) => setEntrega(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base placeholder:italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                      >
                        <option value="retira_local">Retira del local</option>
                        <option value="recibe_transporte">Recibe de transporte</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-500 block mb-2">
                      Observaciones
                    </label>
                    <input
                      type="text"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Aclaraciones sobre horario de entrega, etc..."
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-semibold">{errorMessage}</p>
                      <p className="mt-1 italic">
                        Ante cualquier consulta comuníquese por WhatsApp a{" "}
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-red-700 underline underline-offset-2"
                          >
                            {config?.whatsapp_contacto}
                          </a>
                        ) : (
                          <span className="font-semibold">{config?.whatsapp_contacto || "nuestro número de contacto"}</span>
                        )}
                        .
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-400 px-5 py-3.5 text-base font-extrabold text-amber-950 transition-colors hover:bg-amber-300 disabled:opacity-55"
                    >
                      {isSubmitting ? "Procesando..." : "Confirmar Pedido"}
                    </button>

                    <Link
                      href="/"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-center text-base font-extrabold text-slate-800 transition-colors hover:bg-slate-200"
                    >
                      Buscar más productos
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {pendingRemoveId !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirmar eliminación</h3>
            <p className="mt-2 text-sm text-slate-600">¿Está seguro que desea eliminar este producto?</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-primary-foreground)] transition-colors hover:brightness-95"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setPendingRemoveId(null)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-200"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer direccionLocal={config?.direccion_local} />
    </div>
  );
}

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Articulo } from "@/types";
import { apiService } from "@/services/api";
import { obtenerPrecio, TipoPrecio } from "@/utils/precio";
import { createAnalyticsIncorporationId, syncAnalyticsCart } from "@/services/analytics/client";
import { usePurchaseMode } from "@/context/PurchaseModeContext";
import { useFavoritos } from "@/context/FavoritosContext";

export interface CartItem {
  articulo: Articulo;
  cantidad: number;
  comentario?: string;
  id_incorporacion_analytics: string;
  tuvo_comentario_analytics: boolean;
  origen_incorporacion_analytics: string;
  era_favorito_al_agregar_analytics: boolean;
}

interface CartContextType {
  cart: CartItem[];
  isHydrated: boolean;
  addToCart: (articulo: Articulo, cantidad?: number, comentario?: string) => void;
  removeFromCart: (articuloId: number) => void;
  updateQuantity: (articuloId: number, cantidad: number) => void;
  updateComment: (articuloId: number, comentario: string) => void;
  clearCart: () => void;
  getCartTotal: (tipoPrecio?: TipoPrecio) => number;
  getItemCount: () => number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { tipoPrecio } = usePurchaseMode();
  const { isFavorito } = useFavoritos();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const syncCartFromStorage = async () => {
      const savedCart = window.localStorage.getItem("maxes_cart");
      if (!savedCart) {
        if (!isCancelled) {
          setIsHydrated(true);
        }
        return;
      }

      try {
        const parsedCart = JSON.parse(savedCart) as Array<Partial<CartItem> & Pick<CartItem, "articulo" | "cantidad">>;
        const refreshedCart = await Promise.all(
          parsedCart.map(async (item) => {
            const analyticsFields = {
              id_incorporacion_analytics:
                item.id_incorporacion_analytics || createAnalyticsIncorporationId(),
              tuvo_comentario_analytics:
                item.tuvo_comentario_analytics === true || Boolean(item.comentario?.trim()),
              origen_incorporacion_analytics:
                item.origen_incorporacion_analytics || "catalogo",
              era_favorito_al_agregar_analytics:
                item.era_favorito_al_agregar_analytics === true,
            };
            try {
              const response = await apiService.getArticuloById(item.articulo.id);
              return {
                ...item,
                ...analyticsFields,
                articulo: {
                  ...item.articulo,
                  ...response.articulo,
                },
              };
            } catch {
              return { ...item, ...analyticsFields } as CartItem;
            }
          })
        );

        if (!isCancelled) {
          setCart(refreshedCart);
        }
      } catch (error) {
        console.error("Error loading cart from localStorage", error);
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    queueMicrotask(() => {
      void syncCartFromStorage();
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem("maxes_cart", JSON.stringify(cart));
    void syncAnalyticsCart({
      tipo_precio: tipoPrecio,
      items: cart.map((item) => ({
        id_incorporacion: item.id_incorporacion_analytics,
        articulo_id: item.articulo.id,
        cantidad: item.cantidad,
        precio_unitario: obtenerPrecio(item.articulo, tipoPrecio),
        tiene_comentario: item.tuvo_comentario_analytics || Boolean(item.comentario?.trim()),
        origen_incorporacion: item.origen_incorporacion_analytics,
        era_favorito_al_agregar: item.era_favorito_al_agregar_analytics,
      })),
    }).catch((error) => {
      console.error("Error syncing analytics cart", error);
    });
  }, [cart, isHydrated, tipoPrecio]);

  const addToCart = (articulo: Articulo, cantidad = 1, comentario = "") => {
    const cantidadValida = cantidad > 0 ? cantidad : 1;
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.articulo.id === articulo.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.articulo.id === articulo.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidadValida,
              comentario: comentario || item.comentario || "",
              tuvo_comentario_analytics:
                item.tuvo_comentario_analytics || Boolean(comentario.trim()),
              }
            : item
        );
      }
      return [
        ...prevCart,
        {
          articulo,
          cantidad: cantidadValida,
          comentario,
          id_incorporacion_analytics: createAnalyticsIncorporationId(),
          tuvo_comentario_analytics: Boolean(comentario.trim()),
          origen_incorporacion_analytics:
            window.location.pathname === "/favoritos"
              ? "panel_favoritos"
              : window.location.pathname === "/pedido"
                ? "favoritos_en_pedido"
                : "catalogo",
          era_favorito_al_agregar_analytics: isFavorito(articulo.id),
        },
      ];
    });
  };

  const removeFromCart = (articuloId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.articulo.id !== articuloId));
  };

  const updateQuantity = (articuloId: number, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(articuloId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.articulo.id === articuloId ? { ...item, cantidad } : item
      )
    );
  };

  const updateComment = (articuloId: number, comentario: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.articulo.id === articuloId
          ? {
              ...item,
              comentario,
              tuvo_comentario_analytics:
                item.tuvo_comentario_analytics || Boolean(comentario.trim()),
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = (tipoPrecio: TipoPrecio = "mayorista") => {
    return cart.reduce((total, item) => {
      const precio = obtenerPrecio(item.articulo, tipoPrecio);
      return total + precio * item.cantidad;
    }, 0);
  };

  const getItemCount = () => {
    return cart.reduce((count, item) => count + item.cantidad, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isHydrated,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateComment,
        clearCart,
        getCartTotal,
        getItemCount,
        isOpen,
        setOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

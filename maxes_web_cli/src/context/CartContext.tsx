"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Articulo } from "../types";
import { apiService } from "../services/api";
import { obtenerPrecio, TipoCompra } from "../lib/obtenerPrecio";

export interface CartItem {
  articulo: Articulo;
  cantidad: number;
  comentario?: string;
}

interface CartContextType {
  cart: CartItem[];
  isHydrated: boolean;
  addToCart: (articulo: Articulo, cantidad?: number, comentario?: string) => void;
  removeFromCart: (articuloId: number) => void;
  updateQuantity: (articuloId: number, cantidad: number) => void;
  updateComment: (articuloId: number, comentario: string) => void;
  clearCart: () => void;
  getCartTotal: (tipoCompra?: TipoCompra) => number;
  getItemCount: () => number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
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
        const parsedCart = JSON.parse(savedCart) as CartItem[];
        const refreshedCart = await Promise.all(
          parsedCart.map(async (item) => {
            try {
              const response = await apiService.getArticuloById(item.articulo.id);
              return {
                ...item,
                articulo: {
                  ...item.articulo,
                  ...response.articulo,
                },
              };
            } catch {
              return item;
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
  }, [cart, isHydrated]);

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
              }
            : item
        );
      }
      return [...prevCart, { articulo, cantidad: cantidadValida, comentario }];
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
        item.articulo.id === articuloId ? { ...item, comentario } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = (tipoCompra: TipoCompra = "mayorista") => {
    return cart.reduce((total, item) => {
      const precio = obtenerPrecio(item.articulo, tipoCompra);
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

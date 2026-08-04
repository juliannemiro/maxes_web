import { Articulo } from "../types";

export type TipoPrecio = "mayorista" | "minorista";

export function obtenerPrecio(articulo: Articulo, tipoPrecio: TipoPrecio): number {
  const precioSeleccionado =
    tipoPrecio === "minorista" ? articulo.precio_minorista : articulo.precio_mayorista;
  const precioFallback =
    tipoPrecio === "minorista" ? articulo.precio_mayorista : articulo.precio_minorista;

  return Number(precioSeleccionado ?? precioFallback ?? 0);
}

export function formatPrice(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "Consultar";
  }

  return "$" + Number(value).toLocaleString("es-AR");
}

import { Articulo } from "../types";

export type TipoCompra = "mayorista" | "minorista";

export function obtenerPrecio(articulo: Articulo, tipoCompra: TipoCompra): number {
  const precioSeleccionado =
    tipoCompra === "minorista" ? articulo.precio_minorista : articulo.precio_mayorista;
  const precioFallback =
    tipoCompra === "minorista" ? articulo.precio_mayorista : articulo.precio_minorista;

  return Number(precioSeleccionado ?? precioFallback ?? 0);
}

export function formatPrice(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "Consultar";
  }

  return "$" + Number(value).toLocaleString("es-AR");
}

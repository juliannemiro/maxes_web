import { Articulo } from "@/types";

function texto(value: string | null | undefined) {
  const normalizado = value?.trim();
  return normalizado || null;
}

/** Texto alternativo consistente para las imágenes de productos publicadas. */
export function altImagenArticulo(articulo: Articulo, fallback = "Producto MAXES") {
  const nombre = texto(articulo.articulo_des);
  const descripcion = texto(articulo.descripcion_detallada) || texto(articulo.descripcion_publica);
  const marca = texto(articulo.marca_des);
  const partes = [nombre];

  if (descripcion && descripcion.localeCompare(nombre || "", "es", { sensitivity: "base" }) !== 0) {
    partes.push(descripcion);
  }
  if (marca) partes.push(`Marca: ${marca}`);

  return partes.filter((parte): parte is string => Boolean(parte)).join(" — ") || fallback;
}

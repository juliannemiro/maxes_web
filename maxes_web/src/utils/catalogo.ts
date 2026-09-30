import { normalizeNullableString } from "./strings";

/** Utilidades de transformación para la sincronización de catálogo. */

/** Normaliza un indicador S/N aceptando strings y booleanos. */
export function toIndicadorSN(value: unknown, defaultValue: "S" | "N" = "N"): "S" | "N" {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "S" || normalized === "N") {
      return normalized;
    }
    if (normalized === "TRUE") return "S";
    if (normalized === "FALSE") return "N";
  }

  if (typeof value === "boolean") {
    return value ? "S" : "N";
  }

  return defaultValue;
}

/** Genera un código de categoria a partir de un nombre. */
export function slugifyCategoriaCode(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 20) || "SIN-CATEGORIA"
  );
}

/** Resuelve código y nombre de categoria a partir de los alias que envía el origen. */
export function resolveCategoria(item: any): { categoriaCodigo: string | null; categoriaNombre: string } {
  const categoriaNombre = normalizeNullableString(item.categoria) || normalizeNullableString(item.categoria_nombre);
  const categoriaCodigo = normalizeNullableString(item.categoria_codigo) || (categoriaNombre ? slugifyCategoriaCode(categoriaNombre) : null);

  return {
    categoriaCodigo,
    categoriaNombre: categoriaNombre || categoriaCodigo || "Sin categoria",
  };
}

/** Extrae y deduplica las URLs de imagen de un artículo entrante. */
export function extractImageUrls(item: any): string[] {
  const urls: string[] = [];

  if (Array.isArray(item.imagenes)) {
    for (const imagen of item.imagenes) {
      const candidate =
        typeof imagen === "string"
          ? imagen
          : normalizeNullableString(imagen?.imagen_url) || normalizeNullableString(imagen?.url);
      if (candidate) {
        urls.push(candidate);
      }
    }
  }

  const imagenPrincipal = normalizeNullableString(item.imagen_url);
  if (imagenPrincipal) {
    urls.push(imagenPrincipal);
  }

  for (const [key, value] of Object.entries(item)) {
    if (!/^imagen\s*\d+$/i.test(key)) {
      continue;
    }
    const candidate = normalizeNullableString(value);
    if (candidate) {
      urls.push(candidate);
    }
  }

  return [...new Set(urls)];
}

import { Articulo } from "../types";

export function normalizeCatalogText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function groupArticulosByCategoria(list: Articulo[]) {
  const groups = new Map<string, Articulo[]>();

  for (const articulo of list) {
    const key = articulo.rubro?.nombre || "NOVEDADES";
    const existing = groups.get(key) ?? [];
    existing.push(articulo);
    groups.set(key, existing);
  }

  return Array.from(groups.entries());
}

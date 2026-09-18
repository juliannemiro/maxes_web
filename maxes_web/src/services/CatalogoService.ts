import prisma from "../config/prisma";
import { AppError } from "../utils/appError";
import { extractImageUrls, resolveRubro, toIndicadorSN } from "../utils/catalogo";
import { normalizeNullableString } from "../utils/strings";
import type { ArticuloSyncInput, RubroSyncInput, SyncCatalogPayload } from "../types";

/**
 * Sincronización del catálogo publicado en la web.
 * Recibe rubros y artículos desde el sistema interno y los persiste en
 * PostgreSQL/Supabase (`rubro_web`, `articulo_web`, `articulo_imagen_web`).
 */
export class CatalogoService {
  /** Sincroniza rubros por id (o los crea si no existe el id). */
  async syncRubros(rubros: unknown) {
    if (!Array.isArray(rubros)) {
      throw new AppError(400, "rubros must be an array");
    }

    const results = [];
    for (const item of rubros as RubroSyncInput[]) {
      const { codigo, nombre, activo } = item;
      const rubro = await prisma.rubro.upsert({
        where: { id: item.id || -1 },
        create: { codigo, nombre, activo: activo !== undefined ? activo : true },
        update: { codigo, nombre, activo: activo !== undefined ? activo : true },
      });
      results.push(rubro);
    }

    return { success: true, count: results.length };
  }

  /** Sincroniza artículos (upsert por código) y sus imágenes. */
  async syncArticulos(articulos: unknown) {
    if (!Array.isArray(articulos)) {
      throw new AppError(400, "articulos must be an array");
    }

    const results = [];
    for (const item of articulos as ArticuloSyncInput[]) {
      const rubroId = await this.ensureRubro(item);
      const imageUrls = extractImageUrls(item);
      const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";

      const articulo = await prisma.articulo.upsert({
        where: { articuloCod: codigo },
        create: this.buildArticuloData(item, rubroId),
        update: this.buildArticuloData(item, rubroId),
      });

      await this.syncArticuloImagenes(articulo.id, imageUrls);
      results.push(articulo);
    }

    return { success: true, count: results.length };
  }

  /** Sincroniza rubros y artículos en una sola llamada. */
  async syncCatalog(payload: SyncCatalogPayload) {
    const { rubros, articulos } = payload ?? {};

    if (rubros && Array.isArray(rubros)) {
      for (const item of rubros) {
        const { codigo, nombre, activo } = item;
        const existing = await prisma.rubro.findFirst({ where: { codigo } });

        if (existing) {
          await prisma.rubro.update({
            where: { id: existing.id },
            data: { nombre, activo: activo !== undefined ? activo : true },
          });
        } else {
          await prisma.rubro.create({
            data: { codigo, nombre, activo: activo !== undefined ? activo : true },
          });
        }
      }
    }

    if (articulos && Array.isArray(articulos)) {
      for (const item of articulos) {
        const rubroId = await this.ensureRubro(item);
        const imageUrls = extractImageUrls(item);
        const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";
        const existingArt = await prisma.articulo.findUnique({ where: { articuloCod: codigo } });

        if (existingArt) {
          const articulo = await prisma.articulo.update({
            where: { id: existingArt.id },
            data: this.buildArticuloData(item, rubroId),
          });
          await this.syncArticuloImagenes(articulo.id, imageUrls);
        } else {
          const articulo = await prisma.articulo.create({
            data: this.buildArticuloData(item, rubroId),
          });
          await this.syncArticuloImagenes(articulo.id, imageUrls);
        }
      }
    }

    return { success: true, message: "Catalog synced successfully" };
  }

  /** Resuelve (y crea/actualiza) el rubro de un artículo entrante. */
  private async ensureRubro(item: ArticuloSyncInput): Promise<number | null> {
    const { rubroCodigo, rubroNombre } = resolveRubro(item);
    if (!rubroCodigo) {
      return null;
    }

    const existing = await prisma.rubro.findFirst({ where: { codigo: rubroCodigo } });

    if (existing) {
      if (existing.nombre !== rubroNombre || existing.activo !== true) {
        await prisma.rubro.update({
          where: { id: existing.id },
          data: { nombre: rubroNombre, activo: true },
        });
      }

      return existing.id;
    }

    const created = await prisma.rubro.create({
      data: { codigo: rubroCodigo, nombre: rubroNombre, activo: true },
    });

    return created.id;
  }

  /** Reemplaza las imágenes del artículo y marca la principal. */
  private async syncArticuloImagenes(articuloId: number, imageUrls: string[]) {
    if (imageUrls.length === 0) {
      return;
    }

    await prisma.articuloImagen.deleteMany({ where: { articuloId } });

    await prisma.articuloImagen.createMany({
      data: imageUrls.map((imagenUrl, index) => ({
        articuloId,
        imagen_url: imagenUrl.slice(0, 500),
        orden: index + 1,
      })),
    });

    const imagenPrincipal = await prisma.articuloImagen.findFirst({
      where: { articuloId },
      orderBy: { orden: "asc" },
    });

    await prisma.articulo.update({
      where: { id: articuloId },
      data: { articuloImagenId: imagenPrincipal?.id ?? null },
    });
  }

  /** Normaliza el payload de un artículo entrante al formato de `articulo_web`. */
  private buildArticuloData(item: ArticuloSyncInput, rubroId: number | null) {
    const articuloDes =
      normalizeNullableString(item.articulo_des) ||
      normalizeNullableString(item.descripcion_publica) ||
      normalizeNullableString(item.articulo_descripcion);
    const articuloTextoWeb =
      normalizeNullableString(item.articulo_texto_web) ||
      normalizeNullableString(item.descripcion_detallada) ||
      articuloDes;
    const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";
    const proveedor = normalizeNullableString(item.proveedor_des) || normalizeNullableString(item.proveedor);

    return {
      articuloOrigenId: Number(item.articulo_id_origen || 0),
      articuloCod: codigo,
      articuloDes: articuloDes ? articuloDes.slice(0, 30) : null,
      articuloTextoWeb: articuloTextoWeb ? articuloTextoWeb.slice(0, 50) : null,
      precioMayorista: item.precio_mayorista != null ? Number(item.precio_mayorista) : null,
      precioMinorista: item.precio_minorista != null ? Number(item.precio_minorista) : null,
      rubroId,
      proveedorDes: proveedor ? proveedor.slice(0, 20) : null,
      stockWeb: item.stock_web != null ? Number(item.stock_web) : null,
      destacado: toIndicadorSN(item.destacado, "N"),
      visible: toIndicadorSN(item.visible, "S"),
    };
  }
}

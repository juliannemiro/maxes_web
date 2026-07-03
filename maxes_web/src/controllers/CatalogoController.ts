import { Request, Response } from "express";
import prisma from "../config/prisma";

function toIndicadorSN(value: unknown, defaultValue: "S" | "N" = "N"): "S" | "N" {
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

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugifyRubroCode(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 20) || "SIN-RUBRO"
  );
}

function resolveRubro(item: any) {
  const rubroNombre = normalizeNullableString(item.rubro) || normalizeNullableString(item.rubro_nombre);
  const rubroCodigo = normalizeNullableString(item.rubro_codigo) || (rubroNombre ? slugifyRubroCode(rubroNombre) : null);

  return {
    rubroCodigo,
    rubroNombre: rubroNombre || rubroCodigo || "Sin rubro",
  };
}

function extractImageUrls(item: any) {
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

function buildArticuloData(item: any, rubroId: number | null) {
  const articuloDes =
    normalizeNullableString(item.articulo_des) ||
    normalizeNullableString(item.descripcion_publica) ||
    normalizeNullableString(item.articulo_descripcion);
  const articuloTextoWeb =
    normalizeNullableString(item.articulo_texto_web) ||
    normalizeNullableString(item.descripcion_detallada) ||
    articuloDes;
  const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";
  const proveedor =
    normalizeNullableString(item.proveedor_des) || normalizeNullableString(item.proveedor);

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

async function ensureRubro(item: any) {
  const { rubroCodigo, rubroNombre } = resolveRubro(item);
  if (!rubroCodigo) {
    return null;
  }

  const existing = await prisma.rubro.findFirst({
    where: { codigo: rubroCodigo },
  });

  if (existing) {
    if (existing.nombre !== rubroNombre || existing.activo !== true) {
      await prisma.rubro.update({
        where: { id: existing.id },
        data: {
          nombre: rubroNombre,
          activo: true,
        },
      });
    }

    return existing.id;
  }

  const created = await prisma.rubro.create({
    data: {
      codigo: rubroCodigo,
      nombre: rubroNombre,
      activo: true,
    },
  });

  return created.id;
}

async function syncArticuloImagenes(articuloId: number, imageUrls: string[]) {
  if (imageUrls.length === 0) {
    return;
  }

  await prisma.articuloImagen.deleteMany({
    where: { articuloId },
  });

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
    data: {
      articuloImagenId: imagenPrincipal?.id ?? null,
    },
  });
}

export class CatalogoController {
  // Sync Rubros (Categories)
  static async syncRubros(req: Request, res: Response) {
    try {
      const { rubros } = req.body; // Expects array of rubros

      if (!Array.isArray(rubros)) {
        return res.status(400).json({ error: "rubros must be an array" });
      }

      const results = [];
      for (const item of rubros) {
        const { codigo, nombre, activo } = item;
        const rubro = await prisma.rubro.upsert({
          where: { id: item.id || -1 }, // If ID is sent, use it, else match or create
          create: {
            codigo,
            nombre,
            activo: activo !== undefined ? activo : true,
          },
          update: {
            codigo,
            nombre,
            activo: activo !== undefined ? activo : true,
          },
        });
        results.push(rubro);
      }

      return res.json({ success: true, count: results.length });
    } catch (error: any) {
      console.error("Error in syncRubros:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Sync Articulos (Catalog Products)
  static async syncArticulos(req: Request, res: Response) {
    try {
      const { articulos } = req.body; // Expects array of articles

      if (!Array.isArray(articulos)) {
        return res.status(400).json({ error: "articulos must be an array" });
      }

      const results = [];
      for (const item of articulos) {
        const rubro_id = await ensureRubro(item);
        const imageUrls = extractImageUrls(item);
        const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";

        const articulo = await prisma.articulo.upsert({
          where: { articuloCod: codigo },
          create: buildArticuloData(item, rubro_id),
          update: buildArticuloData(item, rubro_id),
        });

        await syncArticuloImagenes(articulo.id, imageUrls);
        results.push(articulo);
      }

      return res.json({ success: true, count: results.length });
    } catch (error: any) {
      console.error("Error in syncArticulos:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Sync complete catalog (Rubros + Articulos in one call)
  static async syncCatalog(req: Request, res: Response) {
    try {
      const { rubros, articulos } = req.body;

      if (rubros && Array.isArray(rubros)) {
        for (const item of rubros) {
          const { codigo, nombre, activo } = item;
          // Find if there is an existing rubro with the same code
          const existing = await prisma.rubro.findFirst({
            where: { codigo },
          });

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
          const rubro_id = await ensureRubro(item);
          const imageUrls = extractImageUrls(item);
          const codigo = normalizeNullableString(item.codigo) || normalizeNullableString(item.articulo_cod) || "";
          const existingArt = await prisma.articulo.findUnique({
            where: { articuloCod: codigo },
          });

          if (existingArt) {
            const articulo = await prisma.articulo.update({
              where: { id: existingArt.id },
              data: buildArticuloData(item, rubro_id),
            });
            await syncArticuloImagenes(articulo.id, imageUrls);
          } else {
            const articulo = await prisma.articulo.create({
              data: buildArticuloData(item, rubro_id),
            });
            await syncArticuloImagenes(articulo.id, imageUrls);
          }
        }
      }

      return res.json({ success: true, message: "Catalog synced successfully" });
    } catch (error: any) {
      console.error("Error in syncCatalog:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

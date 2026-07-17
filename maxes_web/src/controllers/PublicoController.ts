import { Request, Response } from "express";
import prisma from "../config/prisma";

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateMaxLength(value: string | null, maxLength: number, label: string) {
  if (value && value.length > maxLength) {
    return `${label} supera el máximo de ${maxLength} caracteres.`;
  }

  return null;
}

function normalizeWithoutTruncating(value: unknown) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeWhatsapp(value: unknown) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  if (!/^[0-9+-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function serializeArticulo(articulo: any) {
  return {
    id: articulo.id,
    articulo_id_origen: articulo.articuloOrigenId,
    codigo: articulo.articuloCod,
    articulo_des: articulo.articuloDes,
    proveedor_des: articulo.proveedorDes,
    descripcion_publica: articulo.articuloTextoWeb || articulo.articuloDes,
    descripcion_detallada: articulo.articuloTextoWeb || articulo.articuloDes,
    precio_mayorista: articulo.precioMayorista,
    precio_minorista: articulo.precioMinorista,
    rubro_id: articulo.rubroId,
    imagen_url: articulo.imagenPrincipal?.imagen_url || articulo.imagenes?.[0]?.imagen_url || null,
    destacado: articulo.destacado === "S",
    visible: articulo.visible === "S",
    fecha_publicacion: articulo.fechaPublicacion,
    rubro: articulo.rubro,
    imagenes: articulo.imagenes,
  };
}

export class PublicoController {
  private static serializePedidoForClient(pedido: any) {
    return {
      ...pedido,
      cliente_nombre: [pedido.nombre, pedido.apellido].filter(Boolean).join(" ").trim(),
      total: pedido.monto_total,
    };
  }

  // Get all active rubros
  static async getRubros(req: Request, res: Response) {
    try {
      const rubros = await prisma.rubro.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      });
      return res.json({ success: true, rubros });
    } catch (error: any) {
      console.error("Error in getRubros:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get articles (with filters & pagination)
  static async getArticulos(req: Request, res: Response) {
    try {
      const { rubro_id, search, destacado, page = 1, limit = 20 } = req.query;

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const skip = (pageNumber - 1) * limitNumber;

      const whereClause: any = {};
      whereClause.visible = "S";
      whereClause.precioMayorista = {
        gt: 0,
      };
      whereClause.precioMinorista = {
        gt: 0,
      };

      if (rubro_id) {
        whereClause.rubroId = parseInt(rubro_id as string);
      }

      if (destacado) {
        whereClause.destacado = destacado === "true" ? "S" : "N";
      }

      if (search) {
        const searchTerms = (search as string).trim().split(/\s+/).filter(Boolean);
        whereClause.AND = searchTerms.map((term) => ({
          OR: [
            { articuloCod: { contains: term, mode: "insensitive" } },
            { articuloDes: { contains: term, mode: "insensitive" } },
            { articuloTextoWeb: { contains: term, mode: "insensitive" } },
          ],
        }));
      }

      const [articulos, totalCount] = await prisma.$transaction([
        prisma.articulo.findMany({
          where: whereClause,
          include: {
            rubro: true,
            imagenes: {
              orderBy: { orden: "asc" },
            },
            imagenPrincipal: true,
          },
          skip,
          take: limitNumber,
          orderBy: { fechaPublicacion: "desc" },
        }),
        prisma.articulo.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNumber);

      return res.json({
        success: true,
        articulos: articulos.map(serializeArticulo),
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
      });
    } catch (error: any) {
      console.error("Error in getArticulos:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get specific article detail
  static async getArticuloById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const articulo = await prisma.articulo.findFirst({
        where: {
          id: parseInt(id),
          visible: "S",
          precioMayorista: {
            gt: 0,
          },
          precioMinorista: {
            gt: 0,
          },
        },
        include: {
          rubro: true,
          imagenes: {
            orderBy: { orden: "asc" },
          },
          imagenPrincipal: true,
        },
      });

      if (!articulo) {
        return res.status(404).json({ error: "Article not found" });
      }

      return res.json({ success: true, articulo: serializeArticulo(articulo) });
    } catch (error: any) {
      console.error("Error in getArticuloById:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get active home carousel items
  static async getCarruseles(req: Request, res: Response) {
    try {
      const carruseles = await prisma.carruselHome.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
      });
      return res.json({ success: true, carruseles });
    } catch (error: any) {
      console.error("Error in getCarruseles:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get Web configuration
  static async getConfig(req: Request, res: Response) {
    try {
      const config = await prisma.configuracion.findFirst();

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      return res.json({ success: true, config });
    } catch (error: any) {
      console.error("Error in getConfig:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Create order from client
  static async createPedido(req: Request, res: Response) {
    try {
      const {
        cliente_nombre,
        nombre,
        apellido,
        cliente_nro,
        doc_tipo,
        doc_number, // support both doc_number/doc_numero
        doc_numero,
        cuit,
        email,
        email_pedido,
        whatsapp,
        celular_pedido,
        observaciones,
        componente,
        tipo_compra,
        total,
        monto_total,
        tipo_despacho,
        entrega,
        localidad,
        items, // Array of { articulo_id, cantidad, precio_unitario, comentario_cliente }
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields or items is empty" });
      }

      const finalDocNumero = doc_numero || doc_number || "";
      const derivedNombre = nombre || cliente_nombre?.split(" ").slice(0, 1).join(" ") || null;
      const derivedApellido = apellido || cliente_nombre?.split(" ").slice(1).join(" ") || null;
      const finalMontoTotal = monto_total ?? total ?? 0;
      const finalTipoDespacho =
        tipo_despacho || (entrega === "retira_local" ? "retira" : entrega === "recibe_transporte" ? "recibe transporte" : null);
      const finalCantProductos = items.length;
      const finalCantUnidades = items.reduce((sum: number, item: any) => sum + Number(item.cantidad || 0), 0);
      const finalClienteNro = normalizeWithoutTruncating(cliente_nro || cuit);
      const finalNombre = normalizeWithoutTruncating(derivedNombre);
      const finalApellido = normalizeWithoutTruncating(derivedApellido);
      const finalDocTipo = normalizeWithoutTruncating(doc_tipo);
      const finalDocNumeroValue = normalizeWithoutTruncating(finalDocNumero);
      const finalCuit = normalizeWithoutTruncating(cuit);
      const finalEmail = normalizeWithoutTruncating(email_pedido || email);
      const finalCelular = normalizeWhatsapp(celular_pedido || whatsapp);
      const finalTipoCompra = normalizeWithoutTruncating(tipo_compra);
      const finalTipoDespachoValue = normalizeWithoutTruncating(finalTipoDespacho);
      const finalLocalidad = normalizeWithoutTruncating(localidad);
      const finalObservaciones = normalizeNullableString(
        [observaciones, componente ? `Componente: ${componente}` : null].filter(Boolean).join(" | ")
      );
      const validationErrors = [
        !finalNombre ? "El nombre es obligatorio." : null,
        !finalApellido ? "El apellido es obligatorio." : null,
        !finalDocTipo ? "El tipo de documento es obligatorio." : null,
        !finalDocNumeroValue ? "El número de documento es obligatorio." : null,
        finalDocTipo === "DNI" && !/^\d{8}$/.test(finalDocNumeroValue || "") ? "El DNI debe tener exactamente 8 números." : null,
        !finalEmail ? "El email es obligatorio." : null,
        finalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail) ? "El email no tiene un formato válido." : null,
        !finalCelular ? "El número de WhatsApp es obligatorio y solo puede contener números, + y -." : null,
        !finalTipoDespachoValue ? "El tipo de entrega es obligatorio." : null,
        !Number.isFinite(Number(finalMontoTotal)) || Number(finalMontoTotal) < 0 ? "El monto total del pedido es inválido." : null,
        validateMaxLength(finalClienteNro, 50, "El número de cliente"),
        validateMaxLength(finalNombre, 100, "El nombre"),
        validateMaxLength(finalApellido, 100, "El apellido"),
        validateMaxLength(finalDocTipo, 20, "El tipo de documento"),
        validateMaxLength(finalDocNumeroValue, 20, "El número de documento"),
        validateMaxLength(finalCuit, 20, "El CUIT"),
        validateMaxLength(finalEmail, 150, "El email"),
        validateMaxLength(finalCelular, 15, "El WhatsApp"),
        validateMaxLength(finalTipoCompra, 20, "El tipo de compra"),
        validateMaxLength(finalTipoDespachoValue, 20, "El tipo de despacho"),
        validateMaxLength(finalLocalidad, 150, "La localidad"),
        ...items.map((item: any, index: number) => {
          if (!Number.isInteger(Number(item.articulo_id)) || Number(item.articulo_id) <= 0) {
            return `El artículo de la línea ${index + 1} es inválido.`;
          }
          if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
            return `La cantidad de la línea ${index + 1} es inválida.`;
          }
          if (!Number.isFinite(Number(item.precio_unitario)) || Number(item.precio_unitario) < 0) {
            return `El precio de la línea ${index + 1} es inválido.`;
          }
          if (item.comentario_cliente && String(item.comentario_cliente).length > 30) {
            return `El comentario de la línea ${index + 1} supera el máximo permitido.`;
          }

          return null;
        }),
      ].filter(Boolean);

      if (validationErrors.length > 0) {
        return res.status(400).json({ error: validationErrors[0] });
      }

      // Start database transaction
      const newPedido = await prisma.$transaction(async (tx) => {
        const insertedOrders = await tx.$queryRawUnsafe<any[]>(
          `
            INSERT INTO "pedido_web" (
              "cliente_nro",
              "nombre",
              "apellido",
              "doc_tipo",
              "doc_numero",
              "cuit",
              "email_pedido",
              "celular_pedido",
              "cant_productos",
              "cant_unidades",
              "tipo_compra",
              "monto_total",
              "tipo_despacho",
              "localidad",
              "observaciones",
              "estado"
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
            RETURNING
              "id",
              "fecha",
              "cliente_nro",
              "nombre",
              "apellido",
              "doc_tipo",
              "doc_numero",
              "cuit",
              "email_pedido",
              "celular_pedido",
              "cant_productos",
              "cant_unidades",
              "tipo_compra",
              "monto_total",
              "tipo_despacho",
              "localidad",
              "observaciones",
              "estado"
          `,
          finalClienteNro,
          finalNombre,
          finalApellido,
          finalDocTipo,
          finalDocNumeroValue,
          finalCuit,
          finalEmail,
          finalCelular,
          finalCantProductos,
          finalCantUnidades,
          finalTipoCompra,
          Number(finalMontoTotal),
          finalTipoDespachoValue,
          finalLocalidad,
          finalObservaciones,
          "nuevo"
        );
        const pedido = insertedOrders[0];

        // 2. Create order details
        for (const item of items) {
          await tx.pedidoDetalle.create({
            data: {
              pedido_id: pedido.id,
              articulo_id: item.articulo_id ? parseInt(item.articulo_id) : null,
              cantidad: parseInt(item.cantidad),
              precio_unitario: Number(item.precio_unitario),
              comentarioCliente: item.comentario_cliente ? String(item.comentario_cliente).slice(0, 30) : null,
            },
          });
        }

        return pedido;
      });

      return res.status(201).json({ success: true, order: PublicoController.serializePedidoForClient(newPedido) });
    } catch (error: any) {
      console.error("Error in createPedido:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

import prisma from "../config/prisma";
import { AppError } from "../utils/appError";
import { normalizeNullableString, normalizeWhatsapp, validateMaxLength } from "../utils/strings";
import type { ArticuloConRelaciones, ArticuloPublico, PedidoPublico } from "../entities";

/**
 * API pública que consume el cliente de la web (`maxes_api/public`):
 * rubros, artículos, carrusel, configuración y alta de pedidos.
 */
export class PublicoService {
  /** Rubros activos, ordenados por nombre. */
  async getRubros() {
    const rubros = await prisma.rubro.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return { success: true, rubros };
  }

  /** Artículos visibles y con precio, con filtros y paginación. */
  async getArticulos(query: Record<string, unknown>) {
    const { rubro_id, search, destacado, page = 1, limit = 20 } = query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: any = {};
    whereClause.visible = "S";
    whereClause.precioMayorista = { gt: 0 };
    whereClause.precioMinorista = { gt: 0 };

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
          imagenes: { orderBy: { orden: "asc" } },
          imagenPrincipal: true,
        },
        skip,
        take: limitNumber,
        orderBy: { fechaPublicacion: "desc" },
      }),
      prisma.articulo.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    return {
      success: true,
      articulos: articulos.map((articulo) => this.serializeArticulo(articulo)),
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
      },
    };
  }

  /** Detalle de un artículo publicado. */
  async getArticuloById(id: string) {
    const articulo = await prisma.articulo.findFirst({
      where: {
        id: parseInt(id),
        visible: "S",
        precioMayorista: { gt: 0 },
        precioMinorista: { gt: 0 },
      },
      include: {
        rubro: true,
        imagenes: { orderBy: { orden: "asc" } },
        imagenPrincipal: true,
      },
    });

    if (!articulo) {
      throw new AppError(404, "Article not found");
    }

    return { success: true, articulo: this.serializeArticulo(articulo) };
  }

  /** Ítems activos del carrusel de la home. */
  async getCarruseles() {
    const carruseles = await prisma.carruselHome.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    });
    return { success: true, carruseles };
  }

  /** Configuración general de la web. */
  async getConfig() {
    const config = await prisma.configuracion.findFirst();

    if (!config) {
      throw new AppError(404, "Configuration not found");
    }

    return { success: true, config };
  }

  /** Alta de un pedido con sus líneas. */
  async createPedido(body: any) {
    const {
      cliente_nombre,
      nombre,
      apellido,
      cliente_nro,
      doc_tipo,
      doc_number, // soporta doc_number y doc_numero
      doc_numero,
      cuit,
      email,
      email_pedido,
      whatsapp,
      celular_pedido,
      observaciones,
      componente,
      tipo_precio,
      total,
      monto_total,
      tipo_despacho,
      entrega,
      localidad,
      items,
    } = body ?? {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "Missing required fields or items is empty");
    }

    const finalDocNumero = doc_numero || doc_number || "";
    const derivedNombre = nombre || cliente_nombre?.split(" ").slice(0, 1).join(" ") || null;
    const derivedApellido = apellido || cliente_nombre?.split(" ").slice(1).join(" ") || null;
    const finalMontoTotal = monto_total ?? total ?? 0;
    const finalTipoDespacho =
      tipo_despacho || (entrega === "retira_local" ? "retira" : entrega === "recibe_transporte" ? "recibe transporte" : null);
    const finalCantProductos = items.length;
    const finalCantUnidades = items.reduce((sum: number, item: any) => sum + Number(item.cantidad || 0), 0);
    const finalClienteNro = normalizeNullableString(cliente_nro || cuit);
    const finalNombre = normalizeNullableString(derivedNombre);
    const finalApellido = normalizeNullableString(derivedApellido);
    const finalDocTipo = normalizeNullableString(doc_tipo);
    const finalDocNumeroValue = normalizeNullableString(finalDocNumero);
    const finalCuit = normalizeNullableString(cuit);
    const finalEmail = normalizeNullableString(email_pedido || email);
    const finalCelular = normalizeWhatsapp(celular_pedido || whatsapp);
    const finalTipoPrecio = normalizeNullableString(tipo_precio);
    const finalTipoDespachoValue = normalizeNullableString(finalTipoDespacho);
    const finalLocalidad = normalizeNullableString(localidad);
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
      validateMaxLength(finalTipoPrecio, 20, "El tipo de precio"),
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
        if (!normalizeNullableString(item.articulo_cod)) {
          return `El código del artículo de la línea ${index + 1} es obligatorio.`;
        }
        if (String(item.articulo_cod).length > 20) {
          return `El código del artículo de la línea ${index + 1} supera el máximo permitido.`;
        }
        if (item.articulo_des && String(item.articulo_des).length > 30) {
          return `La descripción del artículo de la línea ${index + 1} supera el máximo permitido.`;
        }
        if (item.comentario_cliente && String(item.comentario_cliente).length > 30) {
          return `El comentario de la línea ${index + 1} supera el máximo permitido.`;
        }

        return null;
      }),
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      throw new AppError(400, validationErrors[0] as string);
    }

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
            "tipo_precio",
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
            "tipo_precio",
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
        finalTipoPrecio,
        Number(finalMontoTotal),
        finalTipoDespachoValue,
        finalLocalidad,
        finalObservaciones,
        "nuevo"
      );
      const pedido = insertedOrders[0];

      for (const item of items) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "pedido_detalle_web" (
             "pedido_id", "articulo_id", "articulo_cod", "articulo_des",
             "cantidad", "precio_unitario", "comentario_cliente"
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          pedido.id,
          Number(item.articulo_id),
          String(item.articulo_cod),
          item.articulo_des ? String(item.articulo_des) : null,
          parseInt(item.cantidad),
          Number(item.precio_unitario),
          item.comentario_cliente ? String(item.comentario_cliente).slice(0, 30) : null
        );
      }

      return pedido;
    });

    return { success: true, order: this.serializePedido(newPedido) };
  }

  /** Serializa un artículo Prisma a la forma pública esperada por el cliente. */
  private serializeArticulo(articulo: ArticuloConRelaciones): ArticuloPublico {
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

  /** Serializa un pedido crudo para el cliente. */
  private serializePedido(pedido: any): PedidoPublico {
    return {
      ...pedido,
      cliente_nombre: [pedido.nombre, pedido.apellido].filter(Boolean).join(" ").trim(),
      total: pedido.monto_total,
    };
  }
}

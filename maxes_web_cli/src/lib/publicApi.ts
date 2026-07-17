import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type ArticuloWithRelations = Prisma.ArticuloGetPayload<{
  include: {
    rubro: true;
    imagenes: true;
    imagenPrincipal: true;
  };
}>;

type PedidoItemInput = {
  articulo_id?: unknown;
  cantidad?: unknown;
  precio_unitario?: unknown;
  comentario_cliente?: unknown;
};

type PedidoBody = Record<string, unknown> & {
  cliente_nombre?: string;
  nombre?: string;
  apellido?: string;
  cliente_nro?: string;
  doc_tipo?: string;
  doc_number?: string;
  doc_numero?: string;
  cuit?: string;
  email?: string;
  email_pedido?: string;
  whatsapp?: string;
  celular_pedido?: string;
  observaciones?: string;
  componente?: string;
  tipo_compra?: string;
  total?: number;
  monto_total?: number;
  tipo_despacho?: string;
  entrega?: string;
  localidad?: string;
  items?: PedidoItemInput[];
};

type PedidoInsert = {
  id: number;
  fecha: Date | null;
  cliente_nro: string | null;
  nombre: string | null;
  apellido: string | null;
  doc_tipo: string | null;
  doc_numero: string | null;
  cuit: string | null;
  email_pedido: string | null;
  celular_pedido: string | null;
  cant_productos: number | null;
  cant_unidades: number | null;
  tipo_compra: string | null;
  monto_total: Prisma.Decimal | number | string | null;
  tipo_despacho: string | null;
  localidad: string | null;
  observaciones: string | null;
  estado: string | null;
};

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWithoutTruncating(value: unknown) {
  return normalizeNullableString(value);
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

function validateMaxLength(value: string | null, maxLength: number, label: string) {
  if (value && value.length > maxLength) {
    return `${label} supera el máximo de ${maxLength} caracteres.`;
  }

  return null;
}

function toNumber(value: unknown) {
  if (value == null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function serializeArticulo(articulo: ArticuloWithRelations) {
  return {
    id: articulo.id,
    articulo_id_origen: articulo.articuloOrigenId,
    codigo: articulo.articuloCod,
    articulo_des: articulo.articuloDes,
    proveedor_des: articulo.proveedorDes,
    descripcion_publica: articulo.articuloTextoWeb || articulo.articuloDes,
    descripcion_detallada: articulo.articuloTextoWeb || articulo.articuloDes,
    precio_mayorista: toNumber(articulo.precioMayorista),
    precio_minorista: toNumber(articulo.precioMinorista),
    rubro_id: articulo.rubroId,
    imagen_url: articulo.imagenPrincipal?.imagen_url || articulo.imagenes?.[0]?.imagen_url || null,
    destacado: articulo.destacado === "S",
    visible: articulo.visible === "S",
    fecha_publicacion: articulo.fechaPublicacion,
    rubro: articulo.rubro,
    imagenes: articulo.imagenes,
  };
}

export async function getRubros() {
  const rubros = await prisma.rubro.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return { success: true, rubros };
}

export async function getArticulos(params: URLSearchParams) {
  const rubroId = params.get("rubro_id");
  const search = params.get("search");
  const destacado = params.get("destacado");
  const sortBy = params.get("sort_by") || "relevance";
  const tipoCompra = params.get("tipo_compra") === "minorista" ? "minorista" : "mayorista";
  const ids = (params.get("ids") || "")
    .split(",")
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  const page = Number.parseInt(params.get("page") || "1", 10);
  const limit = Number.parseInt(params.get("limit") || "20", 10);
  const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
  const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 20;

  const whereClause: Prisma.ArticuloWhereInput = {
    visible: "S",
    precioMayorista: { gt: 0 },
    precioMinorista: { gt: 0 },
  };

  if (rubroId) {
    whereClause.rubroId = Number.parseInt(rubroId, 10);
  }

  if (ids.length > 0) {
    whereClause.id = { in: ids };
  }

  if (destacado) {
    whereClause.destacado = destacado === "true" ? "S" : "N";
  }

  if (search) {
    const searchTerms = search.trim().split(/\s+/).filter(Boolean);
    whereClause.AND = searchTerms.map((term) => ({
      OR: [
        { articuloCod: { contains: term, mode: "insensitive" } },
        { articuloDes: { contains: term, mode: "insensitive" } },
        { articuloTextoWeb: { contains: term, mode: "insensitive" } },
      ],
    }));
  }

  const skip = (pageNumber - 1) * limitNumber;
  const orderBy: Prisma.ArticuloOrderByWithRelationInput[] =
    sortBy === "price_asc"
      ? [{ [tipoCompra === "minorista" ? "precioMinorista" : "precioMayorista"]: "asc" }]
      : sortBy === "price_desc"
        ? [{ [tipoCompra === "minorista" ? "precioMinorista" : "precioMayorista"]: "desc" }]
        : sortBy === "description"
          ? [{ articuloDes: "asc" }]
          : [{ destacado: "desc" }, { fechaPublicacion: "desc" }];
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
      orderBy,
    }),
    prisma.articulo.count({ where: whereClause }),
  ]);

  return {
    success: true,
    articulos: articulos.map(serializeArticulo),
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / limitNumber),
      currentPage: pageNumber,
      limit: limitNumber,
    },
  };
}

export async function getArticuloById(id: number) {
  const articulo = await prisma.articulo.findFirst({
    where: {
      id,
      visible: "S",
      precioMayorista: { gt: 0 },
      precioMinorista: { gt: 0 },
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
    return null;
  }

  return { success: true, articulo: serializeArticulo(articulo) };
}

export async function getCarruseles() {
  const carruseles = await prisma.carruselHome.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
  });

  return { success: true, carruseles };
}

export async function getConfig() {
  const config = await prisma.configuracion.findFirst();

  if (!config) {
    return null;
  }

  return { success: true, config };
}

export async function createPedido(body: PedidoBody) {
  const {
    cliente_nombre,
    nombre,
    apellido,
    cliente_nro,
    doc_tipo,
    doc_number,
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
    items,
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { status: 400, body: { error: "Missing required fields or items is empty" } };
  }

  const finalDocNumero = doc_numero || doc_number || "";
  const derivedNombre = nombre || cliente_nombre?.split(" ").slice(0, 1).join(" ") || null;
  const derivedApellido = apellido || cliente_nombre?.split(" ").slice(1).join(" ") || null;
  const finalMontoTotal = monto_total ?? total ?? 0;
  const finalTipoDespacho =
    tipo_despacho || (entrega === "retira_local" ? "retira" : entrega === "recibe_transporte" ? "recibe transporte" : null);
  const finalCantProductos = items.length;
  const finalCantUnidades = items.reduce((sum: number, item) => sum + Number(item.cantidad || 0), 0);
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
    ...items.map((item, index: number) => {
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
    return { status: 400, body: { error: validationErrors[0] } };
  }

  const pedido = await prisma.$transaction(async (tx) => {
    const insertedOrders = await tx.$queryRawUnsafe<PedidoInsert[]>(
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

    const createdPedido = insertedOrders[0];

    for (const item of items) {
      await tx.pedidoDetalle.create({
        data: {
          pedido_id: createdPedido.id,
          articulo_id: item.articulo_id ? Number.parseInt(String(item.articulo_id), 10) : null,
          cantidad: Number.parseInt(String(item.cantidad), 10),
          precio_unitario: Number(item.precio_unitario),
          comentarioCliente: item.comentario_cliente ? String(item.comentario_cliente).slice(0, 30) : null,
        },
      });
    }

    return createdPedido;
  });

  return {
    status: 201,
    body: {
      success: true,
      order: {
        ...pedido,
        cliente_nombre: [pedido.nombre, pedido.apellido].filter(Boolean).join(" ").trim(),
        total: toNumber(pedido.monto_total) || 0,
      },
    },
  };
}

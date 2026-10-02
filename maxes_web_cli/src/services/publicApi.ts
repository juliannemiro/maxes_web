import { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";

type ArticuloWithRelations = Prisma.ArticuloGetPayload<{
  include: {
    imagenes: true;
    imagenPrincipal: true;
  };
}>;

type CategoriaPublica = { id: number; codigo: string; nombre: string | null; activo: boolean };
type CategoriaDetallePublico = {
  id: number;
  categoriaDetalleOrigenId: number;
  categoriaOrigenId: number;
  codigo: string;
  nombre: string | null;
  activo: boolean;
};

// Todo endpoint público de artículos parte de estas condiciones: sólo se
// exponen artículos activos/publicados y con ambos precios configurados.
const articuloPublicadoWhere = {
  visible: "S",
  precioMayorista: { gt: 0 },
  precioMinorista: { gt: 0 },
} satisfies Prisma.ArticuloWhereInput;

function isMissingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" ||
      (error.code === "P2010" && error.meta?.code === "42P01"))
  );
}

type PedidoItemInput = {
  articulo_id?: unknown;
  articulo_cod?: unknown;
  articulo_des?: unknown;
  cantidad?: unknown;
  precio_unitario?: unknown;
  comentario_cliente?: unknown;
};

type PedidoBody = Record<string, unknown> & {
  id_analytics_session?: string;
  id_analytics_cart?: string;
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
  tipo_precio?: string;
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
  tipo_precio: string | null;
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

export function serializeArticulo(
  articulo: ArticuloWithRelations,
  categoria: CategoriaPublica | null = null,
  categoriaDetalle: CategoriaDetallePublico | null = null
) {
  return {
    id: articulo.id,
    articulo_id_origen: articulo.articuloOrigenId,
    codigo: articulo.articuloCod,
    articulo_des: articulo.articuloDes,
    marca_des: articulo.marcaDes,
    descripcion_publica: articulo.articuloTextoWeb || articulo.articuloDes,
    descripcion_detallada: articulo.articuloTextoWeb || articulo.articuloDes,
    precio_mayorista: toNumber(articulo.precioMayorista),
    precio_minorista: toNumber(articulo.precioMinorista),
    categoria_id: categoria?.id ?? null,
    categoria_detalle_id: categoriaDetalle?.categoriaDetalleOrigenId ?? null,
    imagen_url: articulo.imagenPrincipal?.imagen_url || articulo.imagenes?.[0]?.imagen_url || null,
    destacado: articulo.destacado === "S",
    visible: articulo.visible === "S",
    fecha_publicacion: articulo.fechaPublicacion,
    categoria: categoria,
    categoria_detalle: categoriaDetalle,
    imagenes: articulo.imagenes,
  };
}

export async function getCategorias() {
  const categorias = await prisma.$queryRawUnsafe<CategoriaPublica[]>(`
    SELECT c.categoria_origen_id AS id,c.codigo,c.nombre,c.activo
    FROM categoria_web c
    WHERE c.activo=true
    ORDER BY nombre,codigo
  `);

  return { success: true, categorias };
}

export async function getCategoriaDetalles() {
  try {
    const detalles = await prisma.$queryRawUnsafe<CategoriaDetallePublico[]>(`
      SELECT d.id,d.categoria_detalle_origen_id AS "categoriaDetalleOrigenId",
             d.categoria_origen_id AS "categoriaOrigenId",d.codigo,d.nombre,d.activo
      FROM categoria_detalle_web d
      WHERE d.activo=true
      ORDER BY "categoriaOrigenId",nombre,codigo
    `);
    return { success: true, detalles };
  } catch (error) {
    // La categoría principal debe continuar disponible mientras se despliega
    // la migración opcional de detalles en ambientes que todavía no la tienen.
    if (isMissingTableError(error)) {
      return { success: true, detalles: [] };
    }
    throw error;
  }
}

async function metadataArticulos(articulos: Array<{ id: number; categoriaId: number | null }>) {
  if (!articulos.length) return { categorias: new Map<number, CategoriaPublica>(), detalles: new Map<number, CategoriaDetallePublico>() };
  const ids = articulos.map((articulo) => articulo.id);
  const categorias = await prisma.$queryRawUnsafe<Array<CategoriaPublica & { articuloId: number }>>(`
      SELECT a.id AS "articuloId",c.categoria_origen_id AS id,c.codigo,c.nombre,c.activo
      FROM articulo_web a LEFT JOIN categoria_web c ON c.categoria_origen_id=a.categoria_id
      WHERE a.id=ANY($1::int[])
    `, ids);
  let detalles: Array<CategoriaDetallePublico & { articuloId: number }> = [];
  try {
    detalles = await prisma.$queryRawUnsafe<Array<CategoriaDetallePublico & { articuloId: number }>>(`
      SELECT a.id AS "articuloId",d.id,d.categoria_detalle_origen_id AS "categoriaDetalleOrigenId",
             d.categoria_origen_id AS "categoriaOrigenId",d.codigo,d.nombre,d.activo
      FROM articulo_web a LEFT JOIN categoria_detalle_web d
        ON d.categoria_detalle_origen_id=a.categoria_detalle_id
      WHERE a.id=ANY($1::int[]) AND d.categoria_detalle_origen_id IS NOT NULL
    `, ids);
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
  return {
    categorias: new Map(categorias.map((item) => [item.articuloId, item])),
    detalles: new Map(detalles.map((item) => [item.articuloId, item]))
  };
}

export async function getArticulos(params: URLSearchParams) {
  const categoriaId = params.get("categoria_id");
  const categoriaDetalleId = params.get("categoria_detalle_id");
  const search = params.get("search");
  const destacado = params.get("destacado");
  const sortBy = params.get("sort_by") || "relevance";
  const tipoPrecio = params.get("tipo_precio") === "minorista" ? "minorista" : "mayorista";
  const ids = (params.get("ids") || "")
    .split(",")
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  const page = Number.parseInt(params.get("page") || "1", 10);
  const limit = Number.parseInt(params.get("limit") || "20", 10);
  const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
  const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 20;

  const whereClause: Prisma.ArticuloWhereInput = { ...articuloPublicadoWhere };

  let idsCategoria: number[] | null = null;
  if (categoriaId) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      "SELECT id FROM articulo_web WHERE categoria_id=$1", Number.parseInt(categoriaId, 10)
    );
    idsCategoria = rows.map((row) => row.id);
  }

  let idsDetalle: number[] | null = null;
  if (categoriaDetalleId) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      "SELECT id FROM articulo_web WHERE categoria_detalle_id=$1", Number.parseInt(categoriaDetalleId, 10)
    );
    idsDetalle = rows.map((row) => row.id);
  }

  let idsFiltrados = ids;
  for (const filtro of [idsCategoria, idsDetalle]) {
    if (filtro !== null) idsFiltrados = idsFiltrados.length ? idsFiltrados.filter((id) => filtro.includes(id)) : filtro;
  }
  if (ids.length > 0 || idsCategoria !== null || idsDetalle !== null) {
    whereClause.id = { in: idsFiltrados };
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
        { marcaDes: { contains: term, mode: "insensitive" } },
        {
          categoria: {
            is: {
              OR: [
                { codigo: { contains: term, mode: "insensitive" } },
                { nombre: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          categoriaDetalle: {
            is: {
              OR: [
                { codigo: { contains: term, mode: "insensitive" } },
                { nombre: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    }));
  }

  const skip = (pageNumber - 1) * limitNumber;
  const orderBy: Prisma.ArticuloOrderByWithRelationInput[] =
    sortBy === "price_asc"
      ? [{ [tipoPrecio === "minorista" ? "precioMinorista" : "precioMayorista"]: "asc" }]
      : sortBy === "price_desc"
        ? [{ [tipoPrecio === "minorista" ? "precioMinorista" : "precioMayorista"]: "desc" }]
        : sortBy === "description"
          ? [{ articuloDes: "asc" }]
          : sortBy === "newest"
            ? [{ fechaPublicacion: "desc" }]
            : [{ destacado: "desc" }, { fechaPublicacion: "desc" }];
  const [articulos, totalCount] = await prisma.$transaction([
    prisma.articulo.findMany({
      where: whereClause,
      include: {
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
  const metadata = await metadataArticulos(articulos);

  return {
    success: true,
    articulos: articulos.map((articulo) => serializeArticulo(
      articulo,
      metadata.categorias.get(articulo.id) ?? null,
      metadata.detalles.get(articulo.id) ?? null
    )),
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
    where: { id, ...articuloPublicadoWhere },
    include: {
      imagenes: {
        orderBy: { orden: "asc" },
      },
      imagenPrincipal: true,
    },
  });

  if (!articulo) {
    return null;
  }

  const metadata = await metadataArticulos([articulo]);
  return { success: true, articulo: serializeArticulo(articulo, metadata.categorias.get(articulo.id) ?? null, metadata.detalles.get(articulo.id) ?? null) };
}

export async function getArticuloByCodigo(codigo: string) {
  let normalizedCode = codigo;
  try {
    normalizedCode = decodeURIComponent(codigo);
  } catch {
    // Conserva el valor original si el segmento contiene un porcentaje literal.
  }

  const articulo = await prisma.articulo.findFirst({
    where: { articuloCod: normalizedCode, ...articuloPublicadoWhere },
    include: {
      imagenes: { orderBy: { orden: "asc" } },
      imagenPrincipal: true,
    },
  });

  if (!articulo) return null;
  const metadata = await metadataArticulos([articulo]);
  return { success: true, articulo: serializeArticulo(articulo, metadata.categorias.get(articulo.id) ?? null, metadata.detalles.get(articulo.id) ?? null) };
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
    id_analytics_session,
    id_analytics_cart,
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
    tipo_precio,
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
  const finalTipoPrecio = normalizeWithoutTruncating(tipo_precio);
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
    validateMaxLength(finalTipoPrecio, 20, "El tipo de precio"),
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

    const createdPedido = insertedOrders[0];

    for (const item of items) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "pedido_detalle_web" (
           "pedido_id", "articulo_id", "articulo_cod", "articulo_des",
           "cantidad", "precio_unitario", "comentario_cliente"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        createdPedido.id,
        item.articulo_id ? Number.parseInt(String(item.articulo_id), 10) : null,
        item.articulo_cod ? String(item.articulo_cod).slice(0, 20) : null,
        item.articulo_des ? String(item.articulo_des).slice(0, 30) : null,
        Number.parseInt(String(item.cantidad), 10),
        Number(item.precio_unitario),
        item.comentario_cliente ? String(item.comentario_cliente).slice(0, 30) : null
      );
    }

    const idAnalyticsSession =
      typeof id_analytics_session === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id_analytics_session)
        ? id_analytics_session
        : null;
    const idAnalyticsCart =
      typeof id_analytics_cart === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id_analytics_cart)
        ? id_analytics_cart
        : idAnalyticsSession;

    if (idAnalyticsCart) {
      await tx.$executeRawUnsafe(
        `UPDATE analytics_carrito SET
           estado = 'pedido_generado',
           etapa = 'pedido_generado',
           pedido_id = $2,
           fecha_hora_pedido_generado = CURRENT_TIMESTAMP,
           fecha_hora_ultima_actividad = CURRENT_TIMESTAMP
         WHERE id_analytics_session = $1
           AND pedido_id IS NULL`,
        idAnalyticsCart,
        createdPedido.id
      );
      if (idAnalyticsSession) {
        await tx.$executeRawUnsafe(
          `UPDATE analytics_sesion SET
             pedido_generado = TRUE,
             etapa = 'pedido_generado',
             fecha_hora_ultima_actividad = CURRENT_TIMESTAMP
           WHERE id_analytics_session = $1`,
          idAnalyticsSession
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE analytics_sesion SET
           pedido_generado = TRUE,
           etapa = 'pedido_generado',
           fecha_hora_ultima_actividad = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT sesion.id
           FROM analytics_sesion AS sesion
           INNER JOIN analytics_carrito AS carrito
             ON carrito.id = sesion.carrito_analytics_id
           WHERE carrito.id_analytics_session = $1
           ORDER BY sesion.fecha_hora_ultima_actividad DESC, sesion.id DESC
           LIMIT 1
         )
           AND NOT EXISTS (
             SELECT 1 FROM analytics_sesion
             WHERE id_analytics_session = $2 AND pedido_generado = TRUE
           )`,
        idAnalyticsCart,
        idAnalyticsSession
      );
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

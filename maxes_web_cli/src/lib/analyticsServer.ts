import prisma from "./prisma";

const MAX_SESSION_ID_LENGTH = 100;

type AnalyticsCartRow = {
  id: number;
  estado: string;
  fue_abandonado: boolean;
  cantidad_reactivaciones: number;
  fecha_hora_inicio_pedido: Date | null;
  segundos_navegacion_activa: number;
};

type CountRow = { count: bigint | number };

export type AnalyticsCartItemInput = {
  id_incorporacion: string;
  articulo_id: number;
  cantidad: number;
  precio_unitario: number;
  tiene_comentario: boolean;
  origen_incorporacion: string;
  era_favorito_al_agregar: boolean;
};

export function normalizeAnalyticsSessionId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_SESSION_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function limitString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function detectDevice(userAgent: string | null) {
  const ua = userAgent || "";
  const tipoDispositivo = /ipad|tablet|kindle|silk/i.test(ua)
    ? "tablet"
    : /mobile|iphone|ipod|android/i.test(ua)
      ? "celular"
      : ua
        ? "computadora"
        : "desconocido";
  const sistemaOperativo = /android/i.test(ua)
    ? "Android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /windows/i.test(ua)
        ? "Windows"
        : /macintosh|mac os x/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "otro";
  const navegador = /edg\//i.test(ua)
    ? "Edge"
    : /firefox|fxios/i.test(ua)
      ? "Firefox"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /safari/i.test(ua)
          ? "Safari"
          : "otro";

  return { tipoDispositivo, sistemaOperativo, navegador };
}

export async function iniciarSesionAnalytics(input: {
  idAnalyticsSession: string;
  userAgent: string | null;
  origenCampania?: unknown;
  medioCampania?: unknown;
  nombreCampania?: unknown;
  paginaIngreso?: unknown;
  sitioOrigen?: unknown;
}) {
  const device = detectDevice(input.userAgent);
  const rows = await prisma.$queryRawUnsafe<AnalyticsCartRow[]>(
    `INSERT INTO analytics_carrito (
       id_analytics_session, tipo_dispositivo, sistema_operativo, navegador,
       origen_campania, medio_campania, nombre_campania, pagina_ingreso, sitio_origen
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id_analytics_session) DO UPDATE
       SET id_analytics_session = EXCLUDED.id_analytics_session
     RETURNING id, estado, fue_abandonado, cantidad_reactivaciones,
       fecha_hora_inicio_pedido, segundos_navegacion_activa`,
    input.idAnalyticsSession,
    device.tipoDispositivo,
    device.sistemaOperativo,
    device.navegador,
    limitString(input.origenCampania, 100),
    limitString(input.medioCampania, 100),
    limitString(input.nombreCampania, 150),
    limitString(input.paginaIngreso, 500),
    limitString(input.sitioOrigen, 500)
  );

  return rows[0];
}

export async function sincronizarCarritoAnalytics(input: {
  idAnalyticsSession: string;
  tipoPrecio: "mayorista" | "minorista";
  items: AnalyticsCartItemInput[];
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const carts = await tx.$queryRawUnsafe<AnalyticsCartRow[]>(
      `SELECT id, estado, fue_abandonado, cantidad_reactivaciones,
         fecha_hora_inicio_pedido, segundos_navegacion_activa
       FROM analytics_carrito
       WHERE id_analytics_session = $1
       FOR UPDATE`,
      input.idAnalyticsSession
    );
    const carrito = carts[0];

    if (!carrito) {
      throw new Error("La sesión de analytics no existe.");
    }
    if (carrito.estado === "pedido_generado") {
      return carrito;
    }

    const activeIds = input.items.map((item) => item.id_incorporacion);
    await tx.$executeRawUnsafe(
      `UPDATE analytics_carrito_detalle
       SET fecha_hora_eliminado = $2, fecha_hora_ultima_modificacion = $2
       WHERE carrito_analytics_id = $1
         AND fecha_hora_eliminado IS NULL
         AND NOT (id_incorporacion = ANY($3::varchar[]))`,
      carrito.id,
      now,
      activeIds
    );

    for (const item of input.items) {
      await tx.$executeRawUnsafe(
        `INSERT INTO analytics_carrito_detalle (
           carrito_analytics_id, id_incorporacion, articulo_id,
           cantidad_inicial, cantidad_ultima, precio_unitario,
           tuvo_comentario, origen_incorporacion, era_favorito_al_agregar,
           fecha_hora_agregado, fecha_hora_ultima_modificacion
         )
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (id_incorporacion) DO UPDATE SET
           cantidad_ultima = EXCLUDED.cantidad_ultima,
           precio_unitario = EXCLUDED.precio_unitario,
           tuvo_comentario =
             analytics_carrito_detalle.tuvo_comentario OR EXCLUDED.tuvo_comentario,
           era_favorito_al_agregar =
             analytics_carrito_detalle.era_favorito_al_agregar OR EXCLUDED.era_favorito_al_agregar,
           fecha_hora_ultima_modificacion = EXCLUDED.fecha_hora_ultima_modificacion,
           fecha_hora_eliminado = NULL
         WHERE analytics_carrito_detalle.carrito_analytics_id = EXCLUDED.carrito_analytics_id`,
        carrito.id,
        item.id_incorporacion,
        item.articulo_id,
        item.cantidad,
        item.precio_unitario,
        item.tiene_comentario,
        item.origen_incorporacion,
        item.era_favorito_al_agregar,
        now
      );
    }

    const cantidadUnidades = input.items.reduce((total, item) => total + item.cantidad, 0);
    const montoEstimado = input.items.reduce(
      (total, item) => total + item.cantidad * item.precio_unitario,
      0
    );
    const rows = await tx.$queryRawUnsafe<AnalyticsCartRow[]>(
      `UPDATE analytics_carrito SET
         estado = 'activo',
         cantidad_reactivaciones = cantidad_reactivaciones +
           CASE WHEN estado = 'abandonado' THEN 1 ELSE 0 END,
         fecha_hora_ultima_reactivacion =
           CASE WHEN estado = 'abandonado' THEN $2 ELSE fecha_hora_ultima_reactivacion END,
         tipo_precio = $3,
         cantidad_productos = $4,
         cantidad_unidades = $5,
         monto_estimado = $6,
         fecha_hora_ultima_actividad = $2
       WHERE id = $1
       RETURNING id, estado, fue_abandonado, cantidad_reactivaciones,
         fecha_hora_inicio_pedido, segundos_navegacion_activa`,
      carrito.id,
      now,
      input.tipoPrecio,
      input.items.length,
      cantidadUnidades,
      montoEstimado
    );

    return rows[0];
  });
}

export async function registrarInicioPedido(idAnalyticsSession: string) {
  const rows = await prisma.$queryRawUnsafe<AnalyticsCartRow[]>(
    `UPDATE analytics_carrito SET
       estado = CASE WHEN estado = 'pedido_generado' THEN estado ELSE 'activo' END,
       etapa = CASE WHEN estado = 'pedido_generado' THEN etapa ELSE 'formulario_pedido' END,
       cantidad_reactivaciones = cantidad_reactivaciones +
         CASE WHEN estado = 'abandonado' THEN 1 ELSE 0 END,
       fecha_hora_ultima_reactivacion =
         CASE WHEN estado = 'abandonado' THEN CURRENT_TIMESTAMP ELSE fecha_hora_ultima_reactivacion END,
       fecha_hora_inicio_pedido = COALESCE(fecha_hora_inicio_pedido, CURRENT_TIMESTAMP),
       fecha_hora_ultima_actividad =
         CASE WHEN estado = 'pedido_generado' THEN fecha_hora_ultima_actividad ELSE CURRENT_TIMESTAMP END
     WHERE id_analytics_session = $1
     RETURNING id, estado, fue_abandonado, cantidad_reactivaciones,
       fecha_hora_inicio_pedido, segundos_navegacion_activa`,
    idAnalyticsSession
  );
  return rows[0] || null;
}

export async function actualizarTiempoActivo(idAnalyticsSession: string, segundosAcumulados: number) {
  const seconds = Math.max(0, Math.min(Math.floor(segundosAcumulados), 60 * 60 * 24 * 30));
  const rows = await prisma.$queryRawUnsafe<AnalyticsCartRow[]>(
    `UPDATE analytics_carrito
     SET segundos_navegacion_activa = GREATEST(segundos_navegacion_activa, $2)
     WHERE id_analytics_session = $1
     RETURNING id, estado, fue_abandonado, cantidad_reactivaciones,
       fecha_hora_inicio_pedido, segundos_navegacion_activa`,
    idAnalyticsSession,
    seconds
  );
  return rows[0] || null;
}

export async function marcarCarritosAbandonados() {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `WITH marcados AS (
       UPDATE analytics_carrito SET
         estado = 'abandonado',
         fue_abandonado = TRUE,
         fecha_hora_marcado_abandonado =
           COALESCE(fecha_hora_marcado_abandonado, CURRENT_TIMESTAMP)
       WHERE estado = 'activo'
         AND cantidad_productos > 0
         AND pedido_id IS NULL
         AND fecha_hora_ultima_actividad <= CURRENT_TIMESTAMP - INTERVAL '12 hours'
       RETURNING id
     )
     SELECT COUNT(*) AS count FROM marcados`
  );
  return { count: Number(rows[0]?.count || 0) };
}

export async function registrarEventoFavorito(input: {
  idAnalyticsSession: string;
  articuloId: number | null;
  accion: "agregado" | "quitado" | "estado_actual" | "panel_visto" | "panel_pedido_abierto";
  origen: string;
  cantidadFavoritos: number;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO analytics_favorito_evento (
         carrito_analytics_id, articulo_id, accion, origen, cantidad_favoritos
       )
       SELECT id, $2, $3, $4, $5
       FROM analytics_carrito
       WHERE id_analytics_session = $1`,
      input.idAnalyticsSession,
      input.articuloId,
      input.accion,
      limitString(input.origen, 40) || "desconocido",
      Math.max(0, input.cantidadFavoritos)
    );
    await tx.$executeRawUnsafe(
      `UPDATE analytics_carrito
       SET cantidad_favoritos = $2
       WHERE id_analytics_session = $1`,
      input.idAnalyticsSession,
      Math.max(0, input.cantidadFavoritos)
    );
  });
}

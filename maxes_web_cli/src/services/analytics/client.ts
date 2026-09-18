const VISITOR_STORAGE_KEY = "maxes_id_analytics_visitor";
const SESSION_STORAGE_KEY = "maxes_id_analytics_session";
const SESSION_ACTIVITY_STORAGE_KEY = "maxes_analytics_session_last_activity";
const CART_STORAGE_KEY = "maxes_id_analytics_cart";
const ACTIVE_SECONDS_PREFIX = "maxes_analytics_active_seconds_";
const ACTIVE_CATALOG_SECONDS_PREFIX = "maxes_analytics_active_catalog_seconds_";
const ACTIVE_ORDER_SECONDS_PREFIX = "maxes_analytics_active_order_seconds_";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function getAnalyticsSessionId() {
  const now = Date.now();
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  const lastActivity = Number(window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY) || 0);
  if (!id || !lastActivity || now - lastActivity >= SESSION_TIMEOUT_MS) {
    id = createId("sesion");
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
  }

  return id;
}

export function markAnalyticsActivity() {
  const id = getAnalyticsSessionId();
  window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(Date.now()));
  return id;
}

export function getAnalyticsVisitorId() {
  let id = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!id) {
    id = createId("visitante");
    window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
  }
  return id;
}

export function getAnalyticsCartId() {
  let id = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!id) {
    id = createId("carrito");
    window.localStorage.setItem(CART_STORAGE_KEY, id);
  }
  return id;
}

export function createAnalyticsIncorporationId() {
  return createId("incorporacion");
}

async function sendAnalytics(endpoint: string, method: string, body: Record<string, unknown>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (response.ok) return;
      if (response.status < 500 || attempt === 1) {
        throw new Error(`No se pudo registrar analytics (${response.status}).`);
      }
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo registrar analytics.");
}

export async function startAnalyticsSession() {
  const url = new URL(window.location.href);
  const sessionId = markAnalyticsActivity();

  await sendAnalytics("/api/public/analytics/sesion", "POST", {
    id_analytics_session: sessionId,
    id_analytics_visitor: getAnalyticsVisitorId(),
    id_analytics_cart: getAnalyticsCartId(),
    origen_campania: url.searchParams.get("utm_source"),
    medio_campania: url.searchParams.get("utm_medium"),
    nombre_campania: url.searchParams.get("utm_campaign"),
    contenido_campania: url.searchParams.get("utm_content"),
    termino_campania: url.searchParams.get("utm_term"),
    id_click_google: url.searchParams.get("gclid"),
    id_click_meta: url.searchParams.get("fbclid"),
    pagina_ingreso: `${url.pathname}${url.search}`,
    sitio_origen: document.referrer || null,
  });
}

export async function syncAnalyticsCart(body: {
  tipo_precio: "mayorista" | "minorista";
  items: Array<{
    id_incorporacion: string;
    articulo_id: number;
    cantidad: number;
    precio_unitario: number;
    tiene_comentario: boolean;
    origen_incorporacion: string;
    era_favorito_al_agregar: boolean;
  }>;
}) {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/carrito", "PUT", {
    id_analytics_session: getAnalyticsSessionId(),
    id_analytics_cart: getAnalyticsCartId(),
    ...body,
  });
}

export async function trackCheckoutStarted() {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/inicio-pedido", "POST", {
    id_analytics_session: getAnalyticsSessionId(),
    id_analytics_cart: getAnalyticsCartId(),
  });
}

export async function syncActiveNavigationSeconds(
  seconds: number,
  catalogSeconds: number,
  orderSeconds: number
) {
  await sendAnalytics("/api/public/analytics/actividad", "PATCH", {
    id_analytics_session: getAnalyticsSessionId(),
    id_analytics_cart: getAnalyticsCartId(),
    segundos_navegacion_activa: seconds,
    segundos_activos_catalogo: catalogSeconds,
    segundos_activos_pedido: orderSeconds,
  });
}

export function getStoredActiveSeconds() {
  const value = window.localStorage.getItem(`${ACTIVE_SECONDS_PREFIX}${getAnalyticsSessionId()}`);
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getStoredSectionActiveSeconds(section: "catalogo" | "pedido") {
  const prefix = section === "pedido" ? ACTIVE_ORDER_SECONDS_PREFIX : ACTIVE_CATALOG_SECONDS_PREFIX;
  const value = window.localStorage.getItem(`${prefix}${getAnalyticsSessionId()}`);
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function storeActiveSeconds(seconds: number, catalogSeconds: number, orderSeconds: number) {
  window.localStorage.setItem(
    `${ACTIVE_SECONDS_PREFIX}${getAnalyticsSessionId()}`,
    String(Math.max(0, Math.floor(seconds)))
  );
  const sessionId = getAnalyticsSessionId();
  window.localStorage.setItem(`${ACTIVE_CATALOG_SECONDS_PREFIX}${sessionId}`, String(Math.max(0, Math.floor(catalogSeconds))));
  window.localStorage.setItem(`${ACTIVE_ORDER_SECONDS_PREFIX}${sessionId}`, String(Math.max(0, Math.floor(orderSeconds))));
}

export function finishAnalyticsSession() {
  window.dispatchEvent(new Event("maxes:analytics-finished"));
  const sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionId) {
    window.localStorage.removeItem(`${ACTIVE_SECONDS_PREFIX}${sessionId}`);
  }
  if (sessionId) {
    window.localStorage.removeItem(`${ACTIVE_CATALOG_SECONDS_PREFIX}${sessionId}`);
    window.localStorage.removeItem(`${ACTIVE_ORDER_SECONDS_PREFIX}${sessionId}`);
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
  window.localStorage.removeItem(CART_STORAGE_KEY);
}

export async function trackFavoriteEvent(input: {
  accion: "agregado" | "quitado" | "estado_actual" | "panel_visto" | "panel_pedido_abierto";
  articulo_id?: number;
  origen: string;
  cantidad_favoritos: number;
}) {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/favoritos", "POST", {
    id_evento: createId("evento"),
    id_analytics_session: getAnalyticsSessionId(),
    id_analytics_cart: getAnalyticsCartId(),
    ...input,
  });
}

export async function trackProductShared(input: {
  articulo_id: number;
  metodo: "whatsapp" | "copiar_link";
}) {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/compartidos", "POST", {
    id_evento: createId("evento"),
    id_analytics_session: getAnalyticsSessionId(),
    id_analytics_cart: getAnalyticsCartId(),
    ...input,
  });
}

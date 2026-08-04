const SESSION_STORAGE_KEY = "maxes_id_analytics_session";
const ACTIVE_SECONDS_PREFIX = "maxes_analytics_active_seconds_";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function getAnalyticsSessionId() {
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = createId("sesion");
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }

  return id;
}

export function createAnalyticsIncorporationId() {
  return createId("incorporacion");
}

async function sendAnalytics(endpoint: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`No se pudo registrar analytics (${response.status}).`);
  }
}

export async function startAnalyticsSession() {
  const url = new URL(window.location.href);

  await sendAnalytics("/api/public/analytics/sesion", "POST", {
    id_analytics_session: getAnalyticsSessionId(),
    origen_campania: url.searchParams.get("utm_source"),
    medio_campania: url.searchParams.get("utm_medium"),
    nombre_campania: url.searchParams.get("utm_campaign"),
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
    ...body,
  });
}

export async function trackCheckoutStarted() {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/inicio-pedido", "POST", {
    id_analytics_session: getAnalyticsSessionId(),
  });
}

export async function syncActiveNavigationSeconds(seconds: number) {
  await sendAnalytics("/api/public/analytics/actividad", "PATCH", {
    id_analytics_session: getAnalyticsSessionId(),
    segundos_navegacion_activa: seconds,
  });
}

export function getStoredActiveSeconds() {
  const value = window.localStorage.getItem(`${ACTIVE_SECONDS_PREFIX}${getAnalyticsSessionId()}`);
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function storeActiveSeconds(seconds: number) {
  window.localStorage.setItem(
    `${ACTIVE_SECONDS_PREFIX}${getAnalyticsSessionId()}`,
    String(Math.max(0, Math.floor(seconds)))
  );
}

export function finishAnalyticsSession() {
  window.dispatchEvent(new Event("maxes:analytics-finished"));
  const sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionId) {
    window.localStorage.removeItem(`${ACTIVE_SECONDS_PREFIX}${sessionId}`);
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function trackFavoriteEvent(input: {
  accion: "agregado" | "quitado" | "estado_actual" | "panel_visto" | "panel_pedido_abierto";
  articulo_id?: number;
  origen: string;
  cantidad_favoritos: number;
}) {
  await startAnalyticsSession();
  await sendAnalytics("/api/public/analytics/favoritos", "POST", {
    id_analytics_session: getAnalyticsSessionId(),
    ...input,
  });
}

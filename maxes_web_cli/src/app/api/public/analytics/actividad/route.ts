import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import {
  actualizarTiempoActivo,
  normalizeAnalyticsSessionId,
} from "@/services/analytics/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);
    const seconds = Number(body.segundos_navegacion_activa);
    const catalogSeconds = Number(body.segundos_activos_catalogo);
    const orderSeconds = Number(body.segundos_activos_pedido);

    if (!idAnalyticsSession || !idAnalyticsCart ||
        !Number.isFinite(seconds) || seconds < 0 ||
        !Number.isFinite(catalogSeconds) || catalogSeconds < 0 ||
        !Number.isFinite(orderSeconds) || orderSeconds < 0) {
      return NextResponse.json({ error: "La actividad es inválida." }, { status: 400 });
    }

    await actualizarTiempoActivo(idAnalyticsSession, idAnalyticsCart, seconds, catalogSeconds, orderSeconds);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

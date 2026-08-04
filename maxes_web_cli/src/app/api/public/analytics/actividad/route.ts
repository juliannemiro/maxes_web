import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import {
  actualizarTiempoActivo,
  normalizeAnalyticsSessionId,
} from "../../../../../lib/analyticsServer";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const seconds = Number(body.segundos_navegacion_activa);

    if (!idAnalyticsSession || !Number.isFinite(seconds) || seconds < 0) {
      return NextResponse.json({ error: "La actividad es inválida." }, { status: 400 });
    }

    await actualizarTiempoActivo(idAnalyticsSession, seconds);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

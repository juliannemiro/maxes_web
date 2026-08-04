import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import {
  iniciarSesionAnalytics,
  normalizeAnalyticsSessionId,
} from "../../../../../lib/analyticsServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);

    if (!idAnalyticsSession) {
      return NextResponse.json({ error: "La sesión de analytics es inválida." }, { status: 400 });
    }

    const session = await iniciarSesionAnalytics({
      idAnalyticsSession,
      userAgent: request.headers.get("user-agent"),
      origenCampania: body.origen_campania,
      medioCampania: body.medio_campania,
      nombreCampania: body.nombre_campania,
      paginaIngreso: body.pagina_ingreso,
      sitioOrigen: body.sitio_origen,
    });

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

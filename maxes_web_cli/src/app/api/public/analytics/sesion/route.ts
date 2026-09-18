import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import {
  iniciarSesionAnalytics,
  normalizeAnalyticsSessionId,
} from "@/services/analytics/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsVisitor = normalizeAnalyticsSessionId(body.id_analytics_visitor);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);

    if (!idAnalyticsSession || !idAnalyticsVisitor || !idAnalyticsCart) {
      return NextResponse.json({ error: "La sesión de analytics es inválida." }, { status: 400 });
    }

    const session = await iniciarSesionAnalytics({
      idAnalyticsSession,
      idAnalyticsVisitor,
      idAnalyticsCart,
      userAgent: request.headers.get("user-agent"),
      origenCampania: body.origen_campania,
      medioCampania: body.medio_campania,
      nombreCampania: body.nombre_campania,
      contenidoCampania: body.contenido_campania,
      terminoCampania: body.termino_campania,
      idClickGoogle: body.id_click_google,
      idClickMeta: body.id_click_meta,
      paginaIngreso: body.pagina_ingreso,
      sitioOrigen: body.sitio_origen,
    });

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

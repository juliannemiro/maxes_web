import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import {
  normalizeAnalyticsSessionId,
  registrarInicioPedido,
} from "../../../../../lib/analyticsServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);

    if (!idAnalyticsSession || !idAnalyticsCart) {
      return NextResponse.json({ error: "La sesión de analytics es inválida." }, { status: 400 });
    }

    await registrarInicioPedido(idAnalyticsSession, idAnalyticsCart);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

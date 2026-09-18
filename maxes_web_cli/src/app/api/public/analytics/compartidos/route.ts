import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import {
  normalizeAnalyticsSessionId,
  registrarProductoCompartido,
} from "@/services/analytics/server";

export const dynamic = "force-dynamic";

const VALID_METHODS = new Set(["whatsapp", "copiar_link"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);
    const idEvento = normalizeAnalyticsSessionId(body.id_evento);
    const articuloId = Number(body.articulo_id);
    const metodo = typeof body.metodo === "string" ? body.metodo : "";

    if (!idAnalyticsSession || !idAnalyticsCart || !idEvento || !Number.isInteger(articuloId) || articuloId <= 0 || !VALID_METHODS.has(metodo)) {
      return NextResponse.json({ error: "El evento de compartir es inválido." }, { status: 400 });
    }

    await registrarProductoCompartido({ idAnalyticsSession, idAnalyticsCart, idEvento, articuloId, metodo });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

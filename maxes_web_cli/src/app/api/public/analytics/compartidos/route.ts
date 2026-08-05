import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import {
  normalizeAnalyticsSessionId,
  registrarProductoCompartido,
} from "../../../../../lib/analyticsServer";

export const dynamic = "force-dynamic";

const VALID_METHODS = new Set(["whatsapp", "copiar_link"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const articuloId = Number(body.articulo_id);
    const metodo = typeof body.metodo === "string" ? body.metodo : "";

    if (!idAnalyticsSession || !Number.isInteger(articuloId) || articuloId <= 0 || !VALID_METHODS.has(metodo)) {
      return NextResponse.json({ error: "El evento de compartir es inválido." }, { status: 400 });
    }

    await registrarProductoCompartido({ idAnalyticsSession, articuloId, metodo });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import {
  normalizeAnalyticsSessionId,
  registrarEventoFavorito,
} from "@/services/analytics/server";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = new Set([
  "agregado",
  "quitado",
  "estado_actual",
  "panel_visto",
  "panel_pedido_abierto",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);
    const idEvento = normalizeAnalyticsSessionId(body.id_evento);
    const accion = typeof body.accion === "string" ? body.accion : "";
    const articuloId = body.articulo_id == null ? null : Number(body.articulo_id);
    const cantidadFavoritos = Number(body.cantidad_favoritos);

    if (
      !idAnalyticsSession ||
      !idAnalyticsCart ||
      !idEvento ||
      !VALID_ACTIONS.has(accion) ||
      (articuloId !== null && (!Number.isInteger(articuloId) || articuloId <= 0)) ||
      !Number.isInteger(cantidadFavoritos) ||
      cantidadFavoritos < 0
    ) {
      return NextResponse.json({ error: "El evento de favoritos es inválido." }, { status: 400 });
    }

    await registrarEventoFavorito({
      idAnalyticsSession,
      idAnalyticsCart,
      idEvento,
      articuloId,
      accion: accion as
        | "agregado"
        | "quitado"
        | "estado_actual"
        | "panel_visto"
        | "panel_pedido_abierto",
      origen: typeof body.origen === "string" ? body.origen : "desconocido",
      cantidadFavoritos,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

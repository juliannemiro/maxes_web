import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import {
  AnalyticsCartItemInput,
  normalizeAnalyticsSessionId,
  sincronizarCarritoAnalytics,
} from "../../../../../lib/analyticsServer";

export const dynamic = "force-dynamic";

function normalizeItems(value: unknown): AnalyticsCartItemInput[] | null {
  if (!Array.isArray(value) || value.length > 500) {
    return null;
  }

  const items = value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id_incorporacion: typeof record.id_incorporacion === "string" ? record.id_incorporacion.trim() : "",
      articulo_id: Number(record.articulo_id),
      cantidad: Number(record.cantidad),
      precio_unitario: Number(record.precio_unitario),
      tiene_comentario: record.tiene_comentario === true,
      origen_incorporacion:
        typeof record.origen_incorporacion === "string"
          ? record.origen_incorporacion.slice(0, 40)
          : "catalogo",
      era_favorito_al_agregar: record.era_favorito_al_agregar === true,
    };
  });

  if (
    items.some(
      (item) =>
        !item.id_incorporacion ||
        item.id_incorporacion.length > 100 ||
        !/^[a-zA-Z0-9_-]+$/.test(item.id_incorporacion) ||
        !Number.isInteger(item.articulo_id) ||
        item.articulo_id <= 0 ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad <= 0 ||
        !Number.isFinite(item.precio_unitario) ||
        item.precio_unitario < 0
    )
  ) {
    return null;
  }

  return items;
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const idAnalyticsSession = normalizeAnalyticsSessionId(body.id_analytics_session);
    const idAnalyticsCart = normalizeAnalyticsSessionId(body.id_analytics_cart);
    const items = normalizeItems(body.items);
    const tipoPrecio = body.tipo_precio === "minorista" ? "minorista" : "mayorista";

    if (!idAnalyticsSession || !idAnalyticsCart || !items) {
      return NextResponse.json({ error: "Los datos del carrito son inválidos." }, { status: 400 });
    }

    await sincronizarCarritoAnalytics({ idAnalyticsSession, idAnalyticsCart, tipoPrecio, items });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

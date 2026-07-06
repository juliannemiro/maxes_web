import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../../lib/apiError";
import { getArticuloById } from "../../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const articuloId = Number.parseInt(id, 10);

    if (!Number.isInteger(articuloId) || articuloId <= 0) {
      return NextResponse.json({ error: "Invalid article id" }, { status: 400 });
    }

    const data = await getArticuloById(articuloId);

    if (!data) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

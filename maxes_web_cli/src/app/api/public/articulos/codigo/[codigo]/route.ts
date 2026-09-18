import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import { getArticuloByCodigo } from "@/services/publicApi";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ codigo: string }> }) {
  try {
    const { codigo } = await context.params;
    const normalizedCode = codigo.trim();
    if (!normalizedCode || normalizedCode.length > 20) {
      return NextResponse.json({ error: "Invalid article code" }, { status: 400 });
    }

    const data = await getArticuloByCodigo(normalizedCode);
    return data
      ? NextResponse.json(data)
      : NextResponse.json({ error: "Article not found" }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

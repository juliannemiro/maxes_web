import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../lib/apiError";
import { createPedido } from "../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createPedido(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

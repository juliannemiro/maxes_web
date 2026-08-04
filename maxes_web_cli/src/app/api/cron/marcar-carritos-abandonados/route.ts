import { NextResponse } from "next/server";
import { marcarCarritosAbandonados } from "../../../../lib/analyticsServer";
import { getErrorMessage } from "../../../../lib/apiError";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await marcarCarritosAbandonados();
    return NextResponse.json({ success: true, carritos_marcados: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

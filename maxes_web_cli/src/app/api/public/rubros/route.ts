import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../lib/apiError";
import { getRubros } from "../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getRubros();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

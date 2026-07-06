import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "../../../../lib/apiError";
import { getArticulos } from "../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const data = await getArticulos(request.nextUrl.searchParams);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

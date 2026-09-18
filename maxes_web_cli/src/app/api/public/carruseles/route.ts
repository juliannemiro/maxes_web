import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import { getCarruseles } from "@/services/publicApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCarruseles();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

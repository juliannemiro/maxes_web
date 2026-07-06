import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../lib/apiError";
import { getConfig } from "../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getConfig();

    if (!data) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

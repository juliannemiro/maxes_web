import { NextResponse } from "next/server";
import { getErrorMessage } from "../../../../lib/apiError";
import { getArticulos, getCarruseles, getConfig, getRubros } from "../../../../lib/publicApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rubrosData = await getRubros();
    const carruselesData = await getCarruseles();
    const configData = await getConfig();
    const articulosData = await getArticulos(new URLSearchParams({ limit: "200" }));

    return NextResponse.json({
      success: true,
      rubros: rubrosData.rubros,
      carruseles: carruselesData.carruseles,
      config: configData?.config ?? null,
      articulos: articulosData.articulos,
      pagination: articulosData.pagination,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

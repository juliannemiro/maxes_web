import { NextResponse } from "next/server";
import { getErrorMessage } from "@/utils/apiError";
import { getArticulos, getCarruseles, getCategoriaDetalles, getConfig, getCategorias } from "@/services/publicApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categoriasData = await getCategorias();
    const detallesData = await getCategoriaDetalles();
    const carruselesData = await getCarruseles();
    const configData = await getConfig();
    const articulosData = await getArticulos(
      new URLSearchParams({ limit: "50", sort_by: "description" })
    );

    return NextResponse.json({
      success: true,
      categorias: categoriasData.categorias,
      categoria_detalles: detallesData.detalles,
      carruseles: carruselesData.carruseles,
      config: configData?.config ?? null,
      articulos: articulosData.articulos,
      pagination: articulosData.pagination,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

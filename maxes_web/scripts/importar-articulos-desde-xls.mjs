import { PrismaClient } from "../generated/prisma-client/index.js";
import {
  buildProductosPayload,
  parseArgs,
  parseHtmlTableRowsFromFile,
} from "./lib/parse-xls-html.mjs";
import { loadProjectEnv } from "./lib/load-env.mjs";

loadProjectEnv();

const prisma = new PrismaClient();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const productosPath = args.productos;

  if (!productosPath) {
    throw new Error("Uso: node ./scripts/importar-articulos-desde-xls.mjs --productos /ruta/productos.xls");
  }

  const rows = parseHtmlTableRowsFromFile(productosPath);
  const payload = buildProductosPayload(rows);

  let categoriasCreados = 0;
  let categoriasActualizados = 0;
  let articulosCreados = 0;
  let articulosActualizados = 0;

  for (const categoria of payload.categorias) {
    const existing = await prisma.categoria.findFirst({
      where: { codigo: categoria.codigo },
    });

    if (existing) {
      await prisma.categoria.update({
        where: { id: existing.id },
        data: {
          nombre: categoria.nombre,
          activo: categoria.activo,
        },
      });
      categoriasActualizados += 1;
      continue;
    }

    await prisma.categoria.create({
      data: categoria,
    });
    categoriasCreados += 1;
  }

  const categoriasDb = await prisma.categoria.findMany({
    select: { id: true, codigo: true },
  });
  const categoriaIdByCode = new Map(categoriasDb.map((item) => [item.codigo, item.id]));

  for (const item of payload.articulos) {
    if (!item.codigo) {
      continue;
    }

    const categoriaId = categoriaIdByCode.get(item.categoria_codigo) ?? null;
    const existing = await prisma.articulo.findUnique({
      where: { articuloCod: item.codigo },
    });

    const data = {
      articuloOrigenId: item.articulo_id_origen,
      articuloCod: item.codigo,
      articuloDes: item.descripcion_publica ? String(item.descripcion_publica).slice(0, 30) : null,
      articuloTextoWeb: item.descripcion_publica ? String(item.descripcion_publica).slice(0, 50) : null,
      precioMayorista: item.precio_mayorista != null ? Number(item.precio_mayorista) : null,
      precioMinorista: item.precio_minorista != null ? Number(item.precio_minorista) : null,
      categoriaId,
      proveedorDes: item.proveedor_des ? String(item.proveedor_des).slice(0, 20) : null,
      stockWeb: item.stock_web != null ? Number(item.stock_web) : null,
      destacado: item.destacado ? "S" : "N",
      visible: "S",
    };

    if (existing) {
      await prisma.articulo.update({
        where: { id: existing.id },
        data,
      });
      articulosActualizados += 1;
      continue;
    }

    await prisma.articulo.create({ data });
    articulosCreados += 1;
  }

  console.log(`Categorias creados: ${categoriasCreados}`);
  console.log(`Categorias actualizados: ${categoriasActualizados}`);
  console.log(`Articulos creados: ${articulosCreados}`);
  console.log(`Articulos actualizados: ${articulosActualizados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

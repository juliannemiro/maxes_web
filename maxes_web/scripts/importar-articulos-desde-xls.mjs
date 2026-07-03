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

  let rubrosCreados = 0;
  let rubrosActualizados = 0;
  let articulosCreados = 0;
  let articulosActualizados = 0;

  for (const rubro of payload.rubros) {
    const existing = await prisma.rubro.findFirst({
      where: { codigo: rubro.codigo },
    });

    if (existing) {
      await prisma.rubro.update({
        where: { id: existing.id },
        data: {
          nombre: rubro.nombre,
          activo: rubro.activo,
        },
      });
      rubrosActualizados += 1;
      continue;
    }

    await prisma.rubro.create({
      data: rubro,
    });
    rubrosCreados += 1;
  }

  const rubrosDb = await prisma.rubro.findMany({
    select: { id: true, codigo: true },
  });
  const rubroIdByCode = new Map(rubrosDb.map((item) => [item.codigo, item.id]));

  for (const item of payload.articulos) {
    if (!item.codigo) {
      continue;
    }

    const rubroId = rubroIdByCode.get(item.rubro_codigo) ?? null;
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
      rubroId,
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

  console.log(`Rubros creados: ${rubrosCreados}`);
  console.log(`Rubros actualizados: ${rubrosActualizados}`);
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

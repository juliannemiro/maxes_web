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
    throw new Error("Uso: node ./scripts/importar-categorias-desde-xls.mjs --productos /ruta/productos.xls");
  }

  const rows = parseHtmlTableRowsFromFile(productosPath);
  const payload = buildProductosPayload(rows);

  let creados = 0;
  let actualizados = 0;

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
      actualizados += 1;
      continue;
    }

    await prisma.categoria.create({
      data: categoria,
    });
    creados += 1;
  }

  console.log(`Categorias distintos detectados: ${payload.categorias.length}`);
  console.log(`Categorias creados: ${creados}`);
  console.log(`Categorias actualizados: ${actualizados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

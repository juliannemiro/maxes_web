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
    throw new Error("Uso: node ./scripts/importar-rubros-desde-xls.mjs --productos /ruta/productos.xls");
  }

  const rows = parseHtmlTableRowsFromFile(productosPath);
  const payload = buildProductosPayload(rows);

  let creados = 0;
  let actualizados = 0;

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
      actualizados += 1;
      continue;
    }

    await prisma.rubro.create({
      data: rubro,
    });
    creados += 1;
  }

  console.log(`Rubros distintos detectados: ${payload.rubros.length}`);
  console.log(`Rubros creados: ${creados}`);
  console.log(`Rubros actualizados: ${actualizados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

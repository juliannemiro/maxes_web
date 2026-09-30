import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma-client/index.js";
import { loadProjectEnv } from "./lib/load-env.mjs";
import { confirmarEliminacion } from "./lib/confirmar-eliminacion.mjs";
import { parseArgs, slugifyCategoriaCode } from "./lib/parse-xls-html.mjs";

loadProjectEnv();

const prisma = new PrismaClient();

function normalizeNullableString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractImageUrls(item) {
  const urls = [];

  for (const [key, value] of Object.entries(item)) {
    if (!/^imagen\s*\d+$/i.test(key)) {
      continue;
    }

    const candidate = normalizeNullableString(value);
    if (candidate) {
      urls.push(candidate);
    }
  }

  return [...new Set(urls)];
}

function normalizeArticulo(item, index) {
  const categoriaNombre = normalizeNullableString(item.categoria) || "Sin categoria";
  const categoriaCodigo = slugifyCategoriaCode(categoriaNombre);
  const articuloDes = normalizeNullableString(item.articulo_des) || normalizeNullableString(item.articulo_texto_web);
  const articuloTextoWeb = normalizeNullableString(item.articulo_texto_web) || articuloDes;
  const codigo = normalizeNullableString(item.articulo_cod);
  const stockValue = toNumber(item.stock_web);

  if (!codigo) {
    throw new Error(`Articulo sin articulo_cod en indice ${index}.`);
  }

  return {
    categoria: {
      codigo: categoriaCodigo,
      nombre: categoriaNombre,
      activo: true,
    },
    articulo: {
      articuloOrigenId: index + 1,
      articuloCod: codigo,
      articuloDes: articuloDes ? articuloDes.slice(0, 30) : null,
      articuloTextoWeb: articuloTextoWeb ? articuloTextoWeb.slice(0, 50) : null,
      precioMayorista: toNumber(item.precio_mayorista),
      precioMinorista: toNumber(item.precio_minorista),
      marcaDes: normalizeNullableString(item.marca_des)?.slice(0, 20) || null,
      stockWeb: stockValue == null ? null : Math.trunc(stockValue),
      destacado: "N",
      visible: "S",
    },
    imageUrls: extractImageUrls(item),
  };
}

async function syncArticuloImagenes(articuloId, imageUrls) {
  if (imageUrls.length === 0) {
    return;
  }

  await prisma.articuloImagen.deleteMany({
    where: { articuloId },
  });

  await prisma.articuloImagen.createMany({
    data: imageUrls.map((url, index) => ({
      articuloId,
      imagen_url: url.slice(0, 500),
      orden: index + 1,
    })),
  });

  const principal = await prisma.articuloImagen.findFirst({
    where: { articuloId },
    orderBy: { orden: "asc" },
  });

  await prisma.articulo.update({
    where: { id: articuloId },
    data: { articuloImagenId: principal?.id ?? null },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input;

  if (!inputPath) {
    throw new Error("Uso: node ./scripts/importar-articulos-json.mjs --input /ruta/articulos.json");
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("El archivo JSON debe contener un array de articulos.");
  }

  const codigosConImagenes = data
    .map((item) => normalizeArticulo(item, 0))
    .filter((item) => item.imageUrls.length > 0)
    .map((item) => item.articulo.articuloCod);
  if (codigosConImagenes.length > 0) {
    const imagenesAReemplazar = await prisma.articuloImagen.count({
      where: { articulo: { articuloCod: { in: codigosConImagenes } } },
    });
    await confirmarEliminacion({
      cantidad: imagenesAReemplazar,
      descripcion: "imágenes existentes que serán reemplazadas por la importación",
      args,
    });
  }

  let categoriasCreados = 0;
  let categoriasActualizados = 0;
  let articulosCreados = 0;
  let articulosActualizados = 0;
  let imagenesSincronizadas = 0;

  for (const [index, item] of data.entries()) {
    const normalized = normalizeArticulo(item, index);

    const existingCategoria = await prisma.categoria.findFirst({
      where: { codigo: normalized.categoria.codigo },
    });

    let categoriaId;
    if (existingCategoria) {
      categoriaId = existingCategoria.id;
      if (existingCategoria.nombre !== normalized.categoria.nombre || existingCategoria.activo !== normalized.categoria.activo) {
        await prisma.categoria.update({
          where: { id: existingCategoria.id },
          data: normalized.categoria,
        });
        categoriasActualizados += 1;
      }
    } else {
      const createdCategoria = await prisma.categoria.create({
        data: normalized.categoria,
      });
      categoriaId = createdCategoria.id;
      categoriasCreados += 1;
    }

    const existingArticulo = await prisma.articulo.findUnique({
      where: { articuloCod: normalized.articulo.articuloCod },
    });

    const articuloData = {
      ...normalized.articulo,
      categoriaId,
    };

    let articulo;
    if (existingArticulo) {
      articulo = await prisma.articulo.update({
        where: { id: existingArticulo.id },
        data: articuloData,
      });
      articulosActualizados += 1;
    } else {
      articulo = await prisma.articulo.create({
        data: articuloData,
      });
      articulosCreados += 1;
    }

    if (normalized.imageUrls.length > 0) {
      await syncArticuloImagenes(articulo.id, normalized.imageUrls);
      imagenesSincronizadas += normalized.imageUrls.length;
    }
  }

  console.log(`Categorias creados: ${categoriasCreados}`);
  console.log(`Categorias actualizados: ${categoriasActualizados}`);
  console.log(`Articulos creados: ${articulosCreados}`);
  console.log(`Articulos actualizados: ${articulosActualizados}`);
  console.log(`Imagenes sincronizadas: ${imagenesSincronizadas}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

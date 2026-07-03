import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma-client/index.js";
import { loadProjectEnv } from "./lib/load-env.mjs";
import { parseArgs } from "./lib/parse-xls-html.mjs";

loadProjectEnv();

const prisma = new PrismaClient();

function normalizeNullableString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrecioMayorista(value) {
  const raw = normalizeNullableString(value);
  if (!raw) {
    return null;
  }

  const numeric = raw.replace(/[^0-9]/g, "");
  if (!numeric) {
    return null;
  }

  const parsed = Number.parseInt(numeric, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function splitTsvLine(line) {
  return line.split("\t").map((part) => part.trim());
}

function parseScrapeFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("El archivo scrapeado no tiene filas de datos.");
  }

  const records = [];
  for (const line of lines.slice(1)) {
    const cols = splitTsvLine(line);
    if (cols.length < 6) {
      continue;
    }

    const [
      titulo,
      imagen1,
      href,
      rubro,
      scrapedCode,
      precio,
      imagen2 = "",
    ] = cols;

    const images = [imagen1, imagen2].map(normalizeNullableString).filter(Boolean);

    if (!titulo || images.length === 0) {
      continue;
    }

    records.push({
      titulo,
      tituloNorm: normalizeText(titulo),
      href: normalizeNullableString(href),
      rubro: normalizeNullableString(rubro),
      scrapedCode: normalizeNullableString(scrapedCode),
      scrapedCodeNorm: normalizeText(scrapedCode),
      precioMayorista: parsePrecioMayorista(precio),
      imageUrls: [...new Set(images)],
    });
  }

  return records;
}

function scoreCandidate(articulo, record) {
  let score = 0;
  const reasons = [];
  const articuloCodNorm = normalizeText(articulo.articuloCod);
  const articuloDesNorm = normalizeText(articulo.articuloDes || articulo.articuloTextoWeb || "");
  const proveedorNorm = normalizeText(articulo.proveedorDes || "");
  const rubroNorm = normalizeText(articulo.rubro?.nombre || "");

  if (articuloCodNorm && articuloCodNorm === record.scrapedCodeNorm) {
    score += 120;
    reasons.push("codigo");
  }

  if (articuloCodNorm && record.tituloNorm.includes(articuloCodNorm)) {
    score += 70;
    reasons.push("codigo-en-titulo");
  }

  if (articuloDesNorm && record.tituloNorm.includes(articuloDesNorm)) {
    score += 80;
    reasons.push("descripcion");
  } else if (articuloDesNorm) {
    const articuloTokens = articuloDesNorm.split(" ").filter((token) => token.length >= 4);
    const matchedTokens = articuloTokens.filter((token) => record.tituloNorm.includes(token));
    if (matchedTokens.length >= 3) {
      score += 45;
      reasons.push("tokens-descripcion");
    }
  }

  if (proveedorNorm && record.tituloNorm.includes(proveedorNorm)) {
    score += 20;
    reasons.push("proveedor");
  }

  if (rubroNorm && normalizeText(record.rubro || "").includes(rubroNorm)) {
    score += 10;
    reasons.push("rubro");
  }

  const precioArticulo =
    articulo.precioMayorista == null ? null : Math.round(Number(articulo.precioMayorista));
  if (precioArticulo != null && record.precioMayorista != null && precioArticulo === record.precioMayorista) {
    score += 35;
    reasons.push("precio");
  }

  return { score, reasons };
}

function pickBestRecord(articulo, records) {
  const scored = records
    .map((record) => ({ record, ...scoreCandidate(articulo, record) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  const best = scored[0];
  const second = scored[1];

  if (best.score >= 120) {
    return best;
  }

  if (best.score >= 100 && (!second || best.score - second.score >= 25)) {
    return best;
  }

  if (best.score >= 80 && best.reasons.includes("descripcion") && best.reasons.includes("precio")) {
    return best;
  }

  return null;
}

async function syncArticuloImagenes(articuloId, imageUrls) {
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
  const apply = args.apply === true;
  const deleteUnmatched = args["delete-unmatched"] === true;

  if (!inputPath) {
    throw new Error(
      "Uso: node ./scripts/actualizar-imagenes-desde-scrape.mjs --input /ruta/scrape.txt [--apply] [--delete-unmatched]",
    );
  }

  if (apply && deleteUnmatched) {
    throw new Error("No se puede usar --apply y --delete-unmatched al mismo tiempo.");
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const records = parseScrapeFile(absolutePath);

  const articulos = await prisma.articulo.findMany({
    include: {
      rubro: true,
      imagenes: {
        orderBy: { orden: "asc" },
      },
    },
    where: {
      visible: "S",
    },
  });

  const matched = [];
  const unmatched = [];

  for (const articulo of articulos) {
    const best = pickBestRecord(articulo, records);
    if (!best) {
      unmatched.push({
        id: articulo.id,
        articuloCod: articulo.articuloCod,
        articuloDes: articulo.articuloDes,
        precioMayorista: articulo.precioMayorista,
      });
      continue;
    }

    matched.push({
      articulo,
      record: best.record,
      score: best.score,
      reasons: best.reasons,
    });
  }

  matched.sort((a, b) => b.score - a.score);

  if (apply) {
    for (const item of matched) {
      await syncArticuloImagenes(item.articulo.id, item.record.imageUrls);
    }
  }

  if (deleteUnmatched) {
    const unmatchedIds = unmatched
      .map((item) => item.id)
      .filter((id) => typeof id === "number");

    if (unmatchedIds.length > 0) {
      await prisma.articuloImagen.deleteMany({
        where: {
          articuloId: {
            in: unmatchedIds,
          },
        },
      });

      await prisma.articulo.deleteMany({
        where: {
          id: {
            in: unmatchedIds,
          },
        },
      });
    }
  }

  const report = {
    apply,
    deleteUnmatched,
    scrapeRows: records.length,
    articulosEvaluados: articulos.length,
    articulosConMatch: matched.length,
    articulosSinMatch: unmatched.length,
    ejemplosMatch: matched.slice(0, 20).map((item) => ({
      articulo_cod: item.articulo.articuloCod,
      articulo_des: item.articulo.articuloDes,
      scraped_code: item.record.scrapedCode,
      titulo_scrape: item.record.titulo,
      imagenes: item.record.imageUrls,
      score: item.score,
      reasons: item.reasons,
    })),
    ejemplosSinMatch: unmatched.slice(0, 20),
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma-client/index.js";
import { loadProjectEnv } from "./lib/load-env.mjs";
import {
  parseArgs,
  parseHtmlTableRowsFromFile,
  slugifyRubroCode,
  toInteger,
  normalizeString,
} from "./lib/parse-xls-html.mjs";

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

function parseExcelMoneyToNumber(value) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = String(value).replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.abs(parsed) < 1000 ? parsed * 1000 : parsed;
}

function parseScrapePrice(value) {
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

    const [titulo, imagen1, href, rubro, scrapedCode, precio, imagen2 = ""] = cols;
    const imageUrls = [imagen1, imagen2].map(normalizeNullableString).filter(Boolean);

    if (!titulo || imageUrls.length === 0) {
      continue;
    }

    records.push({
      titulo: titulo.trim(),
      tituloNorm: normalizeText(titulo),
      href: normalizeNullableString(href),
      rubro: normalizeNullableString(rubro),
      rubroNorm: normalizeText(rubro),
      scrapedCode: normalizeNullableString(scrapedCode),
      scrapedCodeNorm: normalizeText(scrapedCode),
      precioMayorista: parseScrapePrice(precio),
      imageUrls: [...new Set(imageUrls)],
    });
  }

  return records;
}

function parseExcelProducts(filePath) {
  const rows = parseHtmlTableRowsFromFile(filePath);
  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell != null));

  return dataRows
    .map((row, index) => {
      const record = Object.fromEntries(headers.map((header, idx) => [header, row[idx] ?? null]));
      const codigo = normalizeString(record.CODIGO);
      const detalle = normalizeString(record.DETALLE);

      if (!codigo || !detalle) {
        return null;
      }

      const rubroNombre = normalizeString(record.Rubro) || "Sin rubro";
      return {
        articuloOrigenId: index + 1,
        codigo,
        codigoNorm: normalizeText(codigo),
        detalle,
        detalleNorm: normalizeText(detalle),
        precioMayorista: parseExcelMoneyToNumber(record["Precio #1"]),
        precioMinorista: null,
        proveedor: normalizeString(record.Proveedor),
        proveedorNorm: normalizeText(record.Proveedor),
        stockWeb: toInteger(record["Stock Deposito 1"]),
        rubroNombre,
        rubroCodigo: slugifyRubroCode(rubroNombre),
        rubroNorm: normalizeText(rubroNombre),
      };
    })
    .filter(Boolean);
}

function scoreCandidate(producto, record) {
  let score = 0;
  const reasons = [];

  if (producto.codigoNorm === record.scrapedCodeNorm) {
    score += 140;
    reasons.push("codigo");
  }

  if (record.tituloNorm.includes(producto.codigoNorm)) {
    score += 90;
    reasons.push("codigo-en-titulo");
  }

  if (record.tituloNorm.includes(producto.detalleNorm)) {
    score += 80;
    reasons.push("detalle");
  } else {
    const tokens = producto.detalleNorm.split(" ").filter((token) => token.length >= 4);
    const matchedTokens = tokens.filter((token) => record.tituloNorm.includes(token));
    if (matchedTokens.length >= 3) {
      score += 45;
      reasons.push("tokens-detalle");
    }
  }

  if (producto.proveedorNorm && record.tituloNorm.includes(producto.proveedorNorm)) {
    score += 20;
    reasons.push("proveedor");
  }

  if (producto.rubroNorm && record.rubroNorm.includes(producto.rubroNorm)) {
    score += 10;
    reasons.push("rubro");
  }

  const roundedMayorista = producto.precioMayorista == null ? null : Math.round(producto.precioMayorista);
  const roundedScrape = record.precioMayorista == null ? null : Math.round(record.precioMayorista);
  if (roundedMayorista != null && roundedScrape != null && roundedMayorista === roundedScrape) {
    score += 35;
    reasons.push("precio");
  }

  return { score, reasons };
}

function pickBestScrapeRecord(producto, records) {
  const scored = records
    .map((record) => ({ record, ...scoreCandidate(producto, record) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  const best = scored[0];
  const second = scored[1];

  if (best.score >= 140) {
    return best;
  }

  if (best.score >= 110 && (!second || best.score - second.score >= 25)) {
    return best;
  }

  if (best.score >= 90 && best.reasons.includes("detalle") && best.reasons.includes("precio")) {
    return best;
  }

  return null;
}

function deterministicStock(codigo) {
  const chars = [...codigo];
  const seed = chars.reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 20 + (seed % 61);
}

function buildProveedorFallback(producto) {
  const base = producto.rubroNombre || "General";
  return `Distribuidora ${base}`.slice(0, 20);
}

function buildTextoWeb(detalle) {
  const normalized = normalizeNullableString(detalle) || "Producto destacado";
  const cleaned = normalized.replace(/\s+/g, " ").trim();
  const sentence = `Ideal para ${cleaned.toLowerCase()}`;
  return sentence.slice(0, 30);
}

async function ensureRubro(producto) {
  const existing = await prisma.rubro.findFirst({
    where: { codigo: producto.rubroCodigo },
  });

  if (existing) {
    if (existing.nombre !== producto.rubroNombre || existing.activo !== true) {
      await prisma.rubro.update({
        where: { id: existing.id },
        data: {
          nombre: producto.rubroNombre,
          activo: true,
        },
      });
    }

    return existing.id;
  }

  const created = await prisma.rubro.create({
    data: {
      codigo: producto.rubroCodigo,
      nombre: producto.rubroNombre,
      activo: true,
    },
  });

  return created.id;
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
    data: {
      articuloImagenId: principal?.id ?? null,
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const excelPath = args.productos;
  const scrapePath = args.scrape;
  const apply = args.apply === true;

  if (!excelPath || !scrapePath) {
    throw new Error(
      "Uso: node ./scripts/importar-articulos-excel-scrape.mjs --productos /ruta/productos.xls --scrape /ruta/scrape.txt [--apply]",
    );
  }

  const excelProducts = parseExcelProducts(path.resolve(process.cwd(), excelPath));
  const scrapeRecords = parseScrapeFile(path.resolve(process.cwd(), scrapePath));

  const matched = [];
  const unmatched = [];

  for (const producto of excelProducts) {
    const best = pickBestScrapeRecord(producto, scrapeRecords);
    if (!best) {
      unmatched.push({
        codigo: producto.codigo,
        detalle: producto.detalle,
        precioMayorista: producto.precioMayorista,
      });
      continue;
    }

    matched.push({
      producto,
      scrape: best.record,
      score: best.score,
      reasons: best.reasons,
    });
  }

  matched.sort((a, b) => b.score - a.score);

  let rubrosCreadosOActualizados = 0;
  let articulosCreados = 0;
  let articulosActualizados = 0;
  let imagenesSincronizadas = 0;

  if (apply) {
    for (const item of matched) {
      const rubroId = await ensureRubro(item.producto);
      rubrosCreadosOActualizados += 1;

      const precioMayorista = item.producto.precioMayorista ?? item.scrape.precioMayorista ?? 0;
      const precioMinorista = Number((precioMayorista * 1.2).toFixed(2));
      const stockWeb =
        item.producto.stockWeb != null && item.producto.stockWeb > 0
          ? item.producto.stockWeb
          : deterministicStock(item.producto.codigo);
      const proveedorDes = (item.producto.proveedor || buildProveedorFallback(item.producto)).slice(0, 20);
      const articuloTextoWeb = buildTextoWeb(item.producto.detalle);

      const data = {
        articuloOrigenId: item.producto.articuloOrigenId,
        articuloCod: item.producto.codigo,
        articuloDes: item.producto.detalle.slice(0, 30),
        articuloTextoWeb,
        precioMayorista,
        precioMinorista,
        rubroId,
        proveedorDes,
        stockWeb,
        destacado: "N",
        visible: "S",
      };

      const existing = await prisma.articulo.findUnique({
        where: { articuloCod: item.producto.codigo },
      });

      let articulo;
      if (existing) {
        articulo = await prisma.articulo.update({
          where: { id: existing.id },
          data,
        });
        articulosActualizados += 1;
      } else {
        articulo = await prisma.articulo.create({
          data,
        });
        articulosCreados += 1;
      }

      await syncArticuloImagenes(articulo.id, item.scrape.imageUrls);
      imagenesSincronizadas += item.scrape.imageUrls.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        apply,
        productosExcel: excelProducts.length,
        scrapeRows: scrapeRecords.length,
        articulosCompletosConImagen: matched.length,
        articulosSinMatchOSinImagen: unmatched.length,
        articulosCreados,
        articulosActualizados,
        imagenesSincronizadas,
        ejemplosImportables: matched.slice(0, 20).map((item) => ({
          codigo: item.producto.codigo,
          detalle: item.producto.detalle,
          scraped_code: item.scrape.scrapedCode,
          titulo_scrape: item.scrape.titulo,
          precio_mayorista: item.producto.precioMayorista,
          precio_minorista: item.producto.precioMayorista != null
            ? Number((item.producto.precioMayorista * 1.2).toFixed(2))
            : null,
          proveedor: item.producto.proveedor || buildProveedorFallback(item.producto),
          stock_web:
            item.producto.stockWeb != null && item.producto.stockWeb > 0
              ? item.producto.stockWeb
              : deterministicStock(item.producto.codigo),
          imagenes: item.scrape.imageUrls,
          score: item.score,
          reasons: item.reasons,
        })),
        ejemplosDescartados: unmatched.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

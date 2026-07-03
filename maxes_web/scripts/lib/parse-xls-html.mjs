import fs from "node:fs";

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ");
}

function cleanupCell(value) {
  const normalized = normalizeWhitespace(decodeHtml(stripTags(value)));
  if (normalized === "_" || normalized === "") {
    return null;
  }
  return normalized;
}

export function parseHtmlTableRowsFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const tables = [...fileContent.matchAll(/<table\b[\s\S]*?<\/table>/gi)];
  if (tables.length < 2) {
    throw new Error(`No se encontró la tabla de datos esperada en ${filePath}.`);
  }

  const dataTable = tables[1][0];
  const rowMatches = [...dataTable.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)];
  return rowMatches.map((rowMatch) => {
    const rowHtml = rowMatch[0];
    const cellMatches = [...rowHtml.matchAll(/<t[hd]\b[\s\S]*?>([\s\S]*?)<\/t[hd]>/gi)];
    return cellMatches.map((cellMatch) => cleanupCell(cellMatch[1]));
  });
}

export function toDecimal(value) {
  if (value == null) return null;
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const scaled = Math.abs(parsed) < 1000 ? parsed * 1000 : parsed;
  return scaled.toFixed(2);
}

export function toInteger(value) {
  if (value == null) return null;
  const digits = value.replace(/[^\d-]/g, "");
  if (digits === "") return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeString(value) {
  return value == null ? null : value.trim();
}

export function slugifyRubroCode(value) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 20) || "SIN-RUBRO"
  );
}

export function buildProductosPayload(rows) {
  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell != null));
  const rubroMap = new Map();
  const articulos = [];

  for (const row of dataRows) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]));
    const rubroNombre = normalizeString(record.Rubro) || "Sin rubro";
    const rubroCodigo = slugifyRubroCode(rubroNombre);

    if (!rubroMap.has(rubroCodigo)) {
      rubroMap.set(rubroCodigo, {
        codigo: rubroCodigo,
        nombre: rubroNombre,
        activo: true,
      });
    }

    articulos.push({
      articulo_id_origen: articulos.length + 1,
      codigo: normalizeString(record.CODIGO),
      descripcion_publica: normalizeString(record.DETALLE),
      precio_mayorista: toDecimal(record["Precio #1"]),
      precio_minorista: toDecimal(record["Precio #2"]),
      rubro_codigo: rubroCodigo,
      proveedor_des: normalizeString(record.Proveedor),
      stock_web: toInteger(record["Stock Deposito 1"]),
      imagen_url: null,
      destacado: false,
      metadata_origen: {
        qxb: normalizeString(record.QxB),
        costo: toDecimal(record.Costo),
        precio_2: toDecimal(record["Precio #2"]),
        precio_3: toDecimal(record["Precio #3"]),
        precio_4: toDecimal(record["Precio #4"]),
        precio_5: toDecimal(record["Precio #5"]),
        stock_deposito_1: toInteger(record["Stock Deposito 1"]),
        despacho: normalizeString(record.Despacho),
        punto_pedido: toInteger(record["Pto Pedido"]),
        proveedor: normalizeString(record.Proveedor),
        rubro_original: normalizeString(record.Rubro),
      },
    });
  }

  return {
    headers,
    rubros: [...rubroMap.values()],
    articulos,
  };
}

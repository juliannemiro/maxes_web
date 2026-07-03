import path from "node:path";
import fs from "node:fs";
import {
  buildProductosPayload,
  normalizeString,
  parseArgs,
  parseHtmlTableRowsFromFile,
  toDecimal,
  toInteger,
} from "./lib/parse-xls-html.mjs";

function normalizeCuit(value) {
  if (value == null) return null;
  const digits = value.replace(/\D/g, "");
  return digits === "" || /^0+$/.test(digits) ? null : digits;
}

function buildClientesPayload(rows) {
  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell != null));
  const clientes = dataRows.map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]));
    return {
      codigo_origen: normalizeString(record.CODIGO),
      nombre: normalizeString(record.DETALLE),
      domicilio: normalizeString(record.Domicilio),
      localidad: normalizeString(record.Localidad),
      provincia: normalizeString(record.Provincia),
      codigo_postal: normalizeString(record["Cod. Postal"]),
      cuit: normalizeCuit(record["C.U.I.T. No"]),
      contacto: normalizeString(record.Contacto),
      telefono: normalizeString(record["No. Telefono"]),
      credito: toDecimal(record.Credito),
      dias_plazo: toInteger(record["Dias Plazo"]),
      email: normalizeString(record.email),
      transporte: normalizeString(record.Transporte),
      condicion_fiscal: normalizeString(record.Condicion),
      vendedor: normalizeString(record.Vendedor),
      moneda: normalizeString(record.Moneda),
    };
  });

  return {
    headers,
    clientes,
    compatible_con_esquema_actual: false,
    motivo: "El esquema Prisma actual no tiene tabla cliente/cliente_web; solo persiste datos del comprador dentro de pedido.",
  };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const clientesPath = args.clientes;
  const productosPath = args.productos;

  if (!clientesPath || !productosPath) {
    throw new Error("Uso: node ./scripts/generar-precarga-inicial.mjs --clientes /ruta/clientes.xls --productos /ruta/productos.xls");
  }

  const outputDir = path.resolve(cwd, "prisma", "seed-data");
  fs.mkdirSync(outputDir, { recursive: true });

  const clientesRows = parseHtmlTableRowsFromFile(clientesPath);
  const productosRows = parseHtmlTableRowsFromFile(productosPath);

  const productosPayload = buildProductosPayload(productosRows);
  const clientesPayload = buildClientesPayload(clientesRows);

  const catalogoSyncPayload = {
    rubros: productosPayload.rubros,
    articulos: productosPayload.articulos.map(({ metadata_origen, ...articulo }) => articulo),
  };

  const resumen = {
    generado_en: new Date().toISOString(),
    origen: {
      clientes: clientesPath,
      productos: productosPath,
    },
    productos: {
      filas: productosPayload.articulos.length,
      rubros_unicos: productosPayload.rubros.length,
      columnas_origen: productosPayload.headers,
      mapeo_principal: {
        CODIGO: "articulo.codigo",
        DETALLE: "articulo.descripcion_publica",
        "Precio #1": "articulo.precio_mayorista",
        "Precio #2": "articulo.precio_minorista",
        Rubro: "rubro.nombre + articulo.rubro_id (via rubro.codigo)",
      },
      columnas_sin_destino_directo: [
        "QxB",
        "Costo",
        "Precio #3",
        "Precio #4",
        "Precio #5",
        "Stock Deposito 1",
        "Despacho",
        "Pto Pedido",
        "Proveedor",
      ],
    },
    clientes: {
      filas: clientesPayload.clientes.length,
      columnas_origen: clientesPayload.headers,
      compatible_con_esquema_actual: false,
      destino_actual_mas_cercano: "pedido.cliente_nombre / pedido.doc_tipo / pedido.doc_numero / pedido.cuit",
      columnas_sin_destino_directo: clientesPayload.headers,
    },
  };

  writeJson(path.join(outputDir, "rubros.json"), productosPayload.rubros);
  writeJson(path.join(outputDir, "articulos.json"), productosPayload.articulos);
  writeJson(path.join(outputDir, "catalogo-sync.json"), catalogoSyncPayload);
  writeJson(path.join(outputDir, "clientes-sin-tabla.json"), clientesPayload);
  writeJson(path.join(outputDir, "resumen-precarga.json"), resumen);

  console.log(`Archivos generados en ${outputDir}`);
  console.log(`Rubros: ${productosPayload.rubros.length}`);
  console.log(`Articulos: ${productosPayload.articulos.length}`);
  console.log(`Clientes sin tabla destino: ${clientesPayload.clientes.length}`);
}

main();

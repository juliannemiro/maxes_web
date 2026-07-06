import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const raizProyecto = __dirname;
const entorno = process.env.APP_ENV || (process.env.NODE_ENV === "production" ? "produccion" : "desarrollo");
const estaEnVercel = process.env.VERCEL === "1";
const archivosEntorno = [
  { archivo: path.join(raizProyecto, ".env"), sobrescribir: false },
  {
    archivo: path.join(raizProyecto, entorno === "produccion" ? ".env.produccion" : ".env.desarrollo"),
    sobrescribir: !estaEnVercel,
  },
];

for (const { archivo, sobrescribir } of archivosEntorno) {
  if (!fs.existsSync(archivo)) continue;

  const contenido = fs.readFileSync(archivo, "utf8");
  for (const linea of contenido.split(/\r?\n/)) {
    const lineaLimpia = linea.trim();
    if (!lineaLimpia || lineaLimpia.startsWith("#")) continue;

    const separador = lineaLimpia.indexOf("=");
    if (separador === -1) continue;

    const clave = lineaLimpia.slice(0, separador).trim();
    const valorCrudo = lineaLimpia.slice(separador + 1).trim();
    const valor = valorCrudo.replace(/^["']|["']$/g, "");

    if (sobrescribir || process.env[clave] === undefined) {
      process.env[clave] = valor;
    }
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.50.2.2"],
  turbopack: {
    root: raizProyecto,
  },
};

export default nextConfig;

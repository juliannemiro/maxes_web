import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..", "..");

export function loadProjectEnv() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const entorno = process.env.APP_ENV || (nodeEnv === "production" ? "produccion" : "desarrollo");

  dotenv.config({ path: path.resolve(rootDir, ".env"), override: false });

  const archivoEntorno =
    entorno === "produccion"
      ? path.resolve(rootDir, ".env.produccion")
      : path.resolve(rootDir, ".env.desarrollo");

  dotenv.config({ path: archivoEntorno, override: true });

  if (process.env.APP_ENV === "local") {
    dotenv.config({ path: path.resolve(rootDir, ".env.desarrollo"), override: true });
  }
}

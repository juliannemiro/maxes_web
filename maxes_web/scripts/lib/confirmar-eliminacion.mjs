import { createInterface } from "node:readline/promises";
import process from "node:process";

export async function confirmarEliminacion({ cantidad, descripcion, args }) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return;

  const frase = `ELIMINAR ${cantidad} REGISTROS`;
  const confirmacionPorArgumento = args["confirmar-eliminacion"];

  if (process.stdin.isTTY && process.stdout.isTTY && confirmacionPorArgumento !== frase) {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const respuesta = await terminal.question(
        `ATENCIÓN: se eliminarán ${cantidad} ${descripcion}. Escribí exactamente "${frase}" para autorizar: `
      );
      if (respuesta.trim() === frase) return;
    } finally {
      terminal.close();
    }
  }

  if (confirmacionPorArgumento === frase) return;

  throw new Error(
    `Eliminación cancelada. Para autorizar ${cantidad} ${descripcion}, use --confirmar-eliminacion "${frase}".`
  );
}

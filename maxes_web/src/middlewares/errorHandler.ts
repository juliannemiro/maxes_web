import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

/**
 * Manejo centralizado de errores.
 * Mantiene el formato de respuesta histórico del backend: `{ error: mensaje }`.
 */
export const errorHandler = (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("Error no controlado:", err);
  const message = err instanceof Error ? err.message : "Error interno del servidor";
  return res.status(500).json({ error: message });
};

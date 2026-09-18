/**
 * Error de aplicación con código HTTP.
 * Permite lanzar errores de negocio/validación desde los servicios y
 * traducirlos a una respuesta consistente en el middleware de errores.
 */
export class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Utilidades de normalización y validación de texto. */

/** Devuelve el texto recortado, o `null` si no es string o queda vacío. */
export function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Valida la longitud máxima y devuelve el mensaje de error, o `null`. */
export function validateMaxLength(value: string | null, maxLength: number, label: string): string | null {
  if (value && value.length > maxLength) {
    return `${label} supera el máximo de ${maxLength} caracteres.`;
  }

  return null;
}

/** Normaliza un WhatsApp permitiendo sólo números, `+` y `-`. */
export function normalizeWhatsapp(value: unknown): string | null {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  if (!/^[0-9+-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

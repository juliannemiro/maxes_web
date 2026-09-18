/** DTOs de la sincronización de catálogo (los envía el sistema interno). */

/** Rubro recibido en el sync. */
export interface RubroSyncInput {
  id?: number;
  codigo: string;
  nombre?: string | null;
  activo?: boolean;
  [key: string]: unknown;
}

/** Artículo recibido en el sync. Admite los alias de la web anterior. */
export interface ArticuloSyncInput {
  codigo?: string;
  articulo_cod?: string;
  articulo_des?: string;
  descripcion_publica?: string;
  articulo_descripcion?: string;
  articulo_texto_web?: string;
  descripcion_detallada?: string;
  articulo_id_origen?: number;
  precio_mayorista?: number;
  precio_minorista?: number;
  proveedor_des?: string;
  proveedor?: string;
  stock_web?: number;
  destacado?: unknown;
  visible?: unknown;
  imagenes?: unknown;
  imagen_url?: string;
  [key: string]: unknown;
}

/** Cuerpo del sync completo de catálogo. */
export interface SyncCatalogPayload {
  rubros?: RubroSyncInput[];
  articulos?: ArticuloSyncInput[];
}

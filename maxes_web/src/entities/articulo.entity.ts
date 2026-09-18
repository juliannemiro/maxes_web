import type { Articulo, ArticuloImagen, Rubro } from "@prisma/client";

/** Artículo publicado en la web (tabla `articulo_web`). */
export type ArticuloEntity = Articulo;

/** Artículo con las relaciones que expone la API pública. */
export type ArticuloConRelaciones = Articulo & {
  rubro: Rubro | null;
  imagenes: ArticuloImagen[];
  imagenPrincipal: ArticuloImagen | null;
};

/** Representación pública de un artículo (la que consume maxes_web_cli). */
export interface ArticuloPublico {
  id: number;
  articulo_id_origen: number;
  codigo: string;
  articulo_des: string | null;
  proveedor_des: string | null;
  descripcion_publica: string | null;
  descripcion_detallada: string | null;
  precio_mayorista: unknown;
  precio_minorista: unknown;
  rubro_id: number | null;
  imagen_url: string | null;
  destacado: boolean;
  visible: boolean;
  fecha_publicacion: Date;
  rubro: Rubro | null;
  imagenes: ArticuloImagen[];
}

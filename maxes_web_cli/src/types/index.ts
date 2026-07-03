export interface Rubro {
  id: number;
  codigo: string;
  nombre: string | null;
  activo: boolean;
}

export interface ImagenArticulo {
  id: number;
  articulo_id: number;
  imagen_url: string;
  orden: number;
}

export interface Articulo {
  id: number;
  articulo_id_origen: number;
  codigo: string | null;
  articulo_des?: string | null;
  proveedor_des?: string | null;
  descripcion_publica: string | null;
  descripcion_detallada?: string | null;
  precio_mayorista?: number | string | null;
  precio_minorista?: number | string | null;
  rubro_id: number | null;
  imagen_url: string | null;
  destacado: boolean;
  fecha_publicacion: string;
  rubro?: Rubro | null;
  imagenes?: ImagenArticulo[];
}

export interface CarruselHome {
  id: number;
  titulo: string | null;
  link_destino: string | null;
  imagen_url: string;
  activo: boolean;
  orden: number;
}

export interface Configuracion {
  id: number;
  whatsapp_contacto: string;
  direccion_local: string;
  email_notificaciones: string | null;
  mantenimiento: boolean;
}

export interface PedidoDetalle {
  id?: number;
  pedido_id?: number;
  articulo_id: number | null;
  cantidad: number;
  precio_unitario: number;
  comentario_cliente?: string | null;
  articulo?: Articulo;
}

export interface Pedido {
  id?: number;
  fecha?: string;
  cliente_nro?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  cliente_nombre?: string;
  doc_tipo?: string | null;
  doc_numero?: string | null;
  cuit?: string | null;
  email_pedido?: string | null;
  celular_pedido?: string | null;
  cant_productos?: number | null;
  cant_unidades?: number | null;
  tipo_compra?: string | null;
  monto_total?: number | null;
  total?: number;
  tipo_despacho?: string | null;
  localidad?: string | null;
  observaciones?: string | null;
  estado?: string;
  detalles?: PedidoDetalle[];
  items?: PedidoDetalle[];
}

import type { Pedido } from "@prisma/client";
import type { PedidoDetalleEntity } from "./pedidoDetalle.entity";

/** Pedido web (tabla `pedido_web`). */
export type PedidoEntity = Pedido;

/** Pedido con sus líneas. */
export type PedidoConDetalles = PedidoEntity & { detalles: PedidoDetalleEntity[] };

/** Pedido tal como se expone a los consumidores (cliente e integración). */
export interface PedidoPublico {
  [key: string]: unknown;
  cliente_nombre: string;
  total: unknown;
}

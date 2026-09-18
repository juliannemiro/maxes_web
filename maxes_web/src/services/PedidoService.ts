import prisma from "../config/prisma";
import { AppError } from "../utils/appError";
import type { PedidoConDetalles, PedidoPublico } from "../entities";

/**
 * Pedidos de la web (`pedido_web` / `pedido_detalle_web`).
 * Lo consume la integración interna para descargar y confirmar pedidos.
 */
export class PedidoService {
  /** Devuelve los pedidos en estado `nuevo` con sus líneas. */
  async getPendingOrders() {
    const orders = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        "id",
        "fecha",
        "cliente_nro",
        "nombre",
        "apellido",
        "doc_tipo",
        "doc_numero",
        "cuit",
        "email_pedido",
        "celular_pedido",
        "cant_productos",
        "cant_unidades",
        "tipo_precio",
        "monto_total",
        "tipo_despacho",
        "localidad",
        "observaciones",
        "estado"
      FROM "pedido_web"
      WHERE COALESCE("estado", 'nuevo') = 'nuevo'
      ORDER BY "fecha" ASC NULLS LAST, "id" ASC
    `);

    const orderIds = orders.map((order) => Number(order.id)).filter(Boolean);
    const detalles = orderIds.length
      ? await prisma.pedidoDetalle.findMany({
          where: { pedido_id: { in: orderIds } },
          include: { articulo: true },
        })
      : [];

    const detallesPorPedido = new Map<number, typeof detalles>();
    for (const detalle of detalles) {
      const current = detallesPorPedido.get(detalle.pedido_id) || [];
      current.push(detalle);
      detallesPorPedido.set(detalle.pedido_id, current);
    }

    return {
      success: true,
      count: orders.length,
      orders: orders.map((order) =>
        this.serializeOrder({
          ...order,
          detalles: detallesPorPedido.get(Number(order.id)) || [],
        })
      ),
    };
  }

  /** Marca en bloque los pedidos como `importado`. */
  async confirmImport(ids: unknown) {
    if (!Array.isArray(ids)) {
      throw new AppError(400, "ids must be an array");
    }

    const sanitizedIds = ids.map((id) => Number(id)).filter(Number.isInteger);
    const count = sanitizedIds.length
      ? await prisma.$executeRawUnsafe(
          `UPDATE "pedido_web" SET "estado" = 'importado' WHERE "id" = ANY($1::int[])`,
          sanitizedIds
        )
      : 0;

    return {
      success: true,
      message: "Orders updated to 'importado' successfully",
      count,
    };
  }

  /** Actualiza el estado de un pedido puntual. */
  async updateStatus(id: string, estado: unknown) {
    if (!estado) {
      throw new AppError(400, "estado is required");
    }

    const updatedOrders = await prisma.$queryRawUnsafe<any[]>(
      `
        UPDATE "pedido_web"
        SET "estado" = $2
        WHERE "id" = $1
        RETURNING
          "id",
          "fecha",
          "cliente_nro",
          "nombre",
          "apellido",
          "doc_tipo",
          "doc_numero",
          "cuit",
          "email_pedido",
          "celular_pedido",
          "cant_productos",
          "cant_unidades",
          "tipo_precio",
          "monto_total",
          "tipo_despacho",
          "localidad",
          "observaciones",
          "estado"
      `,
      parseInt(id),
      estado
    );
    const updatedOrder = updatedOrders[0];

    if (!updatedOrder) {
      throw new AppError(404, "order not found");
    }

    return { success: true, order: this.serializeOrder(updatedOrder) };
  }

  /** Agrega nombre completo y alias `total` para el consumidor. */
  private serializeOrder(order: any): PedidoPublico {
    return {
      ...order,
      cliente_nombre: [order.nombre, order.apellido].filter(Boolean).join(" ").trim(),
      total: order.monto_total,
    };
  }
}

/** Tipos exportados para consumo externo si hiciera falta. */
export type { PedidoConDetalles };

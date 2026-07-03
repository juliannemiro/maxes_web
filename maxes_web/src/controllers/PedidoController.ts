import { Request, Response } from "express";
import prisma from "../config/prisma";

export class PedidoController {
  private static serializeOrder(order: any) {
    return {
      ...order,
      cliente_nombre: [order.nombre, order.apellido].filter(Boolean).join(" ").trim(),
      total: order.monto_total,
    };
  }

  // Get all orders that have 'nuevo' status
  static async getPendingOrders(req: Request, res: Response) {
    try {
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
          "tipo_compra",
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
            where: {
              pedido_id: { in: orderIds },
            },
            include: {
              articulo: true,
            },
          })
        : [];

      const detallesPorPedido = new Map<number, typeof detalles>();
      for (const detalle of detalles) {
        const current = detallesPorPedido.get(detalle.pedido_id) || [];
        current.push(detalle);
        detallesPorPedido.set(detalle.pedido_id, current);
      }

      return res.json({
        success: true,
        count: orders.length,
        orders: orders.map((order) =>
          PedidoController.serializeOrder({
            ...order,
            detalles: detallesPorPedido.get(Number(order.id)) || [],
          })
        ),
      });
    } catch (error: any) {
      console.error("Error in getPendingOrders:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Bulk confirm imports
  static async confirmImport(req: Request, res: Response) {
    try {
      const { ids } = req.body; // Expects an array of order IDs

      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "ids must be an array" });
      }

      const sanitizedIds = ids.map((id) => Number(id)).filter(Number.isInteger);
      const updateResult = sanitizedIds.length
        ? await prisma.$executeRawUnsafe(
            `UPDATE "pedido_web" SET "estado" = 'importado' WHERE "id" = ANY($1::int[])`,
            sanitizedIds
          )
        : 0;

      return res.json({
        success: true,
        message: "Orders updated to 'importado' successfully",
        count: updateResult,
      });
    } catch (error: any) {
      console.error("Error in confirmImport:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Update specific order status
  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado) {
        return res.status(400).json({ error: "estado is required" });
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
            "tipo_compra",
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
        return res.status(404).json({ error: "order not found" });
      }

      return res.json({ success: true, order: PedidoController.serializeOrder(updatedOrder) });
    } catch (error: any) {
      console.error("Error in updateStatus:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

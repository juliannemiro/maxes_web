import { NextFunction, Request, Response } from "express";
import { PedidoService } from "../services/PedidoService";

const service = new PedidoService();

/** Endpoints de pedidos para la integración interna. */
export class PedidoController {
  /** Pedidos pendientes con sus líneas. */
  static async getPendingOrders(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getPendingOrders());
    } catch (error) {
      next(error);
    }
  }

  /** Confirma la importación de pedidos por id. */
  static async confirmImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      res.json(await service.confirmImport(ids));
    } catch (error) {
      next(error);
    }
  }

  /** Actualiza el estado de un pedido. */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      res.json(await service.updateStatus(id, estado));
    } catch (error) {
      next(error);
    }
  }
}

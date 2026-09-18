import { NextFunction, Request, Response } from "express";
import { PublicoService } from "../services/PublicoService";

const service = new PublicoService();

/** Endpoints públicos que consume el cliente de la web. */
export class PublicoController {
  /** Rubros activos. */
  static async getRubros(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getRubros());
    } catch (error) {
      next(error);
    }
  }

  /** Artículos con filtros y paginación. */
  static async getArticulos(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getArticulos(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  /** Detalle de un artículo. */
  static async getArticuloById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      res.json(await service.getArticuloById(id));
    } catch (error) {
      next(error);
    }
  }

  /** Carrusel activo de la home. */
  static async getCarruseles(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getCarruseles());
    } catch (error) {
      next(error);
    }
  }

  /** Configuración de la web. */
  static async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getConfig());
    } catch (error) {
      next(error);
    }
  }

  /** Alta de pedido. */
  static async createPedido(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await service.createPedido(req.body));
    } catch (error) {
      next(error);
    }
  }
}

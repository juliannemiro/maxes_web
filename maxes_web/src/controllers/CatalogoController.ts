import { NextFunction, Request, Response } from "express";
import { CatalogoService } from "../services/CatalogoService";

const service = new CatalogoService();

/** Endpoints de sincronización de catálogo (los consume el sistema interno). */
export class CatalogoController {
  /** Sincroniza rubros. */
  static async syncRubros(req: Request, res: Response, next: NextFunction) {
    try {
      const { rubros } = req.body;
      res.json(await service.syncRubros(rubros));
    } catch (error) {
      next(error);
    }
  }

  /** Sincroniza artículos. */
  static async syncArticulos(req: Request, res: Response, next: NextFunction) {
    try {
      const { articulos } = req.body;
      res.json(await service.syncArticulos(articulos));
    } catch (error) {
      next(error);
    }
  }

  /** Sincroniza rubros + artículos en una sola llamada. */
  static async syncCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.syncCatalog(req.body));
    } catch (error) {
      next(error);
    }
  }
}

import { Router } from "express";
import { authKeytron } from "../middlewares/authKeytron";
import { CatalogoController } from "../controllers/CatalogoController";

const router = Router();

// Apply auth middleware to all catalog routes
router.use(authKeytron);

// Sync catalog: categorias, articles, prices and stocks
router.post("/sync", CatalogoController.syncCatalog);
router.post("/sync-categorias", CatalogoController.syncCategorias);
router.post("/sync-articulos", CatalogoController.syncArticulos);

export default router;

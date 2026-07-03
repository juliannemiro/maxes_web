import { Router } from "express";
import { PublicoController } from "../controllers/PublicoController";

const router = Router();

// Rubros
router.get("/rubros", PublicoController.getRubros);

// Articulos (Catalog)
router.get("/articulos", PublicoController.getArticulos);
router.get("/articulos/:id", PublicoController.getArticuloById);

// Home carousel / banners
router.get("/carruseles", PublicoController.getCarruseles);

// Web Configurations (address, whatsapp, etc.)
router.get("/config", PublicoController.getConfig);

// Submit Order from Frontend
router.post("/pedido", PublicoController.createPedido);

export default router;

import { Router } from "express";
import { authKeytron } from "../middlewares/authKeytron";
import { PedidoController } from "../controllers/PedidoController";

const router = Router();

router.use(authKeytron);

router.get("/pendientes", PedidoController.getPendingOrders);

router.post("/confirmar-importacion", PedidoController.confirmImport);

router.put("/:id/estado", PedidoController.updateStatus);

export default router;

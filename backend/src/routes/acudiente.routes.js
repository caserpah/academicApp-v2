import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import {
    ValidarCrearAcudiente,
    ValidarActualizarAcudiente,
    ValidarAsignarAcudiente
} from "../validators/acudiente.validator.js";
import { acudienteController } from "../controllers/acudiente.controller.js";

const router = Router();

router.get(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    acudienteController.list
);

router.get(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    acudienteController.get
);

router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarCrearAcudiente,
    acudienteController.create
);

router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarActualizarAcudiente,
    acudienteController.update
);

// Asignar acudiente a estudiante
router.post(
    "/asignar",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarAsignarAcudiente,
    acudienteController.asignar
);

export default router;
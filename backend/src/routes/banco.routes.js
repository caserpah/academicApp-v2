import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { bancoController } from "../controllers/banco.controller.js";

const router = express.Router();

router.get("/", protect, bancoController.listar);

export default router;
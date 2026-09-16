import { juicioService } from "../services/juicio.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const juicioController = {
    async list(req, res, next) {
        try {
            const data = await juicioService.list(req.query);
            return sendSuccess(res, data, "Listado de juicios obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await juicioService.get(id);
            return sendSuccess(res, data, "Información del juicio obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const data = await juicioService.create(req.body);
            return sendSuccess(res, data, "El juicio fue registrado exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await juicioService.update(id, req.body);
            return sendSuccess(res, data, "El juicio fue actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            await juicioService.remove(id);
            return sendSuccess(res, null, "El juicio fue eliminado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    // ========== Funciones para Importación Masiva ==========

    async descargarPlantilla(req, res, next) {
        try {
            const xlsxContent = await juicioService.generarPlantilla();

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Juicios.xlsx');

            return res.send(xlsxContent);
        } catch (error) {
            next(error);
        }
    },

    async importar(req, res, next) {
        try {
            if (!req.file) throw new Error("No se ha subido ningún archivo Excel.");

            const resultado = await juicioService.importarMasivo(req.file.buffer);

            if (!resultado.exito) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Se encontraron errores en el archivo. No se importaron datos.',
                    errors: resultado.errores
                });
            }

            return sendSuccess(res, null, `Se importaron ${resultado.total} juicios exitosamente.`);
        } catch (error) {
            next(error);
        }
    }
};
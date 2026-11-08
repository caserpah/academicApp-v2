import { promocionService } from "../services/promocion.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const promocionController = {

    async simularMasiva(req, res, next) {
        try {
            const { sedeId, gradoId, grupoId, vigenciaId: bodyVigenciaId } = req.body;
            const vigenciaId = bodyVigenciaId ? Number(bodyVigenciaId) : req.vigenciaActual.id;

            const resultado = await promocionService.simularPromocion({
                sedeId, gradoId, grupoId, vigenciaId
            });

            return sendSuccess(res, resultado, "Simulación generada exitosamente", 200);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Ejecuta el proceso de promoción anual para un grupo específico
     * Endpoint: POST /api/promocion/ejecutar
     * Body: { gradoId, grupoId, vigenciaDestinoId }
     */
    async ejecutarMasiva(req, res, next) {
        try {
            const { listaAprobada } = req.body;
            const usuarioId = req.user.id;

            const resultado = await promocionService.ejecutarPromocionMasiva(
                listaAprobada,
                usuarioId
            );

            return sendSuccess(res, { procesados: resultado.procesados }, resultado.mensaje, 201);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Endpoint: GET /api/promocion/verificar-matriculas
     * Valida si un grupo tiene matrículas activas antes de iniciar el cierre
     */
    async verificarActivos(req, res, next) {
        try {
            const { grupoId, vigenciaId } = req.query;

            if (!grupoId || !vigenciaId) {
                return res.status(400).json({ status: "error", message: "grupoId y vigenciaId son requeridos" });
            }

            const resultado = await promocionService.verificarMatriculasActivas({
                grupoId: Number(grupoId),
                vigenciaId: Number(vigenciaId)
            });

            return sendSuccess(res, resultado, "Verificación de activos exitosa", 200);
        } catch (error) {
            next(error);
        }
    }
};
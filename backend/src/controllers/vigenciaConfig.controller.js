import { vigenciaConfigService } from "../services/vigenciaConfig.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const vigenciaConfigController = {
    async copiarConfiguracion(req, res, next) {
        try {
            const { origenId, destinoId, areas, asignaturas, indicadores, juicios } = req.body;

            const resultado = await vigenciaConfigService.copiarConfiguracion({
                origenId: Number(origenId),
                destinoId: Number(destinoId),
                opciones: {
                    areas: !!areas,
                    asignaturas: !!asignaturas,
                    indicadores: !!indicadores,
                    juicios: !!juicios,
                },
            });

            sendSuccess(
                res,
                resultado,
                "La configuración académica fue copiada exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },
};